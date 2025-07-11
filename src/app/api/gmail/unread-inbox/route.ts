import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';
import { fetchUnreadEmails } from '@/lib/gmail';

interface DashboardEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Fetch user Gmail token
  const userSnap = await db.collection('users').doc(userId).get();
  const user = userSnap.data();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!user.gmailToken) {
    return NextResponse.json({ error: 'Gmail not connected for this user' }, { status: 400 });
  }
  try {
    const emails = await fetchUnreadEmails(userId);
    if (!emails || emails.length === 0) {
      return NextResponse.json([]);
    }
    // Sort by date descending
    const sorted = (emails as DashboardEmail[])
      .filter((e) => !!e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json(sorted);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Gmail unread inbox';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 