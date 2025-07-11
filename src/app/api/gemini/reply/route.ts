import { NextRequest, NextResponse } from 'next/server';
import { getGeminiReply } from '@/lib/gemini';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { body, tone, template, signature, clientName } = await req.json();
  if (!body) return NextResponse.json({ error: 'Missing body' }, { status: 400 });
  const ai = await getGeminiReply({ message: body, tone, template, signature, clientName });
  return NextResponse.json(ai);
} 