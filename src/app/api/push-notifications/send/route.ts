import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/push-notifications/send - Send push notification for new changes
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('POST /api/push-notifications/send: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, changeType, projectId, projectName, description } = await req.json();
    
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Get device token for the user
    const deviceTokenDoc = await db.collection('deviceTokens').doc(userId).get();
    
    if (!deviceTokenDoc.exists) {
      console.log(`No device token found for user ${userId}`);
      return NextResponse.json({ 
        success: false, 
        message: 'No device token found for user' 
      });
    }

    const deviceToken = deviceTokenDoc.data()?.deviceToken;
    
    if (!deviceToken) {
      return NextResponse.json({ error: 'Invalid device token' }, { status: 400 });
    }

    // Log the notification that would be sent
    console.log(`📱 Push notification would be sent to user ${userId}:`);
    console.log(`   Title: ${title}`);
    console.log(`   Body: ${body}`);
    console.log(`   Change Type: ${changeType}`);
    console.log(`   Project: ${projectName || 'N/A'}`);
    console.log(`   Description: ${description}`);
    console.log(`   Device Token: ${deviceToken.substring(0, 20)}...`);

    // TODO: In a real implementation, you would send this to Apple's Push Notification Service
    // For now, we'll just log it and return success
    
    return NextResponse.json({ 
      success: true, 
      message: 'Push notification logged (would be sent to device)',
      notification: {
        title,
        body,
        changeType,
        projectId,
        projectName,
        description
      }
    });
  } catch (error) {
    console.error('Error in POST /api/push-notifications/send:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 