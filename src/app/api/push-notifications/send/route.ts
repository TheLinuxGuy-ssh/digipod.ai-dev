import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db, getMessaging } from '@/lib/firebaseAdmin';
import type { Message } from 'firebase-admin/messaging';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('POST /api/push-notifications/send: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, changeType, projectId, projectName, description, silent } = await req.json();

    if (!silent && (!title || !body)) {
      return NextResponse.json({ error: 'Title and body are required for alert pushes' }, { status: 400 });
    }

    const deviceTokenDoc = await db.collection('deviceTokens').doc(userId).get();
    if (!deviceTokenDoc.exists) {
      console.log(`No device token found for user ${userId}`);
      return NextResponse.json({ success: false, message: 'No device token found for user' });
    }

    const deviceToken = deviceTokenDoc.data()?.deviceToken as string | undefined;
    if (!deviceToken) {
      return NextResponse.json({ error: 'Invalid device token' }, { status: 400 });
    }

    const messaging = getMessaging();

    const isSilent = Boolean(silent);

    type ApsPayload = { sound?: string; 'content-available'?: number };

    const message: Message = {
      token: deviceToken,
      data: {
        changeType: changeType ?? '',
        projectId: projectId ?? '',
        projectName: projectName ?? '',
        description: description ?? '',
        silent: isSilent ? '1' : '0',
      },
      android: {
        priority: 'high',
      },
      apns: {
        headers: {
          'apns-push-type': isSilent ? 'background' : 'alert',
          'apns-priority': isSilent ? '5' : '10',
        },
        payload: {
          aps: (isSilent
            ? { 'content-available': 1 }
            : { sound: 'default' }) as ApsPayload,
        },
      },
    };

    if (!isSilent) {
      message.notification = { title, body };
    }

    const messageId = await messaging.send(message);

    console.log('📱 Push sent, id:', messageId, 'silent:', isSilent);

    return NextResponse.json({ success: true, message: 'Push notification sent', id: messageId, silent: isSilent });
  } catch (error) {
    console.error('Error in POST /api/push-notifications/send:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 