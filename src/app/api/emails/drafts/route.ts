import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

interface DraftedEmail {
  id: string;
  projectId: string;
  projectName: string;
  clientEmail?: string;
  from: string;
  subject: string;
  body: string;
  closing: string;
  signature: string;
  status: string;
  createdAt: FirebaseFirestore.Timestamp | Date | string;
  parentId?: string;
  trigger?: string;
}

// Type-safe helper to extract Date from Firestore Timestamp, Date, or string
function getDate(val: unknown): Date {
  if (val && typeof val === 'object' && typeof (val as { toDate?: unknown }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  if (typeof val === 'string') return new Date(val);
  return new Date();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get all projects for this user
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    
    const draftedEmails: DraftedEmail[] = [];
    
    // For each project, get AI drafts from clientMessages subcollection
    for (const projectDoc of projectsSnap.docs) {
      const project = projectDoc.data();
      
      // Get AI messages with draft status (now that index exists)
      const aiDraftsSnap = await db.collection('projects').doc(projectDoc.id)
        .collection('clientMessages')
        .where('from', '==', 'AI')
        .where('status', '==', 'draft')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      for (const draftDoc of aiDraftsSnap.docs) {
        const draft = draftDoc.data();
        
        // Get the parent client message to get context
        let clientMessage = null;
        if (draft.parentId) {
          const clientMsgSnap = await db.collection('projects').doc(projectDoc.id)
            .collection('clientMessages')
            .doc(draft.parentId)
            .get();
          if (clientMsgSnap.exists) {
            clientMessage = clientMsgSnap.data();
          }
        }
        
        draftedEmails.push({
          id: draftDoc.id,
          projectId: projectDoc.id,
          projectName: project.name || 'Unknown Project',
          clientEmail: project.clientEmail,
          from: clientMessage?.from || 'Unknown',
          subject: draft.subject || 'AI Draft Reply',
          body: draft.body || '',
          closing: draft.closing || '',
          signature: draft.signature || '',
          status: draft.status || 'draft',
          createdAt: draft.createdAt,
          parentId: draft.parentId,
          trigger: draft.trigger,
        });
      }
    }
    
    // Sort by creation date (newest first) and limit to 5
    const sortedEmails = draftedEmails
      .sort((a, b) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime())
      .slice(0, 5);
    
    return NextResponse.json(sortedEmails);
  } catch (error) {
    console.error('Drafts API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 });
  }
} 