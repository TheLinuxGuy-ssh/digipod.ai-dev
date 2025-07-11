import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { fetchInboxEmails } from '@/lib/gmail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    console.log('/api/gmail/inbox: No userId (unauthorized)');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  try {
    // Fetch all emails from Gmail inbox
    const emails = await fetchInboxEmails(userId);
    
    // Apply date filtering if provided
    let filteredEmails = emails;
    if (fromDate || toDate) {
      filteredEmails = emails.filter(email => {
        if (!email.date) return false;
        const emailDate = new Date(email.date);
        if (isNaN(emailDate.getTime())) return false;
        
        if (fromDate && emailDate < new Date(fromDate)) return false;
        if (toDate && emailDate > new Date(toDate)) return false;
        
        return true;
      });
    }

    return NextResponse.json(filteredEmails);
  } catch (err) {
    console.error('/api/gmail/inbox error:', err);
    return NextResponse.json({ error: 'Failed to fetch Gmail inbox' }, { status: 500 });
  }
} 