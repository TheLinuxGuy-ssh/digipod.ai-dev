import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply, classifyClientIntent } from '@/lib/gemini';

// Helper: classify intent from email text
async function classifyIntentFromEmail(text) {
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
async function advanceProjectPhase(projectId) {
  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) return;
  const project = projectSnap.data();
  const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
  const idx = phases.indexOf(project.currentPhase);
  if (idx === -1 || idx >= phases.length - 1) return;
  const nextPhase = phases[idx + 1];
  await projectRef.update({ currentPhase: nextPhase, updatedAt: new Date() });
  await projectRef.collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() });
}

// Helper: fetch all Gmail messages for a user (with pagination)
async function fetchAllGmailMessages(gmail) {
  let messages = [];
  let nextPageToken = undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 50,
      pageToken: nextPageToken,
    });
    if (res.data.messages) messages = messages.concat(res.data.messages);
    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);
  return messages;
}

export async function POST() {
  console.log('FETCH-GMAIL ENDPOINT HIT');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.gmailToken);
  const projectsSnap = await db.collection('projects').get();
  const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.clientEmail);
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
    } catch (err) {
      console.error('Error fetching Gmail messages:', err);
      continue;
    }

    // For each project, process all relevant emails
    for (const project of projects.filter(p => p.userId === user.id)) {
      const normalizedClientEmail = project.clientEmail.trim().toLowerCase();
      let shouldAdvance = false;
      for (const msg of allMessages) {
        let full;
        try {
          full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        } catch (err) {
          console.error('Error fetching message details:', err);
          continue;
        }
        const headers = full.data.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || '';
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const bodyPart = full.data.payload?.parts?.find(p => p.mimeType === 'text/plain') || full.data.payload;
        const body = Buffer.from(bodyPart?.body?.data || '', 'base64').toString('utf-8');
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
        let intent = await classifyIntentFromEmail(body);
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
            date: new Date(full.data.internalDate ? parseInt(full.data.internalDate) : Date.now()),
            snippet: full.data.snippet || '',
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