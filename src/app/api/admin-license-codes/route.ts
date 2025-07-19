import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  const snap = await db.collection('signupCodes').orderBy('createdAt', 'desc').get();
  const codes = snap.docs.map(doc => {
    const data = doc.data();
    return {
      code: data.code,
      paymentId: data.paymentId || null,
      email: data.email || null,
      used: !!data.used,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
      usedAt: data.usedAt ? (data.usedAt.toDate ? data.usedAt.toDate() : data.usedAt) : null,
    };
  });
  return NextResponse.json({ codes });
} 