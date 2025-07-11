import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/clientMessages?messageId=...&from=AI
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('messageId');
  const from = searchParams.get('from');
  if (!messageId) {
    return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
  }
  let query = db.collection('projects').doc(id).collection('clientMessages').where('parentId', '==', messageId);
  if (from) {
    query = query.where('from', '==', from);
  }
  // Remove orderBy to avoid index error
  const snap = await query.get();
  const messages = snap.docs.map(doc => {
    const data = doc.data();
    // Convert Firestore Timestamp to ISO string if present
    if (data.createdAt && typeof data.createdAt === 'object' && data.createdAt._seconds) {
      data.createdAt = new Date(data.createdAt._seconds * 1000).toISOString();
    }
    // Convert nested aiReplies createdAt if present
    if (Array.isArray(data.aiReplies)) {
      data.aiReplies = data.aiReplies.map((reply) => {
        if (reply && typeof reply === 'object' && reply.createdAt && typeof reply.createdAt === 'object' && reply.createdAt._seconds) {
          return { ...reply, createdAt: new Date(reply.createdAt._seconds * 1000).toISOString() };
        }
        return reply;
      });
    }
    return { id: doc.id, ...data };
  });
  return NextResponse.json(messages);
} 