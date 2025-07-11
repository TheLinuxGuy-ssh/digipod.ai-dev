import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userSnap = await db.collection('users').doc(userId).get();
  const user = userSnap.data();
  if (!user || !user.gmailToken) return NextResponse.json({ error: 'No Google token' }, { status: 403 });
  const tokens = JSON.parse(user.gmailToken);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  // Debug: log token scopes
  console.log('Google OAuth tokens:', tokens);
  if (tokens.scope) {
    console.log('Token scopes:', tokens.scope);
  }
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  // Fetch next 10 events
  const now = new Date().toISOString();
  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = (res.data.items || []).map(ev => ({
      title: ev.summary || 'Untitled Event',
      date: ev.start?.dateTime || ev.start?.date || '',
    }));
    return NextResponse.json({ events });
  } catch (err) {
    console.error('Google Calendar API error:', err);
    return NextResponse.json({ error: 'Google Calendar API error', details: (err as Error).message }, { status: 500 });
  }
} 