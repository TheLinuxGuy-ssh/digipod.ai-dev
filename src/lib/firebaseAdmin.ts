import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
if (process.env.FIREBASE_PRIVATE_KEY) {
  const pk = process.env.FIREBASE_PRIVATE_KEY;
  console.log('FIREBASE_PRIVATE_KEY length:', pk.length);
  console.log('FIREBASE_PRIVATE_KEY starts with:', pk.slice(0, 30));
  console.log('FIREBASE_PRIVATE_KEY ends with:', pk.slice(-30));
} else {
  console.log('FIREBASE_PRIVATE_KEY is not set!');
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export { getAuth };
export const db = getFirestore(); 