import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { generateAIDraftReply } from '@/lib/gemini';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const emailRef = db.collection('emails').doc(params.id);
  const emailSnap = await emailRef.get();
  if (!emailSnap.exists) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

  const email = emailSnap.data();
  if (!email) {
    return NextResponse.json({ error: 'Email data is undefined' }, { status: 500 });
  }
  const aiDraft = await generateAIDraftReply(email);

  await emailRef.update({
    aiDraft: {
      body: aiDraft,
      createdAt: new Date().toISOString(),
    },
    status: 'drafted',
  });

  return NextResponse.json({ success: true, aiDraft });
} 