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
  const updateData: Record<string, unknown> = {};
  try {
    const { clientEmail, phases, name, advancePaid, totalAmount } = await req.json();
    if (clientEmail !== undefined) {
      updateData.clientEmail = clientEmail;
    }
    if (phases !== undefined) {
      if (!Array.isArray(phases) || phases.length < 1 || phases.length > 6 || phases.some(p => typeof p !== 'string' || !p.trim())) {
        return NextResponse.json({ error: 'Phases must be 1-6 non-empty strings.' }, { status: 400 });
      }
      updateData.phases = phases;
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Project name must be a non-empty string.' }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    // Payment fields
    if (advancePaid !== undefined) {
      if (typeof advancePaid !== 'number' || advancePaid < 0) {
        return NextResponse.json({ error: 'advancePaid must be a non-negative number.' }, { status: 400 });
      }
      updateData.advancePaid = advancePaid;
    }
    if (totalAmount !== undefined) {
      if (typeof totalAmount !== 'number' || totalAmount < 0) {
        return NextResponse.json({ error: 'totalAmount must be a non-negative number.' }, { status: 400 });
      }
      updateData.totalAmount = totalAmount;
    }
    // Always calculate amountLeft and paymentStatus
    const projectRef = db.collection('projects').doc(id);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      console.error(`PATCH /api/projects/[id]: Project not found (${id})`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectData = projectSnap.exists ? projectSnap.data() : {};
    const finalAdvance = advancePaid !== undefined ? advancePaid : (projectData && typeof projectData.advancePaid === 'number' ? projectData.advancePaid : 0);
    const finalTotal = totalAmount !== undefined ? totalAmount : (projectData && typeof projectData.totalAmount === 'number' ? projectData.totalAmount : 0);
    let amountLeft = finalTotal - finalAdvance;
    if (amountLeft < 0) amountLeft = 0;
    updateData.amountLeft = amountLeft;
    updateData.paymentStatus = amountLeft === 0 && finalTotal > 0 ? 'complete' : 'pending';
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
    await projectRef.update(updateData);
    // If payment is completed, trigger phase advance
    if (updateData.amountLeft === 0 && updateData.paymentStatus === 'complete') {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${id}/phase/next`, { method: 'POST' });
    }
  } catch (err) {
    console.error('PATCH /api/projects/[id]: Firestore update error', err);
    return NextResponse.json({ error: 'Failed to update clientEmail' }, { status: 500 });
  }
  const updatedSnap = await projectRef.get();
  return NextResponse.json({ id: updatedSnap.id, ...updatedSnap.data() });
} 