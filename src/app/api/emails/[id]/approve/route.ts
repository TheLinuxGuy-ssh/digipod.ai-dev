import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { sendEmailReply } from '@/lib/gmail';
import { sendPushToUser } from '@/lib/pushNotifications';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get edited content from request body
  const { subject, body, closing, signature } = await req.json().catch(() => ({}));

  try {
    // Find the draft in clientMessages subcollections
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    
    for (const projectDoc of projectsSnap.docs) {
      const draftRef = db.collection('projects').doc(projectDoc.id).collection('clientMessages').doc(params.id);
      const draftSnap = await draftRef.get();
      
      if (draftSnap.exists) {
        const draft = draftSnap.data();
        if (draft?.from === 'AI' && draft?.status === 'draft') {
          // Get the project to find the client email
          const project = projectDoc.data();
          if (!project?.clientEmail) {
            return NextResponse.json({ error: 'No client email found for this project' }, { status: 400 });
          }
          
          // Use edited content if provided, otherwise use draft content
          const emailSubject = subject || draft.subject || 'Re: Project Update';
          const emailBody = body || draft.body;
          const emailClosing = closing || draft.closing || '';
          const emailSignature = signature || draft.signature || '';
          
          // Construct the full email content
          const fullEmailContent = `${emailBody}\n\n${emailClosing}\n${emailSignature}`.trim();
          
          // Send the email
          await sendEmailReply(userId, project.clientEmail, emailSubject, fullEmailContent);
          
          // Update the draft status to approved
          await draftRef.update({ 
            status: 'approved',
            approvedAt: new Date().toISOString(),
            sentAt: new Date().toISOString()
          });
          
          // Push: AI draft approved and sent
          await sendPushToUser({
            userId,
            title: 'AI reply sent',
            body: emailSubject,
            data: { changeType: 'ai_activity', description: 'AI draft approved and sent' },
            silent: false,
          });
          
          return NextResponse.json({ success: true });
        }
      }
    }
    
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  } catch (error) {
    console.error('Approve draft error:', error);
    return NextResponse.json({ error: 'Failed to approve and send draft' }, { status: 500 });
  }
} 