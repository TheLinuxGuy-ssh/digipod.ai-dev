import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    // Save token to token.txt in the project root
    const tokenPath = path.join(process.cwd(), 'token.txt');
    fs.writeFileSync(tokenPath, token);
    
    console.log('Token saved to token.txt for debugging');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
} 