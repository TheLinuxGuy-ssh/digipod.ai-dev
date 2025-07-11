import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Fetch all projects for this user
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
  const emails: { projectId: string; projectName: string; subject: string; snippet: string; status: string; createdAt: string | Date | undefined }[] = [];
  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data() as { name?: string };
    // Fetch all client messages
    const msgsSnap = await db.collection('projects').doc(projectDoc.id).collection('clientMessages')
      .where('from', '==', 'CLIENT')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    for (const msgDoc of msgsSnap.docs) {
      const msg = msgDoc.data();
      // Find replies in the same thread (from AI or USER)
      const threadId = msg.threadId || msgDoc.id;
      const repliesSnap = await db.collection('projects').doc(projectDoc.id).collection('clientMessages')
        .where('threadId', '==', threadId)
        .get();
      const hasReply = repliesSnap.docs.some(doc => ['AI', 'USER'].includes(doc.data().from));
      emails.push({
        projectId: projectDoc.id,
        projectName: project.name || '',
        subject: msg.subject || '',
        snippet: msg.body ? msg.body.slice(0, 100) : '',
        status: hasReply ? 'Done' : 'Pending Reply',
        createdAt: msg.createdAt,
      });
    }
  }
  return NextResponse.json({ emails });
} 