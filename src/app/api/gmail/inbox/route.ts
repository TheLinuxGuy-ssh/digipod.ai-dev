import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { fetchInboxEmails } from '@/lib/gmail';
import { google } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';

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
  const gmailId = searchParams.get('gmailId');

  try {
    // If gmailId is provided, fetch specific email
    if (gmailId) {
      // Fetch user Gmail token
      const userSnap = await db.collection('users').doc(userId).get();
      const user = userSnap.data();
      if (!user || !user.gmailToken) {
        return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
      }
      
      const tokens = JSON.parse(user.gmailToken);
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Fetch specific email by ID
      const full = await gmail.users.messages.get({ userId: 'me', id: gmailId, format: 'full' });
      const headers = full.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      const snippet = full.data.snippet || '';
      const bodyPart = full.data.payload?.parts?.find(p => p.mimeType === 'text/plain') || full.data.payload;
      const body = Buffer.from(bodyPart?.body?.data || '', 'base64').toString('utf-8');
      
      const email = { id: gmailId, from, to, subject, date, snippet, body };
      return NextResponse.json([email]); // Return as array for consistency
    }

    // Otherwise, fetch all emails from Gmail inbox
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