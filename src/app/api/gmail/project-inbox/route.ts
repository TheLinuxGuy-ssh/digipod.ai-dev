import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';
import { fetchInboxEmails } from '@/lib/gmail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = url;
  const projectId = searchParams.get('projectId');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const sender = searchParams.get('sender');
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  // Fetch project and check user
  const projectSnap = await db.collection('projects').doc(projectId).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const project = projectSnap.data();
  if (!project) {
    return NextResponse.json({ error: 'Project data missing' }, { status: 404 });
  }
  if (project.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  // Fetch emails using Gmail API search query if sender is provided
  try {
    let emails = await fetchInboxEmails(userId, sender || undefined);
    if (!emails || emails.length === 0) {
      throw new Error('No emails fetched from Gmail API');
    }
    if (fromDate || toDate) {
      emails = emails.filter(email => {
        if (!email.date) return false;
        const emailDate = new Date(email.date);
        if (isNaN(emailDate.getTime())) return false;
        if (fromDate && emailDate < new Date(fromDate)) return false;
        if (toDate && emailDate > new Date(toDate)) return false;
        return true;
      });
    }
    return NextResponse.json(emails);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Gmail inbox';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 