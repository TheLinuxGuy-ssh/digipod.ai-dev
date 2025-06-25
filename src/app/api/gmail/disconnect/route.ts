import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'No Gmail connection found' }, { status: 404 });
    }
    await userRef.update({ gmailToken: null });
    // Also remove any legacy Gmail mailbox for this user
    const mailboxSnap = await db.collection('mailboxes')
      .where('userId', '==', userId)
      .where('provider', '==', 'gmail')
      .get();
    for (const doc of mailboxSnap.docs) {
      await doc.ref.delete();
    }
    return NextResponse.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 });
  }
} 