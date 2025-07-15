import { NextResponse } from 'next/server';
import { google, gmail_v1 } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply, extractEmailTodos } from '@/lib/gemini';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

type GmailPayloadPart = { mimeType?: string; body?: { data?: string } };

// Helper: advance project phase
async function advanceProjectPhase(projectId: string): Promise<void> {
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) return;
  const project = projectSnap.data();
  if (!project) return;
  const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
  const idx = phases.indexOf(project.currentPhase);
  if (idx === -1 || idx >= phases.length - 1) return;
  const nextPhase = phases[idx + 1];
  await projectRef.update({ currentPhase: nextPhase, updatedAt: new Date() });
  await projectRef.collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() });
}

// Helper: fetch all Gmail messages for a user (with pagination)
type GmailMessage = { id: string };
async function fetchAllGmailMessages(gmail: gmail_v1.Gmail): Promise<GmailMessage[]> {
  let messages: GmailMessage[] = [];
  let nextPageToken: string | undefined = undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 50,
      pageToken: nextPageToken,
    }) as unknown as { data: { messages?: GmailMessage[]; nextPageToken?: string } };
    if (res.data.messages) messages = messages.concat(res.data.messages);
    nextPageToken = res.data.nextPageToken ?? undefined;
  } while (nextPageToken);
  return messages;
}

// TODO: Implement this helper to create a Google Calendar event and return event details
async function createGoogleCalendarEvent() {
  // Use Google Calendar API to create event with Meet link and invite client
  // Return event details (id, link, etc.)
  return null;
}

export async function POST(): Promise<NextResponse> {
  console.log('FETCH-GMAIL ENDPOINT HIT');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as { gmailToken?: string } })).filter((u: { gmailToken?: string }) => u.gmailToken);
  const projectsSnap = await db.collection('projects').get();
  const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as { clientEmail?: string, userId?: string, currentPhase?: string } }));
  const summary = [];

  for (const user of users) {
    if (!user.gmailToken) continue;
    const tokens = JSON.parse(user.gmailToken);
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch all Gmail messages for this user
    let allMessages = [];
    try {
      allMessages = await fetchAllGmailMessages(gmail);
      console.log('Fetched Gmail messages:', allMessages.length);
    } catch (err: unknown) {
      console.error('Error fetching Gmail messages:', err);
      continue;
    }

    // For each project, find and process the latest client email
    for (const project of projects.filter((p: { userId?: string }) => p.userId === user.id)) {
      const shouldAdvance = false;
      
      // Find the latest email from any client (not just the specific client email)
      let latestClientEmail = null;
      let processedEmails = 0;
      
      for (const msg of allMessages as { id: string }[]) {
        let full: unknown;
        try {
          full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        } catch (err) {
          console.error('Error fetching message details:', err);
          continue;
        }
        
        // Type guard for Gmail message response
        let data: unknown = undefined;
        if (full && typeof full === 'object' && 'data' in full) {
          data = (full as { data: unknown }).data;
        }
        const payload = (data && typeof data === 'object' && 'payload' in data) ? (data as { payload?: unknown }).payload : undefined;
        const headers = (payload && typeof payload === 'object' && 'headers' in payload) ? (payload as { headers?: { name: string; value: string }[] }).headers || [] : [];
        const from = headers.find((h) => h.name === 'From')?.value || '';
        const subject = headers.find((h) => h.name === 'Subject')?.value || '';
        const parts = (payload && typeof payload === 'object' && 'parts' in payload)
          ? (payload as { parts?: GmailPayloadPart[] }).parts
          : undefined;
        const bodyPart = parts && Array.isArray(parts)
          ? parts.find((p) => p.mimeType === 'text/plain')
          : payload;
        const body = bodyPart && typeof bodyPart === 'object' && 'body' in bodyPart
          && (bodyPart as GmailPayloadPart).body
          && 'data' in (bodyPart as GmailPayloadPart).body!
          ? Buffer.from((bodyPart as GmailPayloadPart).body!.data || '', 'base64').toString('utf-8')
          : '';
        const internalDate = (data && typeof data === 'object' && 'internalDate' in data) ? (data as { internalDate?: string }).internalDate : undefined;
        const snippet = (data && typeof data === 'object' && 'snippet' in data) ? (data as { snippet?: string }).snippet : '';
        
        // Extract sender email
        const extractEmails = (str: string) => {
          const emails = [];
          const regex = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;
          let match;
          while ((match = regex.exec(str))) {
            emails.push(match[1].toLowerCase().trim());
          }
          return emails;
        };
        const senderEmails: string[] = Array.isArray(extractEmails(from)) ? extractEmails(from) : [];
        
        // Check if this is a client email (from anyone, not just the specific client)
        const isClientEmail = senderEmails.length > 0 && 
          !senderEmails.some(email => 
            email.includes('noreply') || 
            email.includes('no-reply') || 
            email.includes('donotreply') ||
            email.includes('mailer') ||
            email.includes('newsletter') ||
            email.includes('notification') ||
            email.includes('system') ||
            email.includes('automated')
          );
        
        if (isClientEmail) {
          latestClientEmail = { msg, from, subject, body, internalDate, snippet, senderEmails };
          console.log('[DEBUG] Found latest client email:', { senderEmails, subject });
          break; // Stop searching, we found the latest one
        }
        
        processedEmails++;
        if (processedEmails > 50) break; // Limit to first 50 emails for performance
      }
      
      // Process the latest client email found
      if (latestClientEmail) {
        const { msg, subject, body, internalDate, snippet, senderEmails } = latestClientEmail;
        console.log('[DEBUG] Processing latest email from client:', { subject, senderEmails });
        
        // Defensive: ensure all required fields are set
        const safeSubject = subject || '(No Subject)';
        const safeBody = body || snippet || '(No Body)';
        const safeDate = internalDate ? new Date(parseInt(internalDate)) : new Date();
        
        // Store ClientMessage if not already present
        const clientMessagesSnap = await db.collection('projects').doc(project.id).collection('clientMessages').where('gmailId', '==', String(msg.id)).get();
        let clientMessageId: string;
        let clientMsgRef;
        if (clientMessagesSnap.empty) {
          clientMsgRef = await db.collection('projects').doc(project.id).collection('clientMessages').add({
            gmailId: String(msg.id),
            from: 'CLIENT',
            subject: safeSubject,
            date: safeDate,
            snippet: snippet || '',
            body: `Subject: ${safeSubject}\n${safeBody}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          clientMessageId = clientMsgRef.id;
          console.log('[DEBUG] Created client message:', { clientMessageId, gmailId: String(msg.id) });
        } else {
          clientMessageId = clientMessagesSnap.docs[0].id;
          clientMsgRef = db.collection('projects').doc(project.id).collection('clientMessages').doc(clientMessageId);
          console.log('[DEBUG] Found existing client message:', { clientMessageId, gmailId: String(msg.id) });
        }
        
        // --- Always create and link AI draft if not present ---
        const aiDraftSnap = await db.collection('projects').doc(project.id).collection('clientMessages')
          .where('from', '==', 'AI')
          .where('parentId', '==', clientMessageId)
          .where('status', '==', 'draft')
          .limit(1)
          .get();
        if (aiDraftSnap.empty) {
          const geminiRes = await getGeminiReply({ message: safeBody });
          await db.collection('projects').doc(project.id).collection('clientMessages').add({
            gmailId: String(msg.id) + '-ai',
            from: 'AI',
            subject: geminiRes.subject || 'AI Reply',
            date: new Date(),
            snippet: geminiRes.body ? geminiRes.body.slice(0, 100) : '',
            body: geminiRes.body || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            parentId: clientMessageId,
            status: 'draft',
          });
          console.log('[DEBUG] Created AI draft for client message:', { clientMessageId });
        } else {
          console.log('[DEBUG] AI draft already exists for client message:', { clientMessageId });
        }
        // --- End Always create and link AI draft ---
        
        // --- AI To-Do Extraction and Call Scheduling ---
        const todos = await extractEmailTodos(body);
        for (const todo of todos) {
          let calendarEvent = null;
          if (/call|meeting|zoom|meet/i.test(todo.task)) {
            // Schedule call/meeting in Google Calendar
            calendarEvent = await createGoogleCalendarEvent();
          }
          await db.collection('projects').doc(project.id).collection('todos').add({
            ...todo,
            clientMessageId,
            calendarEvent,
            createdAt: new Date(),
          });
        }
        // --- End To-Do Extraction and Call Scheduling ---
      } else {
        console.log('[DEBUG] No client emails found in the latest 50 emails');
      }
      
      // Only advance if not already at final phase
      if (shouldAdvance && project.currentPhase !== 'DELIVERY') {
        await advanceProjectPhase(project.id);
        summary.push({ action: 'phase_advanced', project: project.id });
        console.log('Phase advanced for project', project.id);
      }
    }
  }
  return NextResponse.json({ success: true, summary });
} 