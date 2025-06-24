import { NextRequest, NextResponse } from 'next/server';
import { fetchInboxEmails } from '@/lib/gmail';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json([], { status: 401 });
  // Find mailbox for this user
  const mailboxSnap = await db.collection('mailboxes').where('userId', '==', userId).limit(1).get();
  if (mailboxSnap.empty) return NextResponse.json([], { status: 200 });
  // Use Gmail
  const emails = await fetchInboxEmails(userId);
  return NextResponse.json(emails);
} 