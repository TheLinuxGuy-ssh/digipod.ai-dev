import { google } from 'googleapis';
import { db } from './firebaseAdmin';

export async function fetchInboxEmails(userId: string) {
  // Fetch user from Firestore
  const userSnap = await db.collection('users').doc(userId).get();
  const user = userSnap.data();
  if (!user || !user.gmailToken) throw new Error('No Gmail tokens');
  const tokens = JSON.parse(user.gmailToken);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  // Fetch recent threads (customize as needed)
  const res = await gmail.users.messages.list({ userId: 'me', labelIds: ['INBOX'], maxResults: 20 });
  const messages = res.data.messages || [];
  const emails = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
    const headers = full.data.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const snippet = full.data.snippet || '';
    const bodyPart = full.data.payload?.parts?.find(p => p.mimeType === 'text/plain') || full.data.payload;
    const body = Buffer.from(bodyPart?.body?.data || '', 'base64').toString('utf-8');
    emails.push({ id: msg.id, from, subject, date, snippet, body });
  }
  return emails;
}

export async function fetchProjectInboxEmails(userId: string, clientEmail: string) {
  const all = await fetchInboxEmails(userId);
  return all.filter(email => {
    const match = email.from.match(/<(.+?)>/);
    const sender = match ? match[1] : email.from;
    return sender.trim().toLowerCase() === clientEmail.trim().toLowerCase();
  });
}

export async function sendEmailReply(userId: string, to: string, subject: string, body: string) {
  // Fetch user from Firestore
  const userSnap = await db.collection('users').doc(userId).get();
  const user = userSnap.data();
  if (!user || !user.gmailToken) throw new Error('No Gmail tokens');
  const tokens = JSON.parse(user.gmailToken);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const message = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    `Subject: ${subject}`,
    '',
    body,
  ].join('\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });
} 