import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { uid, email, createdAt } = await req.json();
    if (!uid || !email) {
      return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }
    await db.collection('onboard').doc(uid).set({
      email,
      createdAt: createdAt || new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 