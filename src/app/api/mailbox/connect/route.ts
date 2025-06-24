import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';
import { testImapSmtp, encrypt } from '../../../../lib/imapSmtp';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const {
      email,
      imapHost,
      imapPort,
      imapSecure,
      smtpHost,
      smtpPort,
      smtpSecure,
      username,
      password,
    } = body;
    if (!email || !imapHost || !imapPort || !smtpHost || !smtpPort || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Test connection
    await testImapSmtp({
      imapHost,
      imapPort: Number(imapPort),
      imapSecure: Boolean(imapSecure),
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpSecure: Boolean(smtpSecure),
      username,
      password,
    });
    // Encrypt password
    const passwordEnc = encrypt(password);
    // Upsert mailbox (one per user)
    const mailboxSnap = await db.collection('mailboxes').where('userId', '==', userId).limit(1).get();
    if (!mailboxSnap.empty) {
      // Update existing
      const mailboxRef = mailboxSnap.docs[0].ref;
      await mailboxRef.update({
        email,
        imapHost,
        imapPort: Number(imapPort),
        imapSecure: Boolean(imapSecure),
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure: Boolean(smtpSecure),
        username,
        passwordEnc,
        provider: 'imap',
      });
    } else {
      // Create new
      await db.collection('mailboxes').add({
        userId,
        provider: 'imap',
        email,
        imapHost,
        imapPort: Number(imapPort),
        imapSecure: Boolean(imapSecure),
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure: Boolean(smtpSecure),
        username,
        passwordEnc,
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
} 