import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { getGeminiReply } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

interface AIDraft {
  id: string;
  projectId: string;
  clientEmail: string;
  subject: string;
  content: string;
  status: 'draft' | 'approved' | 'declined' | 'sent';
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'draft';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Get all projects for this user
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    const drafts: AIDraft[] = [];

    for (const projectDoc of projectsSnap.docs) {
      const project = projectDoc.data() as { name?: string; clientEmail?: string };
      
      // Fetch the latest client message for this project
      const latestMessageSnap = await db.collection('projects').doc(projectDoc.id).collection('clientMessages')
        .where('from', '==', 'CLIENT')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!latestMessageSnap.empty) {
        const latestMessage = latestMessageSnap.docs[0].data();
        
        // Check if we already have a draft for this message
        const existingDraftSnap = await db.collection('aiDrafts')
          .where('projectId', '==', projectDoc.id)
          .where('processedEmailId', '==', latestMessageSnap.docs[0].id)
          .limit(1)
          .get();

        if (existingDraftSnap.empty) {
          // Generate new AI draft for the latest message
          try {
            const geminiRes = await getGeminiReply({
              message: latestMessage.body,
              tone: 'professional',
              template: 'default',
              signature: 'Your Name',
              clientName: project.clientEmail || 'Client'
            });

            // Store the AI draft
            const draftRef = await db.collection('aiDrafts').add({
              projectId: projectDoc.id,
              processedEmailId: latestMessageSnap.docs[0].id,
              subject: geminiRes.subject || `Re: ${latestMessage.subject || 'Client Message'}`,
              body: geminiRes.body,
              closing: geminiRes.closing,
              signature: geminiRes.signature,
              status: 'draft',
              createdAt: new Date()
            });

            // Add to drafts array
            drafts.push({
              id: draftRef.id,
              projectId: projectDoc.id,
              clientEmail: project.clientEmail || 'Client',
              subject: geminiRes.subject || `Re: ${latestMessage.subject || 'Client Message'}`,
              content: geminiRes.body,
              status: 'draft',
              createdAt: new Date()
            });
          } catch (error) {
            console.error('Error generating AI draft:', error);
          }
        } else {
          // Use existing draft
          const existingDraft = existingDraftSnap.docs[0].data();
          drafts.push({
            id: existingDraftSnap.docs[0].id,
            projectId: projectDoc.id,
            clientEmail: project.clientEmail || 'Client',
            subject: existingDraft.subject,
            content: existingDraft.body,
            status: existingDraft.status,
            createdAt: existingDraft.createdAt.toDate()
          });
        }
      }
    }

    // Filter by status and limit
    const filteredDrafts = drafts
      .filter(draft => draft.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return NextResponse.json({ 
      drafts: filteredDrafts,
      total: filteredDrafts.length
    });
  } catch (error) {
    console.error('Error fetching AI drafts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch AI drafts' 
    }, { status: 500 });
  }
} 