import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/firebaseAdmin';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const { payment_id } = await req.json();
  if (!payment_id) return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });

  try {
    // 1. Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(payment_id);
    if (payment.status !== 'captured') {
      return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
    }

    // 2. Get email from payment object
    const email = payment.email || null;

    // 3. Generate unique code
    const code = Math.random().toString(36).slice(2, 10).toUpperCase(); // 8-char code

    // 4. Store in Firestore
    await db.collection('signupCodes').doc(code).set({
      code,
      paymentId: payment_id,
      email,
      used: false,
      createdAt: new Date(),
    });

    // 5. Return code
    return NextResponse.json({ code });
  } catch (err) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
} 