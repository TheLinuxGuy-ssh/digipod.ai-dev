import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    // Always return 200 with an empty array for unauthenticated requests
    return NextResponse.json([]);
  }
  const snap = await db.collection('mailboxes').where('userId', '==', userId).get();
  const mailboxes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(mailboxes);
} 