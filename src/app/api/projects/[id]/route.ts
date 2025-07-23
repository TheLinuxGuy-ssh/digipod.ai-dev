import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

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

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Verify authentication
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = isPromise(ctx.params) ? await ctx.params : ctx.params;
    const { id } = params;

    // Check if project exists and belongs to the user
    const projectRef = db.collection('projects').doc(id);
    const projectSnap = await projectRef.get();
    
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectSnap.data();
    if (projectData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete subcollections first
    const batch = db.batch();
    
    // Delete phaseHistory subcollection
    const phaseHistorySnap = await projectRef.collection('phaseHistory').get();
    phaseHistorySnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete clientMessages subcollection
    const clientMessagesSnap = await projectRef.collection('clientMessages').get();
    clientMessagesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the main project document
    batch.delete(projectRef);

    // Execute the batch
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/projects/[id]: Error deleting project', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
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
    const { clientEmail, phases, name, advancePaid, totalAmount, paymentDueDate, clientName, emailSignature, currentPhase, filterFromDate, filterToDate } = await req.json();
    if (clientEmail !== undefined) {
      updateData.clientEmail = clientEmail;
    }
    if (clientName !== undefined) {
      updateData.clientName = clientName;
    }
    if (emailSignature !== undefined) {
      updateData.emailSignature = emailSignature;
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
    if (paymentDueDate !== undefined) {
      if (paymentDueDate !== null && typeof paymentDueDate !== 'string') {
        return NextResponse.json({ error: 'paymentDueDate must be a string (ISO date) or null.' }, { status: 400 });
      }
      updateData.paymentDueDate = paymentDueDate;
    }
    // Allow updating currentPhase
    if (currentPhase !== undefined) {
      if (typeof currentPhase !== 'string' || !currentPhase.trim()) {
        return NextResponse.json({ error: 'currentPhase must be a non-empty string.' }, { status: 400 });
      }
      updateData.currentPhase = currentPhase;
      updateData.updatedAt = new Date();
    }
    // Allow updating filterFromDate and filterToDate
    if (filterFromDate !== undefined) {
      if (filterFromDate !== null && typeof filterFromDate !== 'string') {
        return NextResponse.json({ error: 'filterFromDate must be a string (ISO date) or null.' }, { status: 400 });
      }
      updateData.filterFromDate = filterFromDate;
    }
    if (filterToDate !== undefined) {
      if (filterToDate !== null && typeof filterToDate !== 'string') {
        return NextResponse.json({ error: 'filterToDate must be a string (ISO date) or null.' }, { status: 400 });
      }
      updateData.filterToDate = filterToDate;
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