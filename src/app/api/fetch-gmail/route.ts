import { NextResponse } from 'next/server';
import { google, gmail_v1 } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply, classifyClientIntent } from '@/lib/gemini';

type GmailPayloadPart = { mimeType?: string; body?: { data?: string } };

// Helper: classify intent from email text
async function classifyIntentFromEmail(text: string): Promise<string> {
  const lower = text.toLowerCase();
  if (
    lower.includes('go ahead') ||
    lower.includes('move to next step') ||
    lower.includes('approved') ||
    lower.includes('move forward')
  ) {
    return 'approve_phase_move';
  }
  return classifyClientIntent(text);
}

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

export async function POST(): Promise<NextResponse> {
  console.log('FETCH-GMAIL ENDPOINT HIT');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as { gmailToken?: string } })).filter((u: { gmailToken?: string }) => u.gmailToken);
  const projectsSnap = await db.collection('projects').get();
  const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as { clientEmail?: string, userId?: string, currentPhase?: string } })).filter((p: { clientEmail?: string }) => p.clientEmail);
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

    // For each project, process all relevant emails
    for (const project of projects.filter((p: { userId?: string }) => p.userId === user.id)) {
      const normalizedClientEmail = (project.clientEmail || '').trim().toLowerCase();
      let shouldAdvance = false;
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
        // Normalize sender
        const match = from.match(/<(.+?)>/);
        const sender = match ? match[1] : from;
        const normalizedSender = sender.trim().toLowerCase();
        // Log sender and client email
        console.log('Checking email:', { from, normalizedSender, projectClientEmail: normalizedClientEmail, subject });
        if (normalizedSender !== normalizedClientEmail) continue;
        // Log email details
        console.log('Processing email:', { subject, from, body });
        // Classify intent
        const intent = await classifyIntentFromEmail(body);
        summary.push({ email: subject, intent });
        console.log('Classified intent:', intent, 'for subject:', subject);
        if (intent === 'approve_phase_move') {
          shouldAdvance = true;
        } else if (intent === 'no_action') {
          console.log('No action taken for email:', subject);
          summary.push({ action: 'no_action', project: project.id });
        } else if (intent === 'unsure') {
          summary.push({ action: 'manual_review_needed', project: project.id });
          // Update aiReplyStatus in clientMessages (if needed)
        }
        // Store ClientMessage if not already present
        const clientMessagesSnap = await db.collection('projects').doc(project.id).collection('clientMessages').where('gmailId', '==', String(msg.id)).get();
        if (clientMessagesSnap.empty) {
          await db.collection('projects').doc(project.id).collection('clientMessages').add({
            gmailId: String(msg.id),
            from: 'CLIENT',
            subject,
            date: new Date(internalDate ? parseInt(internalDate) : Date.now()),
            snippet: snippet || '',
            body: `Subject: ${subject}\n${body}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        // Run Gemini for reply (optional, can be after phase logic)
        const geminiRes = await getGeminiReply(body);
        await db.collection('projects').doc(project.id).collection('clientMessages').add({
          gmailId: String(msg.id) + '-ai',
          from: 'AI',
          subject: 'AI Reply',
          date: new Date(),
          snippet: geminiRes.replyText.slice(0, 100),
          body: geminiRes.replyText,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
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