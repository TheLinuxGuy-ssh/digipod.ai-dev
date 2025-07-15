import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply } from '@/lib/gemini';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface Project { currentPhase: string; }

export async function POST(
  request: Request,
  context: Promise<{ params: { id: string } }>
) {
  const { params } = await context;
  const { id: projectId } = params;
  const body = await request.json();
  const { message, aiReply, parentId, gmailId } = body;

  // If saving a client message
  if (message && !aiReply) {
    // Save client message and generate a threadId
    const clientMsgRef = await db.collection('projects').doc(projectId).collection('clientMessages').add({
      body: message,
      from: 'CLIENT',
      createdAt: new Date(),
      ...(gmailId ? { gmailId } : {}),
    });
    const threadId = clientMsgRef.id;
    await clientMsgRef.update({ threadId });

    const geminiRes = await getGeminiReply(message);

    // Persist all AI-generated replies as drafts, with threadId
    await db.collection('projects').doc(projectId).collection('clientMessages').add({
      from: 'AI',
      subject: geminiRes.subject,
      body: geminiRes.body,
      closing: geminiRes.closing,
      signature: geminiRes.signature,
      trigger: geminiRes.trigger || null,
      status: 'draft',
      createdAt: new Date(),
      threadId,
    });

    const projectSnap = await db.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const project = projectSnap.data() as Project;
    const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
    const idx = phases.indexOf(project.currentPhase);
    if (idx >= 0 && idx < phases.length - 1) {
      const nextPhase = phases[idx + 1];
      await Promise.all([
        db.collection('projects').doc(projectId).update({ currentPhase: nextPhase, updatedAt: new Date() }),
        db.collection('projects').doc(projectId).collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() }),
      ]);
    }
    return NextResponse.json({ trigger: geminiRes.trigger }, { status: 201 });
  }

  // If saving an AI reply for a specific message (per-message draft)
  if (aiReply && parentId) {
    await db.collection('projects').doc(projectId).collection('clientMessages').add({
      from: 'AI',
      subject: aiReply.subject,
      body: aiReply.body,
      closing: aiReply.closing,
      signature: aiReply.signature,
      trigger: aiReply.trigger || null,
      status: 'draft',
      createdAt: new Date(),
      parentId,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
