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
    const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    const { name, clientEmail } = body || {};
    if (!name) {
      console.error('POST /api/projects: Project name is required');
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    let docRef;
    try {
      docRef = await db.collection('projects').add({
        name,
        clientEmail: clientEmail || null,
        userId,
        currentPhase: 'DISCOVERY',
        createdAt: new Date(),
        updatedAt: new Date(),
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