import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const mailboxRef = db.collection('mailboxes').doc(id);
  const mailboxSnap = await mailboxRef.get();

  if (!mailboxSnap.exists) {
    return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 });
  }

  const mailbox = mailboxSnap.data();
  if (!mailbox || mailbox.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await mailboxRef.delete();
  return NextResponse.json({ success: true });
} 