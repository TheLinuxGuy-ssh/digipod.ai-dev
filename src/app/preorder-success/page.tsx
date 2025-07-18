'use client';
import { useEffect, useState } from 'react';

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

  if (loading) return <div>Verifying payment...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="thank-you">
      <p style={{ color: 'green' }}>This is a test deployment change.</p>
      <h1>Thank you for your pre-order!</h1>
      <p>Your unique signup code:</p>
      <div className="signup-code" style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>{code}</div>
      <p>Copy this code and use it when signing up.</p>
    </div>
  );
} 