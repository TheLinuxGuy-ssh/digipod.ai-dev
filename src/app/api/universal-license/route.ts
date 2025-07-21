import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

const UNIVERSAL_LICENSE_KEY = process.env.UNIVERSAL_LICENSE_KEY;
if (!UNIVERSAL_LICENSE_KEY) {
  throw new Error('UNIVERSAL_LICENSE_KEY is not set in environment variables');
}

type AuthorizedUser = { userId?: string; email?: string };

export async function POST(req: NextRequest) {
  const { code, email } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid code' }, { status: 400 });
  }

  if (code !== UNIVERSAL_LICENSE_KEY) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 404 });
  }

  const userId = await getUserIdFromRequest(req);
  const universalLicenseRef = db.collection('universalLicense').doc('main');
  const docSnap = await universalLicenseRef.get();
  let authorizedUsers: AuthorizedUser[] = [];
  if (docSnap.exists) {
    const data = docSnap.data();
    if (data && Array.isArray(data.authorizedUsers)) {
      authorizedUsers = data.authorizedUsers;
    }
  }

  // If authenticated, use userId; otherwise, use email
  let identifier: AuthorizedUser;
  if (userId) {
    identifier = { userId };
    if (authorizedUsers.some((u) => u.userId === userId)) {
      return NextResponse.json({ success: true, message: 'User already authorized' });
    }
  } else if (email && typeof email === 'string') {
    identifier = { email };
    if (authorizedUsers.some((u) => u.email === email)) {
      return NextResponse.json({ success: true, message: 'Email already authorized' });
    }
  } else {
    return NextResponse.json({ error: 'Unauthorized: must provide email if not authenticated' }, { status: 401 });
  }

  authorizedUsers.push(identifier);
  await universalLicenseRef.set({ authorizedUsers }, { merge: true });
  return NextResponse.json({ success: true, message: 'Universal license activated' });
} 