import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';
import { fetchProjectInboxEmails } from '@/lib/gmail';
import { getGeminiReply } from '@/lib/gemini';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    console.log('/api/gmail/project-inbox: No userId (unauthorized)');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) {
    console.log('/api/gmail/project-inbox: Missing projectId');
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  // Fetch project and check user
  const projectSnap = await db.collection('projects').doc(projectId).get();
  if (!projectSnap.exists) {
    console.log(`/api/gmail/project-inbox: Project not found (${projectId})`);
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const project = projectSnap.data();
  if (!project) {
    console.log(`/api/gmail/project-inbox: Project data missing for id ${projectId}`);
    return NextResponse.json({ error: 'Project data missing' }, { status: 404 });
  }
  if (project.userId !== userId) {
    console.log(`/api/gmail/project-inbox: Forbidden. Project userId: ${project.userId}, Request userId: ${userId}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!project.clientEmail) {
    console.log(`/api/gmail/project-inbox: No client email for project ${projectId}`);
    return NextResponse.json({ error: 'No client email set for this project' }, { status: 400 });
  }

  // Fetch user Gmail token
  const userSnap = await db.collection('users').doc(userId).get();
  const user = userSnap.data();
  if (!user) {
    console.log(`/api/gmail/project-inbox: User doc missing for userId ${userId}`);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!user.gmailToken) {
    console.log(`/api/gmail/project-inbox: Gmail not connected for user ${userId}`);
    return NextResponse.json({ error: 'Gmail not connected for this user' }, { status: 400 });
  }

  // Fetch Gmail inbox for this user, filtered by client email
  try {
    const emails = await fetchProjectInboxEmails(userId, project.clientEmail);
    // Get all existing clientMessages' Gmail IDs
    const clientMessagesSnap = await db.collection('projects').doc(projectId).collection('clientMessages').get();
    const existingGmailIds = new Set(
      clientMessagesSnap.docs.map(doc => doc.data().gmailId)
    );
    for (const email of emails) {
      // Use Gmail message ID as unique identifier
      if (!existingGmailIds.has(email.id)) {
        console.log(`[AI PHASE] New client email detected: ${email.subject} (${email.id})`);
        // Store as client message
        await db.collection('projects').doc(projectId).collection('clientMessages').add({
          gmailId: email.id,
          from: 'CLIENT',
          subject: email.subject,
          date: new Date(email.date || Date.now()),
          snippet: email.snippet || '',
          body: email.body,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Run Gemini AI
        const geminiRes = await getGeminiReply(email.body);
        console.log(`[AI PHASE] Gemini reply for email ${email.id}:`, geminiRes);
        await db.collection('projects').doc(projectId).collection('clientMessages').add({
          gmailId: email.id + '-ai',
          from: 'AI',
          subject: 'AI Reply',
          date: new Date(),
          snippet: geminiRes.replyText.slice(0, 100),
          body: geminiRes.replyText,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // If trigger is client_approved, advance phase
        if (geminiRes.trigger === 'client_approved') {
          const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
          const idx = phases.indexOf(project.currentPhase);
          if (idx >= 0 && idx < phases.length - 1) {
            const nextPhase = phases[idx + 1];
            await db.collection('projects').doc(projectId).update({ currentPhase: nextPhase, updatedAt: new Date() });
            await db.collection('projects').doc(projectId).collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() });
            console.log(`[AI PHASE] Phase advanced to ${nextPhase} for project ${projectId}`);
            // Update local project phase for subsequent emails in this batch
            project.currentPhase = nextPhase;
          } else {
            console.log(`[AI PHASE] Project already at final phase, not advancing.`);
          }
        } else {
          console.log(`[AI PHASE] No phase advancement for email ${email.id}. Trigger: ${geminiRes.trigger}`);
        }
      }
    }
    return NextResponse.json(emails);
  } catch (err) {
    console.error('/api/gmail/project-inbox error:', err);
    return NextResponse.json({ error: 'Failed to fetch Gmail inbox' }, { status: 500 });
  }
} 