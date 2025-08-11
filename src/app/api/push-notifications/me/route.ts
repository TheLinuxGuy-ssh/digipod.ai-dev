import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docRef = db.collection('deviceTokens').doc(userId);
    const doc = await docRef.get();
    const primary = (doc.exists ? (doc.data()?.deviceToken as string | undefined) : undefined) || null;

    const sub = await docRef.collection('tokens').get();
    const tokens = sub.docs.map(d => (d.data()?.deviceToken as string | undefined) || '').filter(Boolean);

    return NextResponse.json({ userId, primary, tokens, count: tokens.length, hasPrimary: Boolean(primary) });
  } catch (err) {
    console.error('Error in GET /api/push-notifications/me:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 