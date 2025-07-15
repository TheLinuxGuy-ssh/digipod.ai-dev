import DashboardClient from './DashboardClient';

// Server component: fetch summary data and pass to client
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  // Get auth token from cookies (adjust if you use a different auth method)
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  let summary = null;
  if (token) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) summary = await res.json();
  }
  return <DashboardClient summary={summary} />;
} 