import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply } from '@/lib/gemini';

// POST /api/projects/[id]/message - Add client message, get AI reply, handle triggers
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { message } = await req.json();
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  // Store client message
  await db.collection('projects').doc(id).collection('clientMessages').add({
    body: message,
    from: 'CLIENT',
    createdAt: new Date(),
  });
  // Call Gemini API
  const geminiRes = await getGeminiReply(message);
  // Store AI reply
  await db.collection('projects').doc(id).collection('clientMessages').add({
    body: geminiRes.replyText,
    from: 'AI',
    createdAt: new Date(),
  });
  // Handle trigger (if any)
  if (geminiRes.trigger) {
    const projectSnap = await db.collection('projects').doc(id).get();
    if (projectSnap.exists) {
      const project = projectSnap.data();
      const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
      const idx = phases.indexOf(project.currentPhase);
      if (idx >= 0 && idx < phases.length - 1) {
        const nextPhase = phases[idx + 1];
        await db.collection('projects').doc(id).update({ currentPhase: nextPhase, updatedAt: new Date() });
        await db.collection('projects').doc(id).collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() });
      }
    }
  }
  return NextResponse.json({ aiReply: geminiRes.replyText, trigger: geminiRes.trigger });
} 