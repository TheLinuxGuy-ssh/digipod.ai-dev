import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/push-notifications/test - Send test push notification
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('POST /api/push-notifications/test: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get device token for the user
    const deviceTokenDoc = await db.collection('deviceTokens').doc(userId).get();
    
    if (!deviceTokenDoc.exists) {
      return NextResponse.json({ error: 'No device token found for user' }, { status: 404 });
    }

    const deviceToken = deviceTokenDoc.data()?.deviceToken;
    
    if (!deviceToken) {
      return NextResponse.json({ error: 'Invalid device token' }, { status: 400 });
    }

    // For now, we'll just log the notification
    // In a real implementation, you would send this to Apple's Push Notification Service
    console.log(`📱 Test notification would be sent to device token: ${deviceToken}`);
    console.log('📱 Notification content: New activity detected in your projects!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test notification logged (would be sent to device)',
      deviceToken: deviceToken.substring(0, 20) + '...' // Log partial token for debugging
    });
  } catch (error) {
    console.error('Error in POST /api/push-notifications/test:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 