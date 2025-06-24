import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

function isPromise<T>(value: unknown): value is Promise<T> {
  return !!value && typeof value === "object" && "then" in value && typeof (value as { then?: unknown }).then === "function";
}

// GET /api/projects/[id] - Get project details
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = isPromise(ctx.params) ? await ctx.params : ctx.params;
  const { id } = params;
  const projectSnap = await db.collection('projects').doc(id).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const project = { id: projectSnap.id, ...projectSnap.data() };
  // Fetch phaseHistory and clientMessages subcollections
  const [phaseHistorySnap, clientMessagesSnap] = await Promise.all([
    db.collection('projects').doc(id).collection('phaseHistory').orderBy('timestamp', 'asc').get(),
    db.collection('projects').doc(id).collection('clientMessages').get(),
  ]);
  const phaseHistory = phaseHistorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const clientMessages = clientMessagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ ...project, phaseHistory, clientMessages });
}

// PATCH /api/projects/[id] - Update project clientEmail
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = isPromise(ctx.params) ? await ctx.params : ctx.params;
  const { id } = params;
  let clientEmail: string | undefined;
  try {
    const body = await req.json();
    clientEmail = body.clientEmail;
    if (!clientEmail) {
      console.error('PATCH /api/projects/[id]: Missing clientEmail');
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 });
    }
  } catch (err) {
    console.error('PATCH /api/projects/[id]: Invalid JSON body', err);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const projectRef = db.collection('projects').doc(id);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    console.error(`PATCH /api/projects/[id]: Project not found (${id})`);
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  try {
    await projectRef.update({ clientEmail });
  } catch (err) {
    console.error('PATCH /api/projects/[id]: Firestore update error', err);
    return NextResponse.json({ error: 'Failed to update clientEmail' }, { status: 500 });
  }
  const updatedSnap = await projectRef.get();
  return NextResponse.json({ id: updatedSnap.id, ...updatedSnap.data() });
} 