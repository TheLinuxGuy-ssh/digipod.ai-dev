'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  // Removed unused profile fields

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        
        // Fetch additional user data from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setDisplayName(userData.name || '');
          // Removed unused profile fields
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save Changes button removed, so no need for handleSave
  
  // Avatar upload is disabled for now

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  if (loading) {
    return <div className="p-8 bg-gray-900 text-white min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8 bg-gray-900 text-white min-h-screen">Please log in to view settings.</div>;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Profile Details</h1>
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>

        <div className="bg-gray-800 p-8 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-400 mb-2">Avatar</label>
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt="Avatar" width={64} height={64} className="rounded-lg" />
                ) : (
                  <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-2xl font-bold">
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  value={user.email || ''}
                  readOnly
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-400 cursor-not-allowed"
                />
              </div>
              {/* Save Changes button removed as requested */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 