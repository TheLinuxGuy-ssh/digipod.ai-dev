'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Image from 'next/image';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();

  // Check if user is already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is already signed in, show sign out option
        setAuthChecking(false);
      } else {
        // User is not signed in, show signup form
        setAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Pre-fill signup code from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      setSignupCode(codeFromUrl.toUpperCase());
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Check code using API
      const redeemRes = await fetch('/api/redeem-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: signupCode.trim().toUpperCase() }),
      });
      const redeemData = await redeemRes.json();
      if (!redeemData.success) {
        setError(redeemData.error || 'Invalid or already used signup code.');
        setLoading(false);
        return;
      }
      // 2. Proceed with Firebase Auth signup
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // 3. Post to onboard collection for analytics
      await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          createdAt: user.metadata.creationTime || new Date().toISOString(),
        }),
      });
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If user is signed in, show sign out button
  if (auth.currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center">
          <p className="mb-4 text-gray-700 font-semibold">You are already signed in as <span className="text-blue-600">{auth.currentUser.email}</span>.</p>
          <button
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition"
            onClick={async () => { await signOut(auth); router.refresh(); }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-900 shadow-xl rounded-xl p-8 w-full max-w-md border border-blue-900">
        <div className="flex justify-center mb-6">
          <Image src="/digilogo.png" alt="Digipod Logo" width={120} height={40} />
        </div>
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="email"
            className="border px-4 py-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-gray-800 text-white placeholder-gray-400 border-gray-700"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="border px-4 py-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-gray-800 text-white placeholder-gray-400 border-gray-700"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="text"
            className="border px-4 py-3 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-gray-800 text-white placeholder-gray-400 border-gray-700"
            placeholder="Signup Code"
            value={signupCode}
            onChange={e => setSignupCode(e.target.value)}
            required
            maxLength={16}
            style={{ textTransform: 'uppercase', letterSpacing: 2 }}
          />
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 transition text-white px-6 py-3 rounded-lg font-semibold shadow-sm disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <div className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{' '}
          <a href="/signin" className="text-blue-400 hover:underline font-semibold">Sign in</a>
        </div>
      </div>
    </div>
  );
} 