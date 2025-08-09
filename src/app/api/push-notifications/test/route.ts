import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db, getMessaging } from '@/lib/firebaseAdmin';
import type { Message } from 'firebase-admin/messaging';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('POST /api/push-notifications/test: No userId (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bodyJson = await req.json().catch(() => ({}));
    const { silent, title, body } = bodyJson as { silent?: boolean; title?: string; body?: string };

    const deviceTokenDoc = await db.collection('deviceTokens').doc(userId).get();
    if (!deviceTokenDoc.exists) {
      return NextResponse.json({ error: 'No device token found for user' }, { status: 404 });
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
        changeType: 'test',
        silent: isSilent ? '1' : '0',
      },
      android: { priority: 'high' },
      apns: {
        headers: {
          'apns-push-type': isSilent ? 'background' : 'alert',
          'apns-priority': isSilent ? '5' : '10',
        },
        payload: {
          aps: (isSilent ? { 'content-available': 1 } : { sound: 'default' }) as ApsPayload,
        },
      },
    };

    if (!isSilent) {
      message.notification = {
        title: title || 'Digipod',
        body: body || 'New activity detected in your projects!',
      };
    }

    const messageId = await messaging.send(message);

    console.log('📱 Test push sent, id:', messageId, 'silent:', isSilent);

    return NextResponse.json({ success: true, message: 'Test notification sent', id: messageId, silent: isSilent });
  } catch (error) {
    console.error('Error in POST /api/push-notifications/test:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 