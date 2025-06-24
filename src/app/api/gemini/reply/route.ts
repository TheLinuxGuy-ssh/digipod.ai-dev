import { NextRequest, NextResponse } from 'next/server';
import { getGeminiReply } from '@/lib/gemini';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { body } = await req.json();
  if (!body) return NextResponse.json({ error: 'Missing body' }, { status: 400 });
  const prompt = `You're Digipod AI. Classify this client message and generate a polite, on-brand reply.\n\nInput: "${body}"\n\nOutput:\n{\n  \"replyText\": \"...\",\n  \"trigger\": \"client_approved\" | \"client_left_feedback\" | null\n}`;
  const ai = await getGeminiReply(prompt);
  return NextResponse.json({ replyText: ai.replyText, trigger: ai.trigger });
} 