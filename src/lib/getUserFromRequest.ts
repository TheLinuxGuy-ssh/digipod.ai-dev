import { getAuth } from './firebaseAdmin';
import { NextRequest } from 'next/server';

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  console.log('Authorization header:', authHeader);
  if (!authHeader) {
    console.log('No authorization header found');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 20) + '...');
  
  try {
    console.log('Attempting to verify Firebase ID token...');
    const decoded = await getAuth().verifyIdToken(token);
    console.log('Token verified successfully, UID:', decoded.uid);
    return decoded.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as { code?: string })?.code || 'No code'
    });
    return null;
  }
} 