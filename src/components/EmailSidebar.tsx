"use client";

import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, CheckCircleIcon, ExclamationCircleIcon, ServerStackIcon, TrashIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, FolderIcon, DocumentTextIcon, DocumentIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import FocusModeToggle from './FocusModeToggle';
import Image from 'next/image';
import ReactDOM from 'react-dom';

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
  const connectGmailBtnRef = React.useRef<HTMLButtonElement>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

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

  // Helper to update popup position
  const updatePopupPos = React.useCallback(() => {
    if (!gmailConnected && !collapsed && connectGmailBtnRef.current) {
      const rect = connectGmailBtnRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.top + 2,
        left: rect.left + (collapsed ? 60 : 288),
      });
    } else {
      setPopupPos(null);
    }
  }, [gmailConnected, collapsed]);

  // Update on mount, scroll, resize, and dependency change
  useEffect(() => {
    updatePopupPos();
    const handleResize = () => updatePopupPos();
    window.addEventListener('resize', handleResize);
    const scrollEl = sidebarScrollRef.current;
    if (scrollEl) scrollEl.addEventListener('scroll', updatePopupPos);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (scrollEl) scrollEl.removeEventListener('scroll', updatePopupPos);
    };
  }, [updatePopupPos]);

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

  // Add a handler for Gmail-only OAuth
  const handleGoogleConnect = async () => {
    const user = auth.currentUser;
    if (!user) return;
    window.location.href = `/api/auth/google?uid=${user.uid}`;
  };

  return (
    <div className={`h-screen bg-gray-900 shadow-xl flex flex-col p-0 border-r border-gray-800 transition-all duration-200 relative z-40 ${collapsed ? 'w-20' : 'w-72'} min-w-0`} style={{ maxHeight: '100vh', overflow: 'visible', borderLeft: '4px solid #232946' }}>
      {/* Main scrollable area: logo + nav + accounts */}
      <div ref={sidebarScrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col p-4 gap-4" style={{ maxHeight: 'calc(100vh - 170px)' }}>
        {/* Collapse/Expand Button - vertically centered */}
        <button
          className="absolute top-1/2 right-[-18px] z-20 bg-gray-800 border border-gray-700 shadow-md rounded-full p-1 flex items-center justify-center transition hover:bg-gray-700"
          style={{ transform: 'translateY(-50%)' }}
          onClick={() => setCollapsed?.(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon className="h-5 w-5 text-blue-400" /> : <ChevronLeftIcon className="h-5 w-5 text-blue-400" />}
        </button>
        {/* Logo/Product */}
        <div className={`flex items-center justify-center w-full mb-2`} style={{ paddingLeft: collapsed ? 0 : 12 }}>
          <Image src="/digilogo.png" alt="Digipod Logo" width={180} height={180} />
        </div>
        {/* Navigation Section */}
        <nav className={`flex flex-col gap-1 mt-2 ${collapsed ? 'items-center' : ''}`}>
          {!collapsed && <div className="text-xs text-gray-400 font-semibold mb-1 mt-2 pl-1">Navigation</div>}
          <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} font-semibold transition text-sm w-full bg-gray-800 text-blue-200 hover:bg-gray-700`}>
            <FolderIcon className="h-5 w-5" />
            {!collapsed && 'Projects'}
          </Link>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-500 font-semibold transition text-sm w-full cursor-not-allowed opacity-50 bg-gray-800`}
            disabled
          >
            <LockClosedIcon className="h-5 w-5" />
            {!collapsed && 'Payments'}
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-500 font-semibold transition text-sm w-full cursor-not-allowed opacity-50 bg-gray-800`}
            disabled
          >
            <LockClosedIcon className="h-5 w-5" />
            {!collapsed && 'Leads'}
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-500 font-semibold transition text-sm w-full cursor-not-allowed opacity-50 bg-gray-800`}
            disabled
          >
            <DocumentTextIcon className="h-5 w-5" />
            {!collapsed && 'Signatures'}
            {!collapsed && <LockClosedIcon className="h-4 w-4 ml-auto" />}
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-500 font-semibold transition text-sm w-full cursor-not-allowed opacity-50 bg-gray-800`}
            disabled
          >
            <DocumentIcon className="h-5 w-5" />
            {!collapsed && 'Proposals'}
            {!collapsed && <LockClosedIcon className="h-4 w-4 ml-auto" />}
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} text-gray-500 font-semibold transition text-sm w-full cursor-not-allowed opacity-50 bg-gray-800`}
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
          {/* Only show Connect Google button if not connected */}
          {!gmailConnected && (
            <div className="relative w-full flex flex-col items-center">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''} bg-gray-800 hover:bg-gray-700 text-blue-300 font-semibold transition text-sm w-full`}
                onClick={handleGoogleConnect}
              >
                <EnvelopeIcon className="h-5 w-5" />
                {!collapsed && 'Connect Google'}
              </button>
            </div>
          )}
          {/* Connect Other button always visible */}
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-900 hover:bg-gray-700 text-blue-200 font-semibold transition text-sm mt-1 w-full ${collapsed ? 'justify-center' : ''} bg-gray-800`}
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
              className={`flex items-center gap-3 shadow-sm border border-gray-800 transition cursor-pointer bg-gray-800 hover:bg-gray-700 ${activeId === gmailAccount.id ? 'ring-2 ring-blue-400' : ''} ${collapsed ? 'justify-center p-2 w-12 h-12 rounded-lg' : 'rounded-xl p-3 w-full'}`}
              onClick={() => setActiveId(gmailAccount.id)}
            >
              <EnvelopeIcon className="h-5 w-5 text-red-400" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-blue-100 truncate text-sm">{gmailAccount.email}</div>
                  <div className="text-xs text-gray-400">Gmail</div>
                </div>
              )}
              {!collapsed && (
                <div>
                  <CheckCircleIcon className="h-4 w-4 text-green-400" title="Connected" />
                </div>
              )}
            </div>
          )}
          {/* Add new Disconnect Gmail button for OAuth Gmail */}
          {gmailConnected && !collapsed && (
            <button
              className="mt-1 px-3 py-2 rounded-lg bg-red-900 hover:bg-red-700 text-red-200 font-semibold transition text-sm w-full flex items-center gap-2 justify-center"
              onClick={e => { e.stopPropagation(); handleGmailDisconnect(); }}
            >
              <XMarkIcon className="h-4 w-4 text-red-300" />
              Disconnect Google Calendar
            </button>
          )}
          {/* Only show IMAP/SMTP mailboxes */}
          {otherAccounts.map(mb => (
            <div
              key={mb.id}
              className={`flex items-center gap-3 shadow-sm border border-gray-800 transition cursor-pointer bg-gray-800 hover:bg-gray-700 ${activeId === mb.id ? 'ring-2 ring-blue-400' : ''} ${collapsed ? 'justify-center p-2 w-12 h-12 rounded-lg' : 'rounded-xl p-3 w-full'}`}
              onClick={() => setActiveId(mb.id)}
            >
              <ServerStackIcon className="h-5 w-5 text-blue-300" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-blue-100 truncate text-sm">{mb.email}</div>
                  <div className="text-xs text-gray-400">IMAP/SMTP</div>
                </div>
              )}
              {!collapsed && (
                <div>
                  {mb.status === 'connected' ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-400" title="Connected" />
                  ) : (
                    <ExclamationCircleIcon className="h-4 w-4 text-red-400" title="Error" />
                  )}
                </div>
              )}
              {!collapsed && (
                <button className="ml-2 p-1 rounded hover:bg-red-900" title="Remove" onClick={e => { e.stopPropagation(); handleRemove(mb.provider, mb.email); }}>
                  <TrashIcon className="h-4 w-4 text-red-300" />
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Centered FocusModeToggle - moved inside scrollable area */}
        <div className="flex flex-col justify-center items-center mt-4">
          <FocusModeToggle focusMode={focusMode} setFocusMode={setFocusMode} />
        </div>
      </div>
      {/* IMAP/SMTP Modal */}
      {showImapModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center backdrop-blur-sm" onClick={() => setShowImapModal(false)}>
          <div className="bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-blue-900" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 p-2 rounded hover:bg-gray-800" onClick={() => setShowImapModal(false)} aria-label="Close">
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
            <div className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-200"><ServerStackIcon className="h-6 w-6 text-blue-300" /> Connect Other Email (IMAP/SMTP)</div>
            <form onSubmit={handleImapConnect} className="grid grid-cols-1 gap-3">
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="email" placeholder="Email address" value={imapForm.email} onChange={handleImapChange} required />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="username" placeholder="Username (if different)" value={imapForm.username} onChange={handleImapChange} />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="imapHost" placeholder="IMAP host (e.g. imap.yourdomain.com)" value={imapForm.imapHost} onChange={handleImapChange} required />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="imapPort" type="number" placeholder="IMAP port (993)" value={imapForm.imapPort} onChange={handleImapChange} required />
              <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" name="imapSecure" checked={imapForm.imapSecure} onChange={handleImapChange} /> IMAP SSL/TLS</label>
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="smtpHost" placeholder="SMTP host (e.g. smtp.yourdomain.com)" value={imapForm.smtpHost} onChange={handleImapChange} required />
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="smtpPort" type="number" placeholder="SMTP port (465)" value={imapForm.smtpPort} onChange={handleImapChange} required />
              <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" name="smtpSecure" checked={imapForm.smtpSecure} onChange={handleImapChange} /> SMTP SSL/TLS</label>
              <input className="border px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-400 text-black bg-gray-100 border-gray-700" name="password" type="password" placeholder="Password or App Password" value={imapForm.password} onChange={handleImapChange} required />
              <button type="submit" className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50" disabled={imapStatus === 'connecting'}>
                {imapStatus === 'connecting' ? 'Connecting...' : imapStatus === 'success' ? 'Connected!' : 'Connect'}
              </button>
              {imapStatus === 'error' && <div className="text-red-400 text-sm">{imapError}</div>}
              {imapStatus === 'success' && <div className="text-green-400 text-sm">Connected successfully!</div>}
            </form>
          </div>
        </div>
      )}
      {/* Overlay popup outside sidebar */}
      {(!gmailConnected && !collapsed && popupPos && typeof window !== 'undefined') && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            zIndex: 9999,
            pointerEvents: 'auto',
            minWidth: '80px',
          }}
          className="bg-red-500/30 backdrop-blur-md shadow-xl rounded-lg px-1 py-0.5 text-[10px] text-white font-semibold animate-fade-in flex items-center gap-1"
        >
          <span className="text-blue-500"><EnvelopeIcon className="h-4 w-4" /></span>
          <span className="whitespace-pre-line text-center">Start by connecting<br />your Gmail</span>
          <span className="ml-2 text-blue-400" style={{ fontSize: 24, lineHeight: 1 }}>&#8592;</span>
        </div>,
        document.body
      )}
      {/* Profile/Help Section - sticky at bottom */}
      <div className={`sticky bottom-0 bg-gray-900 pt-6 border-t border-gray-800 flex flex-col gap-2 ${collapsed ? 'items-center' : ''}`} style={{ zIndex: 10 }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-900 flex items-center justify-center font-bold text-blue-200 text-sm">
            {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
             currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
          </div>
          {!collapsed && (
            <div>
              <div className="font-semibold text-sm text-blue-100">
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
            <a href="#" className="hover:text-blue-400 transition">Settings</a>
            <a href="#" className="hover:text-blue-400 transition">Help</a>
            <a href="#" className="hover:text-blue-400 transition" onClick={handleLogout}>Logout</a>
          </div>
        )}
        {/* Privacy Policy link */}
        {!collapsed && (
          <a
            href="/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs text-blue-400 hover:underline text-center"
          >
            Privacy Policy
          </a>
        )}
      </div>
    </div>
  );
} 