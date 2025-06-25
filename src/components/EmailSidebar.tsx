"use client";

import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, CheckCircleIcon, ExclamationCircleIcon, ServerStackIcon, TrashIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, FolderIcon, DocumentTextIcon, DocumentIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import FocusModeToggle from './FocusModeToggle';
import Image from 'next/image';

// Define a type for mailbox
interface Mailbox {
  id: string;
  email: string;
  provider: string;
  status: string;
}

async function fetchMailboxes() {
  const user = auth.currentUser;
  if (!user) return [];
  const token = await user.getIdToken();
  const res = await fetch('/api/mailbox/list', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) return [];
  return res.json();
}

// New removeMailbox using /api/mailbox/disconnect
async function removeMailbox(provider: string, email: string) {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch('/api/mailbox/disconnect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ provider, email })
  });
}

interface EmailSidebarProps {
  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
}

interface GmailUser {
  email: string;
  name?: string;
  gmailConnected: boolean;
}

export default function EmailSidebar({ collapsed = false, setCollapsed }: EmailSidebarProps) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showImapModal, setShowImapModal] = useState(false);
  const [imapForm, setImapForm] = useState({
    email: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    username: '',
    password: '',
  });
  const [imapStatus, setImapStatus] = useState<'idle'|'connecting'|'success'|'error'>('idle');
  const [imapError, setImapError] = useState<string|null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [gmailUser, setGmailUser] = useState<GmailUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refresh = () => fetchMailboxes().then(setMailboxes);
  
  // Check for Gmail OAuth connection
  const checkGmailConnection = async () => {
    const user = auth.currentUser;
    if (!user) {
      setGmailUser(null);
      return;
    }
    const token = await user.getIdToken();
    const res = await fetch('/api/gmail-user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const user = await res.json();
      setGmailUser(user);
    } else {
      setGmailUser(null);
    }
  };

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    refresh();
    checkGmailConnection();
    // Poll for Gmail connection every 5 seconds
    const interval = setInterval(checkGmailConnection, 5000);
    // Load focus mode from localStorage
    setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
    // Listen for localStorage changes (focus mode)
    const handleStorage = () => {
      setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  // Remove Gmail mailbox logic from mailboxes
  const gmailConnected = gmailUser?.gmailConnected;
  const gmailAccount = gmailConnected ? {
    id: 'gmail-oauth',
    email: gmailUser!.email,
    provider: 'gmail',
    status: 'connected',
  } : null;
  const otherAccounts = mailboxes.filter((mb: Mailbox) => mb.provider !== 'gmail');

  const handleImapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setImapForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImapConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setImapStatus('connecting');
    setImapError(null);
    try {
      // TODO: Replace with real userId
      const userId = 'demo-user';
      const res = await fetch('/api/mailbox/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...imapForm, userId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImapStatus('success');
        setShowImapModal(false);
        setImapForm({
          email: '', imapHost: '', imapPort: 993, imapSecure: true,
          smtpHost: '', smtpPort: 465, smtpSecure: true, username: '', password: '',
        });
        refresh();
      } else {
        setImapStatus('error');
        setImapError(data.error || 'Connection failed');
      }
    } catch (err: unknown) {
      setImapStatus('error');
      setImapError((err as Error).message || 'Connection failed');
    }
  };

  // Update handleRemove to use provider and email
  const handleRemove = async (provider: string, email: string) => {
    await removeMailbox(provider, email);
    refresh();
  };

  const handleGmailConnect = async () => {
    const user = auth.currentUser;
    if (!user) {
      // Optionally, show a sign-in prompt
      return;
    }
    window.location.href = `/api/auth/google?uid=${user.uid}`;
  };

  const handleGmailDisconnect = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        // Optionally, show a sign-in prompt
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/gmail/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        setGmailUser(null);
        await checkGmailConnection();
        refresh();
      } else {
        console.error('Failed to disconnect Gmail');
      }
    } catch (err) {
      console.error('Error disconnecting Gmail:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect to signin page
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className={`h-screen bg-gray-100 shadow-xl flex flex-col p-4 gap-4 border-r border-gray-200 transition-all duration-200 relative ${collapsed ? 'w-20' : 'w-72'} min-w-0`} style={{ ...(collapsed ? { transform: 'translateX(-100%)' } : {}) }}>
      {/* Collapse/Expand Button - vertically centered */}
      <button
        className="absolute top-1/2 right-[-18px] z-20 bg-white border border-gray-200 shadow-md rounded-full p-1 flex items-center justify-center transition hover:bg-blue-50"
        style={{ transform: 'translateY(-50%)' }}
        onClick={() => setCollapsed?.(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRightIcon className="h-5 w-5 text-blue-500" /> : <ChevronLeftIcon className="h-5 w-5 text-blue-500" />}
      </button>
      {/* Logo/Product */}
      <div className={`flex items-center justify-center w-full mb-2`}>
        <Image src="/digilogo.png" alt="Digipod Logo" width={180} height={180} />
      </div>
      {/* Delight Widgets */}
      {/* FocusModeToggle moved to bottom */}
      {/* Navigation Section */}
      <nav className={`flex flex-col gap-1 mt-2 ${collapsed ? 'items-center' : ''}`}>
        {!collapsed && <div className="text-xs text-gray-400 font-semibold mb-1 mt-2 pl-1">Navigation</div>}
        <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} font-semibold transition text-sm w-full`} style={{ backgroundColor: '#e6e7fa', color: '#4D55CC' }}>
          <FolderIcon className="h-5 w-5" />
          {!collapsed && 'Projects'}
        </Link>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-400 font-semibold transition text-sm w-full cursor-not-allowed opacity-50`}
          disabled
        >
          <DocumentTextIcon className="h-5 w-5" />
          {!collapsed && 'Signatures'}
          {!collapsed && <LockClosedIcon className="h-4 w-4 ml-auto" />}
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-400 font-semibold transition text-sm w-full cursor-not-allowed opacity-50`}
          disabled
        >
          <DocumentIcon className="h-5 w-5" />
          {!collapsed && 'Proposals'}
          {!collapsed && <LockClosedIcon className="h-4 w-4 ml-auto" />}
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-400 font-semibold transition text-sm w-full cursor-not-allowed opacity-50`}
          disabled
        >
          <DocumentTextIcon className="h-5 w-5" />
          {!collapsed && 'Invoices'}
          {!collapsed && <LockClosedIcon className="h-4 w-4 ml-auto" />}
        </button>
      </nav>
      {/* Email Accounts Section */}
      <nav className={`flex flex-col gap-1 mt-4 ${collapsed ? 'items-center' : ''}`}>
        {!collapsed && <div className="text-xs text-gray-400 font-semibold mb-1 mt-2 pl-1">Email Accounts</div>}
        {!gmailConnected && (
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition text-sm w-full`}
            onClick={handleGmailConnect}
          >
            <EnvelopeIcon className="h-5 w-5" />
            {!collapsed && 'Connect Gmail'}
          </button>
        )}
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 text-blue-700 font-semibold transition text-sm mt-1 w-full ${collapsed ? 'justify-center' : ''}`}
          onClick={() => setShowImapModal(true)}
        >
          <ServerStackIcon className="h-5 w-5" />
          {!collapsed && 'Connect Other'}
        </button>
      </nav>
      {/* Connected Accounts */}
      <div className={`mt-2 flex flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
        {mailboxes.length > 0 && !collapsed && <div className="text-xs text-gray-400 font-semibold mb-1 pl-1">Connected</div>}
        {gmailAccount && (
          <div
            key={gmailAccount.id}
            className={`flex items-center gap-3 shadow-sm border border-gray-100 transition cursor-pointer bg-white hover:bg-blue-50 ${activeId === gmailAccount.id ? 'ring-2 ring-blue-200' : ''} ${collapsed ? 'justify-center p-2 w-12 h-12 rounded-lg' : 'rounded-xl p-3 w-full'}`}
            onClick={() => setActiveId(gmailAccount.id)}
          >
            <EnvelopeIcon className="h-5 w-5 text-red-500" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-700 truncate text-sm">{gmailAccount.email}</div>
                <div className="text-xs text-gray-400">Gmail</div>
              </div>
            )}
            {!collapsed && (
              <div>
                <CheckCircleIcon className="h-4 w-4 text-green-500" title="Connected" />
              </div>
            )}
          </div>
        )}
        {/* Add new Disconnect Gmail button for OAuth Gmail */}
        {gmailConnected && !collapsed && (
          <button
            className="mt-1 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold transition text-sm w-full flex items-center gap-2 justify-center"
            onClick={e => { e.stopPropagation(); handleGmailDisconnect(); }}
          >
            <XMarkIcon className="h-4 w-4 text-red-400" />
            Disconnect Gmail
          </button>
        )}
        {/* Only show IMAP/SMTP mailboxes */}
        {otherAccounts.map(mb => (
          <div
            key={mb.id}
            className={`flex items-center gap-3 shadow-sm border border-gray-100 transition cursor-pointer bg-white hover:bg-blue-50 ${activeId === mb.id ? 'ring-2 ring-blue-200' : ''} ${collapsed ? 'justify-center p-2 w-12 h-12 rounded-lg' : 'rounded-xl p-3 w-full'}`}
            onClick={() => setActiveId(mb.id)}
          >
            <ServerStackIcon className="h-5 w-5 text-blue-400" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-700 truncate text-sm">{mb.email}</div>
                <div className="text-xs text-gray-400">IMAP/SMTP</div>
              </div>
            )}
            {!collapsed && (
              <div>
                {mb.status === 'connected' ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" title="Connected" />
                ) : (
                  <ExclamationCircleIcon className="h-4 w-4 text-red-500" title="Error" />
                )}
              </div>
            )}
            {!collapsed && (
              <button className="ml-2 p-1 rounded hover:bg-red-100" title="Remove" onClick={e => { e.stopPropagation(); handleRemove(mb.provider, mb.email); }}>
                <TrashIcon className="h-4 w-4 text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>
      {/* IMAP/SMTP Modal */}
      {showImapModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center backdrop-blur-sm" onClick={() => setShowImapModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-blue-100" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 p-2 rounded hover:bg-gray-100" onClick={() => setShowImapModal(false)} aria-label="Close">
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
            <div className="font-bold text-lg mb-4 flex items-center gap-2"><ServerStackIcon className="h-6 w-6 text-blue-400" /> Connect Other Email (IMAP/SMTP)</div>
            <form onSubmit={handleImapConnect} className="grid grid-cols-1 gap-3">
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="email" placeholder="Email address" value={imapForm.email} onChange={handleImapChange} required />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="username" placeholder="Username (if different)" value={imapForm.username} onChange={handleImapChange} />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="imapHost" placeholder="IMAP host (e.g. imap.yourdomain.com)" value={imapForm.imapHost} onChange={handleImapChange} required />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="imapPort" type="number" placeholder="IMAP port (993)" value={imapForm.imapPort} onChange={handleImapChange} required />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="imapSecure" checked={imapForm.imapSecure} onChange={handleImapChange} /> IMAP SSL/TLS</label>
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="smtpHost" placeholder="SMTP host (e.g. smtp.yourdomain.com)" value={imapForm.smtpHost} onChange={handleImapChange} required />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="smtpPort" type="number" placeholder="SMTP port (465)" value={imapForm.smtpPort} onChange={handleImapChange} required />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="smtpSecure" checked={imapForm.smtpSecure} onChange={handleImapChange} /> SMTP SSL/TLS</label>
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder-gray-400 text-black" name="password" type="password" placeholder="Password or App Password" value={imapForm.password} onChange={handleImapChange} required />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50" disabled={imapStatus === 'connecting'}>
                {imapStatus === 'connecting' ? 'Connecting...' : imapStatus === 'success' ? 'Connected!' : 'Connect'}
              </button>
              {imapStatus === 'error' && <div className="text-red-600 text-sm">{imapError}</div>}
              {imapStatus === 'success' && <div className="text-green-600 text-sm">Connected successfully!</div>}
            </form>
          </div>
        </div>
      )}
      {/* Profile/Help Section */}
      <div className={`mt-auto pt-6 border-t border-gray-100 flex flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
        <FocusModeToggle focusMode={focusMode} setFocusMode={setFocusMode} />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm">
            {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
             currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
          </div>
          {!collapsed && (
            <div>
              <div className="font-semibold text-sm text-gray-700">
                {currentUser?.displayName || currentUser?.email || 'Your Name'}
              </div>
              <div className="text-xs text-gray-400">
                {currentUser?.email || 'you@email.com'}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex gap-3 mt-2 text-xs text-gray-400">
            <a href="#" className="hover:text-blue-600 transition">Settings</a>
            <a href="#" className="hover:text-blue-600 transition">Help</a>
            <a href="#" className="hover:text-blue-600 transition" onClick={handleLogout}>Logout</a>
          </div>
        )}
      </div>
    </div>
  );
} 