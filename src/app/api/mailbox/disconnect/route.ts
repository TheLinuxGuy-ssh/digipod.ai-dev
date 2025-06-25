import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Optionally, allow specifying provider/email in body, but default to deleting the user's mailbox
    const body = await req.json().catch(() => ({}));
    const { provider, email } = body;
    console.log('DISCONNECT REQUEST:', { userId, provider, email });
    let query = db.collection('mailboxes').where('userId', '==', userId);
    if (provider) query = query.where('provider', '==', provider);
    if (email) query = query.where('email', '==', email);
    const mailboxSnap = await query.get();
    if (mailboxSnap.empty) {
      console.log('NO MAILBOX FOUND TO DELETE');
      return NextResponse.json({ error: 'No mailbox found' }, { status: 404 });
    }
    for (const doc of mailboxSnap.docs) {
      console.log('DELETING MAILBOX:', doc.id, doc.data());
      await doc.ref.delete();
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
} 