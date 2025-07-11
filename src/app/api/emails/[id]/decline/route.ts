import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Find the draft in clientMessages subcollections
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    
    for (const projectDoc of projectsSnap.docs) {
      const draftRef = db.collection('projects').doc(projectDoc.id).collection('clientMessages').doc(params.id);
      const draftSnap = await draftRef.get();
      
      if (draftSnap.exists) {
        const draft = draftSnap.data();
        if (draft?.from === 'AI' && draft?.status === 'draft') {
          // Update the draft status to declined
          await draftRef.update({ 
            status: 'declined',
            declinedAt: new Date().toISOString()
          });
          
          return NextResponse.json({ success: true });
        }
      }
    }
    
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  } catch (error) {
    console.error('Decline draft error:', error);
    return NextResponse.json({ error: 'Failed to decline draft' }, { status: 500 });
  }
} 