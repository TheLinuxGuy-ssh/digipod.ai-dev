import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { getAuth } from 'firebase-admin/auth';

async function isUserAdmin(userId: string): Promise<boolean> {
  const adminRef = db.collection('admins').doc(userId);
  const docSnap = await adminRef.get();
  return docSnap.exists;
}

const universalLicenseRef = db.collection('universalLicense').doc('main');

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId || !(await isUserAdmin(userId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const docSnap = await universalLicenseRef.get();
  if (!docSnap.exists) {
    return NextResponse.json({ authorizedUsers: [] });
  }
  
  const data = docSnap.data();
  const authorizedUsers = data?.authorizedUsers || [];
  
  return NextResponse.json({ authorizedUsers });
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId || !(await isUserAdmin(userId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { email, userIdToAdd } = await req.json();
  if (!email && !userIdToAdd) {
    return NextResponse.json({ error: 'Missing email or userIdToAdd' }, { status: 400 });
  }

  let finalUserIdToAdd = userIdToAdd;
  if (email) {
    try {
      const userRecord = await getAuth().getUserByEmail(email);
      finalUserIdToAdd = userRecord.uid;
    } catch (error) {
      return NextResponse.json({ error: 'User with that email not found' }, { status: 404 });
    }
  }

  if (!finalUserIdToAdd) {
    return NextResponse.json({ error: 'Could not determine user to add' }, { status: 400 });
  }

  const docSnap = await universalLicenseRef.get();
  let authorizedUsers: string[] = [];
  if (docSnap.exists) {
    const data = docSnap.data();
    if (data && Array.isArray(data.authorizedUsers)) {
      authorizedUsers = data.authorizedUsers;
    }
  }

  if (authorizedUsers.includes(finalUserIdToAdd)) {
    return NextResponse.json({ error: 'User already authorized' }, { status: 409 });
  }

  authorizedUsers.push(finalUserIdToAdd);

  await universalLicenseRef.set({ authorizedUsers }, { merge: true });

  return NextResponse.json({ success: true, message: 'User added to universal license' });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId || !(await isUserAdmin(userId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { userIdToRemove } = await req.json();
  if (!userIdToRemove) {
    return NextResponse.json({ error: 'Missing userIdToRemove' }, { status: 400 });
  }

  const docSnap = await universalLicenseRef.get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Universal license not found' }, { status: 404 });
  }
  
  const data = docSnap.data();
  let authorizedUsers = data?.authorizedUsers || [];
  
  if (!authorizedUsers.includes(userIdToRemove)) {
    return NextResponse.json({ error: 'User not found in universal license' }, { status: 404 });
  }
  
  authorizedUsers = authorizedUsers.filter((id: string) => id !== userIdToRemove);
  
  await universalLicenseRef.set({ authorizedUsers }, { merge: true });
  
  return NextResponse.json({ success: true, message: 'User removed from universal license' });
} 