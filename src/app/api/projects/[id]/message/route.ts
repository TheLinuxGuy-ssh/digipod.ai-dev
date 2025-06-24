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
  const { message } = await request.json();
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  await db.collection('projects').doc(projectId).collection('clientMessages').add({
    body: message, from: 'CLIENT', createdAt: new Date()
  });

  const geminiRes = await getGeminiReply(message);

  await db.collection('projects').doc(projectId).collection('clientMessages').add({
    body: geminiRes.replyText, from: 'AI', createdAt: new Date()
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

  return NextResponse.json({ aiReply: geminiRes.replyText, trigger: geminiRes.trigger }, { status: 201 });
}
