import { db, getMessaging } from './firebaseAdmin';
import type { MulticastMessage } from 'firebase-admin/messaging';

export type PushOptions = {
  userId: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  silent?: boolean;
};

async function getAllTokensForUser(userId: string): Promise<string[]> {
  const tokens = new Set<string>();
  const doc = await db.collection('deviceTokens').doc(userId).get();
  const docToken = doc.data()?.deviceToken as string | undefined;
  if (docToken) tokens.add(docToken);
  const sub = await db.collection('deviceTokens').doc(userId).collection('tokens').get();
  for (const t of sub.docs) {
    const v = t.data()?.deviceToken as string | undefined;
    if (v) tokens.add(v);
  }
  return Array.from(tokens);
}

async function pruneInvalidTokens(userId: string, invalidTokens: string[]) {
  if (invalidTokens.length === 0) return;
  const userDocRef = db.collection('deviceTokens').doc(userId);
  const userDoc = await userDocRef.get();
  const current = userDoc.data()?.deviceToken as string | undefined;
  const batch = db.batch();
  for (const tok of invalidTokens) {
    if (current === tok) {
      batch.set(userDocRef, { deviceToken: null, updatedAt: new Date() }, { merge: true });
    }
    const subRef = userDocRef.collection('tokens').doc(tok);
    batch.delete(subRef);
  }
  await batch.commit();
}

export async function sendPushToUser(opts: PushOptions): Promise<string | null> {
  const { userId, title, body, data = {}, silent } = opts;

  try {
    const allTokens = await getAllTokensForUser(userId);
    if (allTokens.length === 0) {
      console.log(`[push] No device tokens for user ${userId}`);
      return null;
    }

    console.log(`[push] Sending to ${allTokens.length} tokens for user ${userId}`);
    console.log(`[push] Title: "${title}", Body: "${body}", Silent: ${silent}`);

    const messaging = getMessaging();
    const isSilent = Boolean(silent);

    type ApsPayload = { sound?: string; 'content-available'?: number };

    const baseMessage: Omit<MulticastMessage, 'tokens'> = {
      data: {
        ...data,
        silent: isSilent ? '1' : '0',
      },
      android: { priority: 'high' },
      apns: {
        headers: {
          'apns-push-type': isSilent ? 'background' : 'alert',
          'apns-priority': isSilent ? '5' : '10',
          'apns-topic': 'com.kashish.digipod.digipod',
        },
        payload: {
          aps: (isSilent ? { 'content-available': 1 } : { sound: 'default' }) as ApsPayload,
        },
      },
      ...(isSilent ? {} : { notification: { title: title || 'Digipod', body: body || '' } }),
    };

    if (baseMessage.apns?.headers) {
      console.log(`[push] APNs topic: ${baseMessage.apns.headers['apns-topic']}`);
      console.log(`[push] APNs push-type: ${baseMessage.apns.headers['apns-push-type']}`);
      console.log(`[push] APNs priority: ${baseMessage.apns.headers['apns-priority']}`);
    }

    const multicast: MulticastMessage = { ...baseMessage, tokens: allTokens };
    const resp = await messaging.sendEachForMulticast(multicast);
    console.log(`[push] Sent multicast to ${allTokens.length} tokens. success=${resp.successCount} failure=${resp.failureCount}`);

    const invalid: string[] = [];
    resp.responses.forEach((r, idx) => {
      if (!r.success) {
        const tok = allTokens[idx];
        const code = (r.error && (r.error as unknown as { code?: string }).code) || 'unknown';
        const message = r.error?.message || 'unknown error';
        console.error(`[push] Failure for token ${tok.slice(0, 16)}… code=${code} message=${message}`);
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalid.push(tok);
        }
      }
    });
    if (invalid.length) {
      console.log(`[push] Pruning ${invalid.length} invalid tokens`);
      await pruneInvalidTokens(userId, invalid);
    }

    const firstId = resp.responses.find(r => r.success)?.messageId || null;
    return firstId || null;
  } catch (err) {
    console.error('[push] Error sending push:', err);
    return null;
  }
}

export async function registerDeviceTokenForUser(userId: string, deviceToken: string): Promise<void> {
  const userDocRef = db.collection('deviceTokens').doc(userId);
  await userDocRef.set({ userId, deviceToken, updatedAt: new Date() }, { merge: true });
  await userDocRef.collection('tokens').doc(deviceToken).set({ deviceToken, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
} 