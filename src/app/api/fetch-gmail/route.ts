import { NextResponse } from 'next/server';
import { google, gmail_v1 } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply, extractEmailTodos } from '@/lib/gemini';
import { sendPushToUser } from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';

type GmailPayloadPart = { mimeType?: string; body?: { data?: string } };

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
  const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as { clientEmail?: string, userId?: string, currentPhase?: string, name?: string } }));
  const summary: unknown[] = [];

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

    // For each project, process emails
    for (const project of projects.filter((p: { userId?: string }) => p.userId === user.id)) {
      const ownerUserId = project.userId as string | undefined;
      const projectName = (project as { name?: string }).name || 'Project';

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

        // --- Always create and link AI draft if not present ---
        const aiDraftSnap = await db.collection('projects').doc(project.id).collection('clientMessages')
          .where('from', '==', 'AI')
          .where('parentId', '==', 'DYNAMIC') // Placeholder filter removed in real impl
          .where('status', '==', 'draft')
          .limit(1)
          .get();
        if (aiDraftSnap.empty) {
          const geminiRes = await getGeminiReply({ message: body });
          await db.collection('projects').doc(project.id).collection('clientMessages').add({
            gmailId: String(msg.id) + '-ai',
            from: 'AI',
            subject: geminiRes.subject || 'AI Reply',
            date: new Date(),
            snippet: geminiRes.body ? geminiRes.body.slice(0, 100) : '',
            body: geminiRes.body || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            parentId: 'DYNAMIC',
            status: 'draft',
          });
          console.log('[DEBUG] Created AI draft for client message:', { projectId: project.id });

          // Push: New AI draft
          if (ownerUserId) {
            await sendPushToUser({
              userId: ownerUserId,
              title: 'New AI draft generated',
              body: geminiRes.subject || 'AI draft is ready',
              data: {
                changeType: 'new_draft',
                projectId: project.id,
                projectName,
                description: geminiRes.subject || subject || 'AI draft',
              },
              silent: false,
            });
          }
        }
        // --- End Always create and link AI draft ---

        // --- AI To-Do Extraction ---
        const todos = await extractEmailTodos(body);
        if (todos.length > 0) {
          for (const todo of todos) {
            await db.collection('projects').doc(project.id).collection('todos').add({
              ...todo,
              createdAt: new Date(),
            });
          }
          // Push: Todos extracted
          if (ownerUserId) {
            await sendPushToUser({
              userId: ownerUserId,
              title: 'New to-do extracted',
              body: todos.length === 1 ? todos[0].task : `${todos.length} new to-dos extracted`,
              data: {
                changeType: 'new_todo',
                projectId: project.id,
                projectName,
                description: todos.length === 1 ? todos[0].task : `${todos.length} todos`,
              },
              silent: false,
            });
          }
        }
        // --- End To-Do Extraction ---

        processedEmails++;
        if (processedEmails > 50) break; // Limit to first 50 emails for performance
      }
    }
  }

  return NextResponse.json({ success: true, summary });
} 