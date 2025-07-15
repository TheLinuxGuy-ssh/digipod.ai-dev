import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getGeminiReply } from '@/lib/gemini';
// import { Resend } from 'resend'; // Uncomment if using Resend

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface Project {
  id: string;
  currentPhase: string;
  // Add other fields as needed
}

// Helper: find project by client email (from)
async function findProjectByClientEmail(email: string): Promise<Project | null> {
  const projectsSnap = await db.collection('projects').where('clientEmail', '==', email).limit(1).get();
  if (projectsSnap.empty) return null;
  const data = projectsSnap.docs[0].data();
  return { id: projectsSnap.docs[0].id, currentPhase: data.currentPhase };
}

export async function POST(req: NextRequest) {
  const { from, subject, body, gmailId } = await req.json();
  if (!from || !body) {
    return NextResponse.json({ error: 'Missing from or body' }, { status: 400 });
  }
  // Find project (customize as needed)
  const project = await findProjectByClientEmail(from);
  if (!project) {
    return NextResponse.json({ error: 'Project not found for this client' }, { status: 404 });
  }
  // Store incoming email as client message
  await db.collection('projects').doc(project.id).collection('clientMessages').add({
    body: `Subject: ${subject || ''}\n${body}`,
    from: 'CLIENT',
    createdAt: new Date(),
    ...(gmailId ? { gmailId } : {}),
  });
  // Get Gemini AI reply
  const geminiRes = await getGeminiReply(body);
  // Store AI reply
  await db.collection('projects').doc(project.id).collection('clientMessages').add({
    body: geminiRes.body,
    from: 'AI',
    createdAt: new Date(),
  });
  // Handle trigger
  let updatedProject = project;
  if (geminiRes.trigger === 'client_approved') {
    const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
    const idx = phases.indexOf(project.currentPhase);
    if (idx >= 0 && idx < phases.length - 1) {
      const nextPhase = phases[idx + 1];
      await db.collection('projects').doc(project.id).update({ currentPhase: nextPhase, updatedAt: new Date() });
      await db.collection('projects').doc(project.id).collection('phaseHistory').add({ phase: nextPhase, timestamp: new Date() });
      updatedProject = { ...project, currentPhase: nextPhase };
    }
  }
  // Send AI reply to client (Resend or Nodemailer)
  // await resend.emails.send({
  //   from: 'studio@digipod.ai',
  //   to: from,
  //   subject: `Re: ${subject}`,
  //   text: geminiRes.body,
  // });
  return NextResponse.json({ success: true, aiReply: geminiRes.body, trigger: geminiRes.trigger, project: updatedProject });
} 