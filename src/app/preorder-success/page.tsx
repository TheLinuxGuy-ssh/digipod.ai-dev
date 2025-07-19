'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PreorderSuccessPage() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment_id = urlParams.get('payment_id');
    if (!payment_id) {
      setError('No payment ID found.');
      setLoading(false);
      return;
    }
    fetch('/api/verify-razorpay-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.code) setCode(data.code);
        else setError(data.error || 'Unknown error');
      })
      .catch(() => setError('Server error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 to-yellow-50">
      <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
        <div className="text-lg font-semibold text-gray-700">Verifying payment...</div>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-100 to-yellow-50">
      <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-red-400 mb-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        <div className="text-lg font-semibold text-red-600">Error: {error}</div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 to-yellow-50 px-2">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center border border-purple-100">
        <div className="bg-green-100 rounded-full p-3 mb-4">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Thank you for your pre-order!</h1>
        <p className="text-gray-600 mb-4 text-center">Your payment was successful. Here is your unique signup code:</p>
        <div className="signup-code bg-gray-100 rounded-lg px-6 py-4 mb-4 text-2xl font-mono font-bold tracking-widest text-purple-700 shadow-inner select-all">{code}</div>
        <p className="text-gray-500 text-center mb-4">Copy this code and use it when signing up.</p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link 
            href={`/signup?code=${code}`} 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition text-center"
          >
            Use Key
          </Link>
          <Link 
            href="/" 
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition text-center"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 