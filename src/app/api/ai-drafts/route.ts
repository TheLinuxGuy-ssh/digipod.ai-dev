import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export const dynamic = 'force-dynamic';

interface AIDraft {
  id: string;
  projectId: string;
  clientEmail: string;
  subject: string;
  content: string;
  body?: string; // Add this line to fix linter error
  closing?: string;
  signature?: string;
  status: 'draft' | 'approved' | 'declined' | 'sent';
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'draft';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Get all projects for this user
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    const drafts: AIDraft[] = [];

    for (const projectDoc of projectsSnap.docs) {
      const project = projectDoc.data() as { name?: string; clientEmail?: string };
      // Fetch AI drafts from clientMessages
      const aiDraftsSnap = await db.collection('projects').doc(projectDoc.id).collection('clientMessages')
        .where('from', '==', 'AI')
        .where('status', '==', 'draft')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      for (const draftDoc of aiDraftsSnap.docs) {
        const draft = draftDoc.data();
        drafts.push({
          id: draftDoc.id,
          projectId: projectDoc.id,
          clientEmail: project.clientEmail || 'Client',
          subject: draft.subject,
          body: draft.body,
          content: draft.body,
          closing: draft.closing,
          signature: draft.signature,
          status: draft.status,
          createdAt: draft.createdAt instanceof Date ? draft.createdAt : draft.createdAt?.toDate?.() || new Date(),
        });
      }
    }

    // Filter by status and limit
    const filteredDrafts = drafts
      .filter(draft => draft.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return NextResponse.json({ 
      drafts: filteredDrafts,
      total: filteredDrafts.length
    });
  } catch (error) {
    console.error('Error fetching AI drafts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch AI drafts' 
    }, { status: 500 });
  }
} 