import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply } from '@/lib/gemini';

// POST /api/projects/[id]/phase/next - AI-driven phase advance
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const projectSnap = await db.collection('projects').doc(id).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const project = projectSnap.data();
  const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
  const idx = phases.indexOf(project.currentPhase);
  if (idx === -1 || idx >= phases.length - 1) {
    return NextResponse.json({ error: 'Already at final phase' }, { status: 400 });
  }
  // Fetch recent client messages (last 5)
  const clientMessagesSnap = await db.collection('projects').doc(id).collection('clientMessages')
    .where('from', '==', 'CLIENT')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  const clientMessages = clientMessagesSnap.docs.map(doc => doc.data().body).reverse();
  const context = clientMessages.join('\n---\n');
  // Ask Gemini if we should advance
  const aiPrompt = `You are Digipod AI. Here are the latest client messages for a project currently in the ${project.currentPhase} phase.\n\nMessages:\n${context}\n\nShould this project advance to the next phase?\n\nRespond in this JSON format:\n{\n  "replyText": string,\n  "trigger": "client_approved" | "client_left_feedback" | null\n}`;
  const ai = await getGeminiReply(aiPrompt);
  if (ai.trigger === 'client_approved') {
    const nextPhase = phases[idx + 1];
    await db.collection('projects').doc(id).update({ currentPhase: nextPhase, updatedAt: new Date() });
    await db.collection('projects').doc(id).collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() });
    return NextResponse.json({ success: true, nextPhase, aiReply: ai.replyText, trigger: ai.trigger });
  } else {
    return NextResponse.json({ success: false, reason: ai.replyText, trigger: ai.trigger });
  }
} 