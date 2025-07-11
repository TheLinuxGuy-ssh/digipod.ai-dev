import { db } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string, messageId: string } }) {
  await db.collection('projects').doc(params.id)
    .collection('clientMessages').doc(params.messageId)
    .update({ status: 'sent', sentAt: new Date() });
  return NextResponse.json({ success: true });
} 