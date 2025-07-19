import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid code' }, { status: 400 });
  }
  const docRef = db.collection('signupCodes').doc(code);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 404 });
  }
  const data = docSnap.data();
  if (!data) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 404 });
  }
  if (data.used) {
    return NextResponse.json({ error: 'License key already used' }, { status: 409 });
  }
  await docRef.update({ used: true, usedAt: new Date() });
  return NextResponse.json({ success: true, email: data.email || null, paymentId: data.paymentId || null });
} 