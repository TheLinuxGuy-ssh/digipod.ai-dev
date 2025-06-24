import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Firebase UID passed as state
    const origin = url.origin;
    if (!code) return NextResponse.redirect(`${origin}/dashboard?error=missing_code`);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    // Get user email and UID from ID token
    const idToken = tokens.id_token;
    let email = '';
    let uid = '';
    if (state) {
      // Use Firebase UID from state param
      uid = state;
      console.log('Using Firebase UID from state param:', uid);
    } else if (idToken) {
      // Fallback: use Google sub (not recommended)
      const ticket = await oauth2Client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      email = payload?.email || '';
      uid = payload?.sub || '';
      console.log('Using Google sub as UID (fallback):', uid);
    }
    if (!uid) {
      console.error('Google OAuth: Could not get user UID from state or ID token');
      return NextResponse.redirect(`${origin}/dashboard?error=missing_uid`);
    }
    if (!email && idToken) {
      const ticket = await oauth2Client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      email = payload?.email || '';
    }
    // Upsert user in Firestore and store tokens using UID as doc ID
    const userRef = db.collection('users').doc(uid);
    await userRef.set(
      {
        email,
        gmailToken: JSON.stringify(tokens),
        updatedAt: new Date(),
      },
      { merge: true }
    );
    console.log('Gmail tokens saved for UID:', uid);
    // For demo, show success
    return NextResponse.redirect(`${origin}/dashboard?gmail=connected`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const url = new URL(req.url);
    const origin = url.origin;
    return NextResponse.redirect(`${origin}/dashboard?error=oauth_error`);
  }
} 