import { cookies } from 'next/headers';
import UniversalLicenseClient from './UniversalLicenseClient';

async function getAuthorizedUsers(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/universal-license`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.authorizedUsers;
}

export default async function UniversalLicensePage() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return <div>Unauthorized</div>;
  }
  
  const authorizedUsers = await getAuthorizedUsers(token);
  
  return <UniversalLicenseClient initialAuthorizedUsers={authorizedUsers} token={token} />;
} 