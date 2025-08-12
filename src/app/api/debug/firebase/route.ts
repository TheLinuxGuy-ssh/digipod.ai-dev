import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projectId = process.env.FIREBASE_PROJECT_ID || null;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'missing';
  const hasPrivateKey = Boolean(process.env.FIREBASE_PRIVATE_KEY);
  return NextResponse.json({ projectId, clientEmail, hasPrivateKey });
} 