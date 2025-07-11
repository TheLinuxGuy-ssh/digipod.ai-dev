'use client';

import Link from 'next/link';
import { UserCircleIcon, FolderIcon, EnvelopeIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';

export default function GmailSidebar() {
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    const checkGmail = async () => {
      const user = auth.currentUser;
      if (!user) {
        setGmailConnected(false);
        setGmailEmail(null);
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/gmail-user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setGmailConnected(false);
        setGmailEmail(null);
        return;
      }
      const userData = await res.json();
      if (userData && userData.email) {
        setGmailConnected(true);
        setGmailEmail(userData.email);
      } else {
        setGmailConnected(false);
        setGmailEmail(null);
      }
    };
    checkGmail();
  }, []);

  const handleFetchGmail = async () => {
    setLastChecked('Checking...');
    await fetch('/api/fetch-gmail', { method: 'POST' });
    setLastChecked(new Date().toLocaleString());
  };

  return (
    <aside className="w-64 bg-white border-r flex flex-col items-center py-8 shadow-sm min-h-screen">
      <div className="flex items-center gap-2 mb-8">
        <FolderIcon className="h-8 w-8 text-blue-600" />
        <span className="text-2xl font-bold tracking-tight text-blue-700">Digipod</span>
      </div>
      <nav className="flex flex-col gap-4 w-full px-6">
        <Link href="/dashboard" className="text-blue-600 font-medium bg-blue-50 rounded px-3 py-2 flex items-center gap-2">
          <FolderIcon className="h-5 w-5" /> Projects
        </Link>
      </nav>
      <div className="flex-1" />
      <div className="mb-4 w-full px-6">
        {!gmailConnected && (
          <a
            href="/api/auth/google"
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold shadow-sm w-full transition bg-blue-600 text-white hover:bg-blue-700"
          >
            <EnvelopeIcon className="h-5 w-5" />
            Connect Google Calendar
          </a>
        )}
        {gmailConnected && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold shadow-sm w-full bg-green-100 text-green-700">
            <EnvelopeIcon className="h-5 w-5" />
            {gmailEmail}
            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-1" />
          </div>
        )}
        {gmailConnected && (
          <button
            onClick={handleFetchGmail}
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg font-semibold shadow-sm w-full bg-yellow-500 text-white hover:bg-yellow-600 transition"
          >
            <ClockIcon className="h-5 w-5" />
            Fetch New Emails Now
          </button>
        )}
        {lastChecked && (
          <div className="text-xs text-gray-500 mt-2 text-center">Last checked: {lastChecked}</div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <UserCircleIcon className="h-8 w-8 text-gray-400" />
        <span className="text-gray-600 font-medium">Your Name</span>
      </div>
    </aside>
  );
} 