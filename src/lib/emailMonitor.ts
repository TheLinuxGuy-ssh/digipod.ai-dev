import { db } from './firebaseAdmin';
import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';
import { getGeminiReply, extractEmailTodos } from './gemini';
import { decrypt } from './imapSmtp';
import { sendPushToUser } from './pushNotifications';

export interface EmailSettings {
  id: string;
  userId: string;
  provider: 'gmail' | 'imap';
  email: string;
  gmailToken?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  username?: string;
  passwordEnc?: string;
  lastChecked?: Date;
  isActive: boolean;
  checkInterval: number; // minutes
}

export interface ClientEmailFilter {
  id: string;
  userId: string;
  emailAddress: string;
  projectId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ProcessedEmail {
  id: string;
  userId: string;
  projectId: string;
  gmailId?: string;
  imapUid?: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
  processedAt: Date;
  status: 'pending' | 'ai_processing' | 'draft_created' | 'error';
  errorMessage?: string;
}

export interface AIDraft {
  id: string;
  projectId: string;
  processedEmailId: string;
  subject: string;
  body: string;
  closing: string;
  signature: string;
  status: 'draft' | 'approved' | 'declined' | 'sent';
  createdAt: Date;
  approvedAt?: Date;
  declinedAt?: Date;
  sentAt?: Date;
}

class EmailMonitorService {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  async startMonitoring() {
    if (this.isRunning) {
      console.log('Email monitoring is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting email monitoring service...');

    // Run initial check
    await this.checkAllEmails();

    // Set up periodic checking (every 5 minutes)
    this.checkInterval = setInterval(async () => {
      await this.checkAllEmails();
    }, 5 * 60 * 1000);
  }

  async stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Email monitoring service stopped');
  }

  private async checkAllEmails() {
    try {
      console.log('Checking emails for all users...');
      
      // Get all active email settings
      const emailSettingsSnap = await db.collection('emailSettings')
        .where('isActive', '==', true)
        .get();

      for (const settingDoc of emailSettingsSnap.docs) {
        const settings = settingDoc.data() as EmailSettings;
        
        // Check if it's time to check this email account
        const lastChecked = settings.lastChecked instanceof Date ? settings.lastChecked : new Date(0);
        const checkIntervalMs = settings.checkInterval * 60 * 1000;
        const timeSinceLastCheck = Date.now() - lastChecked.getTime();
        
        if (timeSinceLastCheck < checkIntervalMs) {
          continue; // Skip if not enough time has passed
        }

        try {
          await this.checkUserEmails(settings);
          
          // Update last checked time
          await settingDoc.ref.update({
            lastChecked: new Date()
          });
        } catch (error) {
          console.error(`Error checking emails for user ${settings.userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in checkAllEmails:', error);
    }
  }

  private async checkUserEmails(settings: EmailSettings) {
    console.log(`Checking emails for ${settings.email} (${settings.provider})`);

    if (settings.provider === 'gmail') {
      await this.checkGmailEmails(settings);
    } else if (settings.provider === 'imap') {
      await this.checkImapEmails(settings);
    }
  }

  private async checkGmailEmails(settings: EmailSettings) {
    if (!settings.gmailToken) {
      throw new Error('No Gmail token available');
    }

    const tokens = JSON.parse(settings.gmailToken);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Automatically get all client emails from user's projects
    const projectsSnap = await db.collection('projects')
      .where('userId', '==', settings.userId)
      .get();

    const clientEmails = new Set<string>();
    const projectMap = new Map<string, { id: string; name: string }>();

    projectsSnap.docs.forEach(doc => {
      const project = doc.data();
      if (project.clientEmail) {
        clientEmails.add(project.clientEmail.toLowerCase());
        projectMap.set(project.clientEmail.toLowerCase(), {
          id: doc.id,
          name: project.name || 'Project'
        });
      }
    });

    console.log(`[emailMonitor] Monitoring ${clientEmails.size} client emails for user ${settings.userId}`);

    // Fetch recent emails (last 50)
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: 'is:unread' // Only check unread emails
    });

    const messages = res.data.messages || [];
    
    for (const msg of messages) {
      try {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full'
        });

        const headers = full.data.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        const bodyPart = full.data.payload?.parts?.find(p => p.mimeType === 'text/plain') || full.data.payload;
        const body = bodyPart && 'body' in bodyPart && bodyPart.body && 'data' in bodyPart.body
          ? Buffer.from(bodyPart.body.data || '', 'base64').toString('utf-8')
          : '';

        // Check if this email is from any of our monitored client emails
        const senderEmail = this.extractEmailFromString(from);
        const matchingProject = projectMap.get(senderEmail.toLowerCase());
        
        if (!matchingProject) {
          continue; // Skip emails not from monitored clients
        }

        // Check for duplicates
        const isDuplicate = await this.isEmailDuplicate(settings.userId, msg.id!);
        if (isDuplicate) {
          continue;
        }

        // Process the email
        await this.processEmail(settings.userId, {
          gmailId: msg.id!,
          from,
          subject,
          body,
          date: new Date(date),
          projectId: matchingProject.id
        });

      } catch (error) {
        console.error(`Error processing Gmail message ${msg.id}:`, error);
      }
    }
  }

  private async checkImapEmails(settings: EmailSettings) {
    if (!settings.imapHost || !settings.username || !settings.passwordEnc) {
      throw new Error('Missing IMAP credentials');
    }

    const password = decrypt(settings.passwordEnc);
    const client = new ImapFlow({
      host: settings.imapHost,
      port: settings.imapPort || 993,
      secure: settings.imapSecure !== false,
      auth: { user: settings.username, pass: password },
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      // Automatically get all client emails from user's projects
      const projectsSnap = await db.collection('projects')
        .where('userId', '==', settings.userId)
        .get();

      const clientEmails = new Set<string>();
      const projectMap = new Map<string, { id: string; name: string }>();

      projectsSnap.docs.forEach(doc => {
        const project = doc.data();
        if (project.clientEmail) {
          clientEmails.add(project.clientEmail.toLowerCase());
          projectMap.set(project.clientEmail.toLowerCase(), {
            id: doc.id,
            name: project.name || 'Project'
          });
        }
      });

      console.log(`[emailMonitor] Monitoring ${clientEmails.size} client emails for user ${settings.userId} (IMAP)`);

      // Fetch unread messages
      for await (const msg of client.fetch({
        seen: false,
        limit: 50,
        source: true,
        envelope: true,
        uid: true,
        internalDate: true,
      })) {
        try {
          const from = msg.envelope.from?.[0]?.address || '';
          const subject = msg.envelope.subject || '';
          const body = msg.source?.toString() || '';

          // Check if this email is from any of our monitored client emails
          const senderEmail = this.extractEmailFromString(from);
          const matchingProject = projectMap.get(senderEmail.toLowerCase());
          
          if (!matchingProject) {
            continue;
          }

          // Check for duplicates
          const isDuplicate = await this.isEmailDuplicate(settings.userId, `imap_${msg.uid}`);
          if (isDuplicate) {
            continue;
          }

          // Process the email
          await this.processEmail(settings.userId, {
            imapUid: msg.uid,
            from,
            subject,
            body,
            date: msg.internalDate || new Date(),
            projectId: matchingProject.id
          });

        } catch (error) {
          console.error(`Error processing IMAP message ${msg.uid}:`, error);
        }
      }

      lock.release();
    } finally {
      await client.logout();
    }
  }

  private findMatchingClientFilter(from: string, filters: ClientEmailFilter[]): ClientEmailFilter | null {
    const senderEmail = this.extractEmailFromString(from);
    
    for (const filter of filters) {
      if (senderEmail.toLowerCase() === filter.emailAddress.toLowerCase()) {
        return filter;
      }
    }
    
    return null;
  }

  private extractEmailFromString(str: string): string {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = str.match(emailRegex);
    return match ? match[1] : str;
  }

  private async isEmailDuplicate(userId: string, emailId: string): Promise<boolean> {
    const duplicateSnap = await db.collection('processedEmails')
      .where('userId', '==', userId)
      .where('gmailId', '==', emailId)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      return true;
    }

    // Also check by IMAP UID
    const duplicateImapSnap = await db.collection('processedEmails')
      .where('userId', '==', userId)
      .where('imapUid', '==', emailId)
      .limit(1)
      .get();

    return !duplicateImapSnap.empty;
  }

  private async processEmail(userId: string, emailData: {
    gmailId?: string;
    imapUid?: string;
    from: string;
    subject: string;
    body: string;
    date: Date;
    projectId?: string;
  }) {
    console.log(`Processing email from ${emailData.from}`);

    // Store processed email
    const processedEmailRef = await db.collection('processedEmails').add({
      userId,
      projectId: emailData.projectId,
      gmailId: emailData.gmailId,
      imapUid: emailData.imapUid,
      from: emailData.from,
      subject: emailData.subject,
      body: emailData.body,
      date: emailData.date,
      processedAt: new Date(),
      status: 'pending'
    });

    // Update status to AI processing
    await processedEmailRef.update({ status: 'ai_processing' });

    try {
      // Generate AI draft
      const geminiRes = await getGeminiReply({
        message: emailData.body,
        tone: 'professional',
        template: 'default',
        signature: 'Your Name', // Will be replaced with actual user signature
        clientName: 'Client' // Will be replaced with actual client name
      });

      // Store AI draft
      await db.collection('aiDrafts').add({
        projectId: emailData.projectId,
        processedEmailId: processedEmailRef.id,
        subject: geminiRes.subject || `Re: ${emailData.subject}`,
        body: geminiRes.body,
        closing: geminiRes.closing,
        signature: geminiRes.signature,
        status: 'draft',
        createdAt: new Date()
      });

      // Send push for new AI draft
      await sendPushToUser({
        userId,
        title: 'New AI draft generated',
        body: geminiRes.subject ? `Subject: ${geminiRes.subject}` : 'An AI reply draft is ready',
        data: {
          changeType: 'new_draft',
          projectId: emailData.projectId || '',
          description: geminiRes.subject || emailData.subject || 'AI draft',
        },
        silent: false,
      });

      // Extract todos
      const todos = await extractEmailTodos(emailData.body);
      for (const todo of todos) {
        await db.collection('todos').add({
          userId,
          projectId: emailData.projectId,
          task: todo.task,
          dueDate: todo.dueDate,
          source: 'email',
          confidence: todo.confidence,
          createdAt: new Date()
        });
      }

      if (todos.length > 0) {
        await sendPushToUser({
          userId,
          title: 'New to-do extracted',
          body: todos.length === 1 ? todos[0].task : `${todos.length} new to-dos extracted from email`,
          data: {
            changeType: 'new_todo',
            projectId: emailData.projectId || '',
            description: todos.length === 1 ? todos[0].task : `${todos.length} todos`,
          },
          silent: false,
        });
      }

      // Update status to draft created
      await processedEmailRef.update({ status: 'draft_created' });

      console.log(`Successfully processed email from ${emailData.from}`);

    } catch (error) {
      console.error(`Error generating AI draft for email from ${emailData.from}:`, error);
      await processedEmailRef.update({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Public methods for manual operations
  async checkUserEmailsManually(userId: string) {
    const settingsSnap = await db.collection('emailSettings')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    for (const settingDoc of settingsSnap.docs) {
      const settings = settingDoc.data() as EmailSettings;
      await this.checkUserEmails(settings);
    }
  }

  // Manual check for a specific user (for testing)
  async checkUserEmailsNow(userId: string) {
    console.log(`[emailMonitor] Manual email check requested for user ${userId}`);
    await this.checkUserEmailsManually(userId);
    console.log(`[emailMonitor] Manual email check completed for user ${userId}`);
  }

  async getProcessingStatus(userId: string) {
    const pendingSnap = await db.collection('processedEmails')
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'ai_processing'])
      .orderBy('processedAt', 'desc')
      .limit(10)
      .get();

    return pendingSnap.docs.map(doc => doc.data());
  }
}

// Export singleton instance
export const emailMonitor = new EmailMonitorService(); 