"use client";
import React, { useState } from 'react';

interface UniversalLicenseClientProps {
  initialAuthorizedUsers: string[];
  token: string;
}

export default function UniversalLicenseClient({ initialAuthorizedUsers, token }: UniversalLicenseClientProps) {
  const [authorizedUsers, setAuthorizedUsers] = useState<string[]>(initialAuthorizedUsers);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const res = await fetch('/api/admin/universal-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to add user');
    } else {
      setSuccess(data.message || 'User added successfully');
      // Optimistically add user to the list
      // A full refresh or more sophisticated state management might be needed
      setAuthorizedUsers([...authorizedUsers, email]); // This is a simplification
      setEmail('');
    }
  };

  const handleRemoveUser = async (userIdToRemove: string) => {
    setError('');
    setSuccess('');
    
    const res = await fetch('/api/admin/universal-license', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userIdToRemove }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to remove user');
    } else {
      setSuccess(data.message || 'User removed successfully');
      setAuthorizedUsers(authorizedUsers.filter(id => id !== userIdToRemove));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Universal License Management</h1>
      
      {error && <div className="bg-red-500 text-white p-2 mb-4">{error}</div>}
      {success && <div className="bg-green-500 text-white p-2 mb-4">{success}</div>}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add User by Email</h2>
        <form onSubmit={handleAddUser}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="p-2 border rounded mr-2"
            required
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add User</button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Authorized Users</h2>
        <ul>
          {authorizedUsers.map(userId => (
            <li key={userId} className="flex justify-between items-center p-2 border-b">
              <span>{userId}</span>
              <button onClick={() => handleRemoveUser(userId)} className="bg-red-500 text-white p-1 rounded text-sm">Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 