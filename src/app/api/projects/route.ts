import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('GET /api/projects: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    const projects = projectsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as { id: string; createdAt: Date | { toDate?: () => Date } | string | undefined })
      .sort((a, b) => {
        let aDate: Date;
        if (!a.createdAt) aDate = new Date(0);
        else if (a.createdAt instanceof Date) aDate = a.createdAt;
        else if (typeof a.createdAt === 'object' && typeof a.createdAt.toDate === 'function') aDate = a.createdAt.toDate();
        else if (typeof a.createdAt === 'string') aDate = new Date(a.createdAt);
        else aDate = new Date(0);

        let bDate: Date;
        if (!b.createdAt) bDate = new Date(0);
        else if (b.createdAt instanceof Date) bDate = b.createdAt;
        else if (typeof b.createdAt === 'object' && typeof b.createdAt.toDate === 'function') bDate = b.createdAt.toDate();
        else if (typeof b.createdAt === 'string') bDate = new Date(b.createdAt);
        else bDate = new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
    return NextResponse.json(projects);
  } catch (err) {
    console.error('Error in GET /api/projects:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('POST /api/projects: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body;
    try {
      body = await req.json();
    } catch (jsonErr) {
      console.error('POST /api/projects: Invalid JSON body', jsonErr);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { name, clientEmail, clientName, emailSignature } = body || {};
    if (!name) {
      console.error('POST /api/projects: Project name is required');
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    let docRef;
    try {
      docRef = await db.collection('projects').add({
        name,
        clientEmail: clientEmail || null,
        clientName: clientName || '',
        emailSignature: emailSignature || '',
        userId,
        currentPhase: 'DISCOVERY',
        createdAt: new Date(),
        updatedAt: new Date(),
        paymentStatus: 'pending',
        advancePaid: 0,
        totalAmount: 0,
        paymentDueDate: null,
      });
    } catch (firestoreErr) {
      console.error('POST /api/projects: Firestore error', firestoreErr);
      return NextResponse.json({ error: 'Failed to create project in Firestore' }, { status: 500 });
    }
    let doc;
    try {
      doc = await docRef.get();
    } catch (getDocErr) {
      console.error('POST /api/projects: Failed to fetch created project', getDocErr);
      return NextResponse.json({ error: 'Failed to fetch created project' }, { status: 500 });
    }
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Error in POST /api/projects:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
} 