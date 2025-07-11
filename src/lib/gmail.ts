import { google, gmail_v1 } from 'googleapis';
import { db } from './firebaseAdmin';

export async function fetchInboxEmails(userId: string, sender?: string) {
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
  // Remove labelIds to search all mail
  const listParams: gmail_v1.Params$Resource$Users$Messages$List = { userId: 'me', maxResults: 100 };
  if (sender && sender.trim() !== '') {
    listParams.q = `from:${sender.trim()}`;
  }
  const res = await gmail.users.messages.list(listParams);
  const messages = res.data.messages || [];
  const emails = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
    const headers = full.data.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const snippet = full.data.snippet || '';
    const bodyPart = full.data.payload?.parts?.find(p => p.mimeType === 'text/plain') || full.data.payload;
    const body = Buffer.from(bodyPart?.body?.data || '', 'base64').toString('utf-8');
    emails.push({ id: msg.id, from, to, subject, date, snippet, body });
  }
  return emails;
}

export async function fetchProjectInboxEmails(userId: string, clientEmail: string, fromDate?: string, toDate?: string) {
  const all = await fetchInboxEmails(userId);
  
  // If clientEmail is empty, return all emails (no filtering)
  if (clientEmail.trim() === '') {
    console.log('DEBUG: No clientEmail filter, returning all emails');
    return all;
  }
  
  console.log('DEBUG: Filtering emails for clientEmail:', clientEmail);
  all.forEach(email => {
    const match = email.from.match(/<(.+?)>/);
    const sender = match ? match[1] : email.from;
    console.log('DEBUG: Email from:', email.from, '| Parsed sender:', sender);
  });
  
  return all.filter(email => {
    const match = email.from.match(/<(.+?)>/);
    const sender = match ? match[1] : email.from;
    
    // Check if sender matches the clientEmail
    const senderMatch = sender.trim().toLowerCase().includes(clientEmail.trim().toLowerCase());
    if (!senderMatch) {
      console.log('DEBUG: Skipping email, sender does not match:', sender, clientEmail);
      return false;
    }
    
    if (fromDate || toDate) {
      // Parse email date
      const emailDate = email.date ? new Date(email.date) : null;
      if (!emailDate || isNaN(emailDate.getTime())) {
        console.log('DEBUG: Skipping email, invalid date:', email.date);
        return false;
      }
      if (fromDate && emailDate < new Date(fromDate)) {
        console.log('DEBUG: Skipping email, before fromDate:', emailDate, fromDate);
        return false;
      }
      if (toDate && emailDate > new Date(toDate)) {
        console.log('DEBUG: Skipping email, after toDate:', emailDate, toDate);
        return false;
      }
    }
    console.log('DEBUG: Including email:', sender, email.subject);
    return true;
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

export async function fetchUnreadEmails(userId: string) {
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
  // Use Gmail API to fetch unread emails
  const listParams: gmail_v1.Params$Resource$Users$Messages$List = { userId: 'me', maxResults: 20, q: 'is:unread' };
  const res = await gmail.users.messages.list(listParams);
  const messages = res.data.messages || [];
  const emails = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
    const headers = full.data.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const snippet = full.data.snippet || '';
    const bodyPart = full.data.payload?.parts?.find(p => p.mimeType === 'text/plain') || full.data.payload;
    const body = Buffer.from(bodyPart?.body?.data || '', 'base64').toString('utf-8');
    emails.push({ id: msg.id, from, to, subject, date, snippet, body });
  }
  return emails;
} 