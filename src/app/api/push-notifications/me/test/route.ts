import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { db, getMessaging } from '@/lib/firebaseAdmin';
import type { Message } from 'firebase-admin/messaging';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await db.collection('deviceTokens').doc(userId).get();
    const token = doc.data()?.deviceToken as string | undefined;
    if (!token) {
      return NextResponse.json({ error: 'No primary device token' }, { status: 404 });
    }

    const messaging = getMessaging();

    const message: Message = {
      token,
      notification: { title: 'Digipod', body: 'Direct test push' },
      apns: {
        headers: {
          'apns-push-type': 'alert',
          'apns-priority': '10',
          // Explicit topic can help surface config issues during debugging
          'apns-topic': 'com.kashish.digipod.digipod',
        },
        payload: { aps: { sound: 'default' } },
      },
      android: { priority: 'high' },
      data: { changeType: 'test_direct', silent: '0' },
    };

    const id = await messaging.send(message);
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error('Error in POST /api/push-notifications/me/test:', err);
    const code = (typeof err === 'object' && err && 'code' in err) ? (err as { code?: string }).code || 'unknown' : 'unknown';
    const message = (typeof err === 'object' && err && 'message' in err) ? (err as { message?: string }).message || 'Send failed' : String(err);
    return NextResponse.json({ error: 'Send failed', code, message }, { status: 500 });
  }
} 