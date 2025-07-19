import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/firebaseAdmin';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function isRazorpayError(err: unknown): err is { error: { description: string } } {
  if (
    typeof err === 'object' &&
    err !== null &&
    'error' in err
  ) {
    const errorObj = (err as { error: unknown }).error;
    if (
      typeof errorObj === 'object' &&
      errorObj !== null &&
      'description' in errorObj &&
      typeof (errorObj as { description: unknown }).description === 'string'
    ) {
      return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // Debug: Check environment variables
    console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
    console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
    
    const { payment_id } = await req.json();
    if (!payment_id || typeof payment_id !== 'string' || !payment_id.startsWith('pay_')) {
      return NextResponse.json({ error: 'Invalid or missing payment_id' }, { status: 400 });
    }

    // Check if a code already exists for this payment_id
    const existing = await db.collection('signupCodes').where('paymentId', '==', payment_id).limit(1).get();
    if (!existing.empty) {
      const doc = existing.docs[0].data();
      return NextResponse.json({ code: doc.code });
    }

    // 1. Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(payment_id);
    console.log('Payment status:', payment.status);
    console.log('Full payment object:', JSON.stringify(payment, null, 2));
    
    // If payment is authorized but not captured, try to capture it
    if (payment.status === 'authorized' && !payment.captured) {
      console.log('Attempting to capture authorized payment...');
      console.log('Capture params:', { payment_id, amount: payment.amount, currency: payment.currency });
      try {
        await razorpay.payments.capture(payment_id, payment.amount, payment.currency);
        console.log('Payment captured successfully');
        // Fetch the updated payment object
        const updatedPayment = await razorpay.payments.fetch(payment_id);
        if (updatedPayment.status === 'captured') {
          console.log('Payment status updated to captured');
        } else {
          console.log('Payment still not captured after manual capture attempt');
          return NextResponse.json({ error: 'Payment not captured' }, { status: 400 });
        }
      } catch (captureError: unknown) {
        // If error is 'operation is in progress', poll for status
        let errDesc = '';
        if (isRazorpayError(captureError)) {
          errDesc = captureError.error.description;
        }
        if (errDesc.includes('operation is in progress')) {
          console.log('Capture operation in progress, polling for status...');
          let captured = false;
          for (let i = 0; i < 3; i++) {
            await new Promise(res => setTimeout(res, 2000)); // wait 2 seconds
            const updatedPayment = await razorpay.payments.fetch(payment_id);
            console.log(`Polling attempt ${i + 1}: status =`, updatedPayment.status);
            if (updatedPayment.status === 'captured') {
              console.log('Payment status updated to captured after polling');
              captured = true;
              break;
            }
          }
          if (!captured) {
            return NextResponse.json({ error: 'Payment not captured after polling' }, { status: 400 });
          }
        } else {
          // Other errors
          console.error('Failed to capture payment:', JSON.stringify(captureError, null, 2));
          return NextResponse.json({ error: 'Payment not captured', details: captureError }, { status: 400 });
        }
      }
    } else if (payment.status !== 'captured') {
      console.log('Payment not captured. Status:', payment.status);
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
  } catch (err: unknown) {
    // Log only the error message in production
    console.error('Razorpay verification error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
} 