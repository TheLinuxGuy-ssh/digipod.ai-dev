import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    console.log('/api/gmail-user: No userId (unauthorized)');
    return NextResponse.json({}, { status: 401 });
  }
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) {
    console.log(`/api/gmail-user: No user doc for UID ${userId}`);
    return NextResponse.json({}, { status: 404 });
  }
  const user = userSnap.data();
  if (!user) {
    console.log(`/api/gmail-user: User doc empty for UID ${userId}`);
    return NextResponse.json({}, { status: 404 });
  }
  if (!user.gmailToken) {
    console.log(`/api/gmail-user: No gmailToken for UID ${userId}`);
    return NextResponse.json({ email: user.email, name: user.name, gmailConnected: false }, { status: 200 });
  }
  console.log(`/api/gmail-user: Gmail connected for UID ${userId}`);
  return NextResponse.json({ email: user.email, name: user.name, gmailConnected: true });
} 