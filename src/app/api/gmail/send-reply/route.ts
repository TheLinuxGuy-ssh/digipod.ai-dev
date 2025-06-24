import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';
import { sendEmailReply } from '@/lib/gmail';
import { sendSmtpEmail, decrypt } from '@/lib/imapSmtp';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { projectId, replyText } = await req.json();
    if (!projectId || !replyText) {
      return NextResponse.json({ error: 'Missing projectId or replyText' }, { status: 400 });
    }
    const projectSnap = await db.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projectSnap.data();
    if (!project || project.userId !== userId || !project.clientEmail) {
      return NextResponse.json({ error: 'Project or client email not found' }, { status: 404 });
    }
    // Find mailbox for this user
    const mailboxSnap = await db.collection('mailboxes').where('userId', '==', userId).limit(1).get();
    const mailbox = mailboxSnap.empty ? null : mailboxSnap.docs[0].data();
    if (mailbox && mailbox.provider === 'imap') {
      // Use SMTP
      try {
        await sendSmtpEmail({
          smtpHost: mailbox.smtpHost,
          smtpPort: mailbox.smtpPort,
          smtpSecure: mailbox.smtpSecure,
          username: mailbox.username,
          password: decrypt(mailbox.passwordEnc),
          from: mailbox.email,
          to: project.clientEmail,
          subject: `Reply from ${project.name}`,
          text: replyText,
        });
        return NextResponse.json({ success: true });
      } catch (e) {
        return NextResponse.json({ error: 'SMTP send failed: ' + (e as Error).message }, { status: 500 });
      }
    } else if (mailbox) {
      // Use Gmail (legacy, if mailbox exists for Gmail)
      await sendEmailReply(userId, project.clientEmail, 'Reply from Digipod', replyText);
      return NextResponse.json({ success: true });
    } else {
      // No mailbox found, check users collection for Gmail tokens
      const userSnap = await db.collection('users').doc(userId).get();
      const user = userSnap.data();
      if (user && user.gmailToken) {
        await sendEmailReply(userId, project.clientEmail, 'Reply from Digipod', replyText);
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ error: 'No mailbox found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 