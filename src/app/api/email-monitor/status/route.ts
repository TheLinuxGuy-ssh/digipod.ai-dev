export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get email settings
    const emailSettingsSnap = await db.collection('emailSettings')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    const emailSettings = emailSettingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get client filters
    const clientFiltersSnap = await db.collection('clientEmailFilters')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    const clientFilters = clientFiltersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get recent processed emails
    const processedEmailsSnap = await db.collection('processedEmails')
      .where('userId', '==', userId)
      .orderBy('processedAt', 'desc')
      .limit(10)
      .get();

    const processedEmails = processedEmailsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get AI drafts
    const aiDraftsSnap = await db.collection('aiDrafts')
      .where('status', '==', 'draft')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const aiDrafts = aiDraftsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      emailSettings,
      clientFilters,
      processedEmails,
      aiDrafts,
      summary: {
        emailSettingsCount: emailSettings.length,
        clientFiltersCount: clientFilters.length,
        processedEmailsCount: processedEmails.length,
        aiDraftsCount: aiDrafts.length
      }
    });
  } catch (error) {
    console.error('Error getting email monitoring status:', error);
    return NextResponse.json({ 
      error: 'Failed to get email monitoring status' 
    }, { status: 500 });
  }
} 