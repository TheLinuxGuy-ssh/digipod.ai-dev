import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/push-notifications/register - Register device token for push notifications
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('POST /api/push-notifications/register: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceToken } = await req.json();
    
    if (!deviceToken) {
      return NextResponse.json({ error: 'Device token is required' }, { status: 400 });
    }

    // Store device token in Firestore
    await db.collection('deviceTokens').doc(userId).set({
      deviceToken,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    console.log(`✅ Device token registered for user ${userId}`);
    
    return NextResponse.json({ success: true, message: 'Device token registered successfully' });
  } catch (error) {
    console.error('Error in POST /api/push-notifications/register:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 