/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-key, react-hooks/exhaustive-deps, prefer-const */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, UserCircleIcon, PaperAirplaneIcon, XMarkIcon, InboxIcon, BoltIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

// Add interfaces at the top
interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  aiReply?: string;
  aiReplyStatus?: string;
  aiReplySentAt?: string;
  intent?: string;
}

const DEFAULT_PHASES = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];

async function fetchProjectInbox(projectId: string) {
  const user = auth.currentUser;
  if (!user) return { emails: [], gmailError: null };
  const token = await user.getIdToken();
  const res = await fetch(`/api/gmail/project-inbox?projectId=${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 400) {
      // Gmail not connected or other user error
      return { emails: [], gmailError: 'Gmail not connected for this user.' };
    }
    return { emails: [], gmailError: 'Failed to load inbox.' };
  }
  const emails = await res.json();
  return { emails, gmailError: null };
}

async function generateAIReply(body: string) {
  const res = await fetch('/api/gemini/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  return res.json();
}

async function updateProjectClientEmail(projectId: string, clientEmail: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdToken();
  const res = await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ clientEmail }),
  });
  return res.json();
}

// Add spinner component
function Spinner() {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
  );
}

// Add dialog component for custom responses
function ResponseDialog({ isOpen, onClose, onSend, email }: { isOpen: boolean; onClose: () => void; onSend: (message: string) => void; email: Email | null }) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Custom Response</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">Replying to:</div>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="font-semibold">{email?.from}</div>
            <div className="text-gray-600">{email?.subject}</div>
            <div className="text-gray-500 mt-1">{email?.snippet}</div>
          </div>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your custom response..."
          className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-200 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              handleSend();
            }
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Send Response
          </button>
        </div>
      </div>
    </div>
  );
}

// Side chat drawer for AI conversation
function ChatDrawer({ open, onClose, email, onSendUserMessage, chatHistory, loadingAI, onSendToClient, sendingToClient }: {
  open: boolean;
  onClose: () => void;
  email: Email | null;
  onSendUserMessage: (message: string) => void;
  chatHistory: { sender: 'user' | 'ai', text: string }[];
  loadingAI: boolean;
  onSendToClient: (reply: string, clientMessageId: string) => void;
  sendingToClient: boolean;
}) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) setInput('');
  }, [open, email?.id]);

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, open]);

  if (!open || !email) return null;

  // Find the latest AI or user message to send
  const lastReply = [...chatHistory].reverse().find(msg => msg.sender === 'ai' || msg.sender === 'user');

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-bold text-lg">Refine Email Reply</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original email bubble */}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500" /></div>
          <div className="bg-gray-50 rounded-lg p-3 max-w-xs">
            <div className="font-semibold text-sm mb-1 text-gray-900">{email.from}</div>
            <div className="text-xs text-gray-700 mb-1">{email.date}</div>
            <div className="text-sm font-medium text-gray-900 mb-1">{email.subject}</div>
            <div className="text-sm text-gray-900">{email.body || email.snippet}</div>
          </div>
        </div>
        {/* Chat history */}
        {chatHistory.map((msg, idx) => (
          <div key={`${msg.sender}-${idx}`} className={`flex ${msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg text-sm text-gray-900 ${msg.sender === 'ai' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {/* Loading spinner for AI */}
        {loadingAI && (
          <div className="flex justify-end"><div className="flex items-center gap-2"><Spinner /> <span className="text-xs text-blue-600">AI is typing...</span></div></div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            placeholder="Ask for changes to the reply (e.g., 'make it more professional', 'add pricing details')"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                onSendUserMessage(input.trim());
                setInput('');
              }
            }}
            disabled={loadingAI}
          />
          <button
            onClick={() => { if (input.trim()) { onSendUserMessage(input.trim()); setInput(''); } }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
            disabled={!input.trim() || loadingAI}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            Send
          </button>
        </div>
        <button
          className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2 justify-center"
          disabled={!lastReply || !lastReply.text || sendingToClient}
          onClick={() => lastReply && lastReply.text && onSendToClient(lastReply.text, String(email.id ?? 'unknown'))}
        >
          <EnvelopeIcon className="h-5 w-5" />
          Send to Client
        </button>
      </div>
    </div>
  );
}

const statusBadge = (status: string) => {
  if (status === 'sent') return (
    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-400 to-green-600 text-white shadow-md flex items-center gap-1 border border-green-500">
      <CheckCircleIcon className="h-4 w-4" /> Sent
    </span>
  );
  if (status === 'draft') return (
    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 shadow-md flex items-center gap-1 border border-yellow-400">
      <BoltIcon className="h-4 w-4" /> Draft
    </span>
  );
  return null;
};

const fetcher = async (url: string) => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return await res.json();
};

export default function ProjectDetailPage({ params }: { params: any }) {
  let id: string;
  if (typeof params?.then === 'function') {
    const unwrapped = React.use(params) as { id: string };
    id = unwrapped.id;
  } else {
    id = params.id;
  }
  const { data: project, mutate } = useSWR(`/api/projects/${id}`, fetcher, { revalidateOnFocus: false });
  const [advancing, setAdvancing] = useState(false);
  const [inbox, setInbox] = useState<Email[]>([]);
  const [clientEmailInput, setClientEmailInput] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [showCustomResponse, setShowCustomResponse] = useState(false);
  const [selectedEmail] = useState<Email | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatEmail, setChatEmail] = useState<Email | null>(null);
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [loadingAIChat, setLoadingAIChat] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, forceRerender] = useState(0);
  const router = useRouter();
  const [sendingToClient, setSendingToClient] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const prevPhaseRef = useRef(project?.currentPhase);
  const [unsureAlert, setUnsureAlert] = useState(false);
  // Store the connected Gmail email for display
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  // Poll for Gmail connection and refresh inbox only on transition or client email change
  const prevGmailConnected = useRef(false);
  const prevClientEmail = useRef(project?.clientEmail);
  // Local loading state for just the inbox widget
  const [inboxLoading, setInboxLoading] = useState(false);
  // Add gmailError state
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [editPhasesOpen, setEditPhasesOpen] = useState(false);
  const [phasesDraft, setPhasesDraft] = useState<string[]>([]);
  const [phasesError, setPhasesError] = useState<string | null>(null);
  const [advancePaid, setAdvancePaid] = useState<number>(project?.advancePaid ?? 0);
  const [totalAmount, setTotalAmount] = useState<number>(project?.totalAmount ?? 0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'complete'>(project?.paymentStatus ?? 'pending');
  const amountLeft = Math.max((totalAmount || 0) - (advancePaid || 0), 0);
  const [paymentDueDate, setPaymentDueDate] = useState<string | null>(project?.paymentDueDate ?? null);
  useEffect(() => {
    setAdvancePaid(project?.advancePaid ?? 0);
    setTotalAmount(project?.totalAmount ?? 0);
    setPaymentStatus(project?.paymentStatus ?? 'pending');
    setPaymentDueDate(project?.paymentDueDate ?? null);
  }, [project]);

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // User is not signed in, redirect to signin
        router.push('/signin');
      } else {
        // User is signed in, show project page
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (project) {
      setClientEmailInput(project.clientEmail || '');
    }
  }, [project]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('digipod-dark-mode');
      let shouldBeDark = false;
      if (stored === 'true') shouldBeDark = true;
      else if (stored === 'false') shouldBeDark = false;
      else shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (shouldBeDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      forceRerender(x => x + 1);
    }
  }, []);

  useEffect(() => {
    setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
    const handler = () => setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Poll for Gmail connection and refresh inbox only on transition or client email change
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkAndFetch = async () => {
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
      let connected = gmailConnected;
      let email = gmailEmail;
      if (res.ok) {
        const userData = await res.json();
        connected = !!userData.email;
        email = userData.email || null;
        if (connected) {
          setGmailConnected(true);
          setGmailEmail(email);
        } else {
          setGmailConnected(false);
          setGmailEmail(null);
        }
      }
      if (
        connected &&
        project?.clientEmail &&
        (!prevGmailConnected.current || prevClientEmail.current !== project.clientEmail)
      ) {
        setInboxLoading(true);
        try {
          const inboxRes = await fetchProjectInbox(project.id);
          setInbox(inboxRes.emails as Email[]);
          setGmailError(inboxRes.gmailError);
        } finally {
          setInboxLoading(false);
        }
      }
      prevGmailConnected.current = connected;
      prevClientEmail.current = project?.clientEmail;
    };
    checkAndFetch();
    interval = setInterval(checkAndFetch, 5000);
    return () => clearInterval(interval);
  }, [project?.id, project?.clientEmail, gmailConnected, gmailEmail]);

  // Detect phase change and show toast/animation
  useEffect(() => {
    if (!project) return;
    if (prevPhaseRef.current && prevPhaseRef.current !== project.currentPhase) {
      setToast(`Phase advanced to ${project.currentPhase}!`);
      setTimeout(() => setToast(null), 2500);
    }
    prevPhaseRef.current = project.currentPhase;
  }, [project]);

  // After fetching inbox, check for unsure intents
  useEffect(() => {
    async function checkUnsure() {
      if (!inbox.length) return setUnsureAlert(false);
      const unsure = inbox.some(msg => msg.intent === 'unsure');
      setUnsureAlert(unsure);
    }
    checkUnsure();
  }, [inbox, project]);

  // Track and increment hours saved for new AI replies and phase advances
  useEffect(() => {
    if (!project) return;
    // --- PHASE ADVANCE ---
    const lastCountedPhase = localStorage.getItem('digipod-last-phase') || '';
    if (project.currentPhase && project.currentPhase !== lastCountedPhase) {
      // Only increment if this is not the initial load
      if (lastCountedPhase) {
        const saved = parseInt(localStorage.getItem('digipod-hours-saved') || '0', 10);
        localStorage.setItem('digipod-hours-saved', String(saved + 1));
        window.dispatchEvent(new Event('storage'));
      }
      localStorage.setItem('digipod-last-phase', project.currentPhase);
    }
  }, [project?.currentPhase]);

  useEffect(() => {
    if (!inbox.length) return;
    // --- AI REPLIES ---
    const lastCountedAIReplies = JSON.parse(localStorage.getItem('digipod-last-ai-replies') || '[]');
    const newAIReplyIds: string[] = [];
    for (const email of inbox) {
      if (email.aiReply && email.id && !lastCountedAIReplies.includes(email.id)) {
        newAIReplyIds.push(email.id);
      }
    }
    if (newAIReplyIds.length > 0) {
      const saved = parseInt(localStorage.getItem('digipod-hours-saved') || '0', 10);
      localStorage.setItem('digipod-hours-saved', String(saved + newAIReplyIds.length));
      window.dispatchEvent(new Event('storage'));
      localStorage.setItem('digipod-last-ai-replies', JSON.stringify([...lastCountedAIReplies, ...newAIReplyIds]));
    }
  }, [inbox]);

  const handleAdvance = async () => {
    setAdvancing(true);
    const res = await fetch(`/api/projects/${id}/phase/next`, { method: 'POST' });
    const data = await res.json();
    // Auto-refresh project and inbox after phase change
    const inboxRes = await fetchProjectInbox(id);
    mutate(); // Re-fetch project and update SWR cache
    setInbox(inboxRes.emails as Email[]);
    setGmailError(inboxRes.gmailError);
    setAdvancing(false);
    if (data.success) {
      setToast(`AI: ${data.aiReply || 'Phase advanced!'} (Phase advanced)`);
    } else {
      setToast(`AI: ${data.reason || 'Phase not advanced.'}`);
    }
    setTimeout(() => setToast(null), 5000);
  };

  // When client email is set/updated, immediately fetch filtered emails with loader
  const handleClientEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmailInput.trim()) return;
    setUpdatingEmail(true);
    setInboxLoading(true);
    try {
      await updateProjectClientEmail(id, clientEmailInput.trim());
      mutate(); // Re-fetch project and update SWR cache
      // Immediately fetch filtered emails after setting client email
      const newInbox = await fetchProjectInbox(id);
      setInbox(newInbox.emails as Email[]);
      setGmailError(newInbox.gmailError);
    } catch {
      setToast('Failed to update client email');
    } finally {
      setUpdatingEmail(false);
      setInboxLoading(false);
    }
  };

  // New: open chat drawer and start with AI reply
  const handleOpenChatDrawer = async (email: Email) => {
    setChatEmail(email);
    setChatDrawerOpen(true);
    setChatHistory([]);
    setLoadingAIChat(true);
    // Get initial AI reply
    const ai = await generateAIReply(email.body);
    const initialReply = ai.replyText;
    setChatHistory([{ sender: 'ai', text: initialReply }]);
    // Save the initial reply to the email object
    setInbox(prev => prev.map(msg => msg.id === email.id ? { 
      ...msg, 
      aiReply: initialReply, 
      aiReplyStatus: 'draft' 
    } : msg));
    setLoadingAIChat(false);
  };

  // New: send user message in chat
  const handleSendUserMessage = async (message: string) => {
    setChatHistory(prev => [...prev, { sender: 'user', text: message }]);
    setLoadingAIChat(true);
    // Compose conversation history for Gemini
    const conversation = chatHistory
      .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
      .concat([`User: ${message}`])
      .join('\n');
    const ai = await generateAIReply(conversation);
    const newReply = ai.replyText;
    setChatHistory(prev => [...prev, { sender: 'ai', text: newReply }]);
    // Update the email object with the latest reply
    if (chatEmail) {
      setInbox(prev => prev.map(msg => msg.id === chatEmail.id ? { 
        ...msg, 
        aiReply: newReply, 
        aiReplyStatus: 'draft' 
      } : msg));
    }
    setLoadingAIChat(false);
  };

  // Send reply to client for a ClientMessage
  const sendReplyToClient = async (reply: string, clientMessageId: string) => {
    if (!project?.id || !reply || !clientMessageId) return;
    setSendingToClient(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setToast('Authentication required');
        return;
      }
      const token = await user.getIdToken();
      console.log('FETCH-GMAIL ENDPOINT HIT');
      const res = await fetch('/api/gmail/send-reply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectId: project.id, replyText: reply }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInbox(prev => prev.map(msg => msg.id === clientMessageId ? { 
          ...msg, 
          aiReply: reply,
          aiReplyStatus: 'sent', 
          aiReplySentAt: new Date().toISOString() 
        } : msg));
        setToast('Reply sent to client!');
      } else {
        setToast(data.error || 'Failed to send email');
      }
    } catch {
      setToast('Failed to send email');
    } finally {
      setSendingToClient(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  async function handlePaymentUpdate() {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const newStatus = amountLeft === 0 && totalAmount > 0 ? 'complete' : 'pending';
    setPaymentStatus(newStatus);
    const res = await fetch(`/api/projects/${project?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ advancePaid, totalAmount, paymentDueDate }),
    });
    if (res.ok) {
      mutate();
      if (newStatus === 'complete') {
        setToast('Payment complete! Advancing phase...');
      }
    } else {
      setToast('Failed to update payment info');
    }
  }

  // Payment Due Reminder logic
  let paymentDueReminder: React.ReactNode = null;
  if (paymentStatus !== 'complete' && paymentDueDate) {
    const due = new Date(paymentDueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3 && diffDays >= 0) {
      paymentDueReminder = (
        <div className="mb-4 p-3 rounded-lg bg-yellow-900 text-yellow-200 border border-yellow-700 font-semibold flex items-center gap-2 animate-pulse">
          <BoltIcon className="h-5 w-5 text-yellow-300" />
          Payment due in {diffDays} day{diffDays !== 1 ? 's' : ''} ({due.toLocaleDateString()})
        </div>
      );
    } else if (diffDays < 0) {
      paymentDueReminder = (
        <div className="mb-4 p-3 rounded-lg bg-red-900 text-red-200 border border-red-700 font-semibold flex items-center gap-2 animate-pulse">
          <BoltIcon className="h-5 w-5 text-red-300" />
          Payment was due on {due.toLocaleDateString()}!
        </div>
      );
    }
  }

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

  if (typeof project === 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) return <div className="p-8">Project not found.</div>;

  const phases = project?.phases && project.phases.length > 0 ? project.phases : DEFAULT_PHASES;
  const phaseIcons = [<ClockIcon className="h-5 w-5" />, <ChatBubbleLeftRightIcon className="h-5 w-5" />, <CheckCircleIcon className="h-5 w-5" />, <CheckCircleIcon className="h-5 w-5" />];

  return (
    <div className="min-h-screen font-sans bg-gray-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 flex items-center px-8 h-16 shadow-sm">
        <button onClick={() => router.back()} className="mr-4 text-blue-300 hover:underline flex items-center gap-1">
          <ArrowLeftIcon className="h-5 w-5" /> Back
        </button>
        <h1 className="text-xl font-bold tracking-tight flex-1 text-white">{project.name}</h1>
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="h-7 w-7 text-blue-400" />
        </div>
      </header>
      {/* Timeline Stepper */}
      <AnimatePresence>
        <motion.div
          key={project.currentPhase}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="max-w-3xl mx-auto mt-8 mb-10"
        >
          <div className="flex items-center justify-between gap-2">
            {phases.map((phase: string, idx: number) => {
              const isActive = project.currentPhase === phase;
              const isCompleted = phases.indexOf(project.currentPhase) > idx;
              return (
                <div key={`${phase}-${idx}`} className="flex-1 flex flex-col items-center relative">
                  <motion.div
                    layout
                    animate={isActive ? { scale: 1.18, boxShadow: '0 0 12px 2px #3b82f6, 0 0 32px 2px #6366f1' } : { scale: 1, boxShadow: 'none' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={`rounded-full h-16 w-16 flex items-center justify-center mb-2 border-4 transition-all duration-700 ${isActive ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/30' : isCompleted ? 'bg-green-900 text-green-300 border-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                    style={{ zIndex: isActive ? 10 : 1 }}
                  >
                    {phaseIcons[idx]}
                  </motion.div>
                  <span className={`text-base font-bold tracking-wide uppercase ${isActive ? 'text-blue-200 drop-shadow-lg' : isCompleted ? 'text-green-300' : 'text-gray-500'}`}>{phase}</span>
                  {idx < phases.length - 1 && (
                    <div className="absolute top-8 right-0 w-full h-1 bg-gradient-to-r from-blue-400/30 to-gray-700 z-0" style={{ left: '50%', width: '100%' }} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Project-specific Client Email Inbox */}
      <div className="max-w-3xl mx-auto mb-12">
        {/* Always show client email filter input */}
        <form onSubmit={handleClientEmailUpdate} className="flex gap-2 mb-4 items-center">
          <input
            className="border px-4 py-2 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800 !text-white"
            placeholder="Client email for this project"
            value={clientEmailInput}
            onChange={e => setClientEmailInput(e.target.value)}
            type="email"
          />
          <button
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 transition text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50"
            disabled={updatingEmail}
          >
            {updatingEmail ? 'Updating...' : 'Set Email Filter'}
          </button>
        </form>
        {/* Show prompt or inbox based on client email presence and Gmail connection */}
        {(!project.clientEmail || !gmailConnected) ? (
          <div className="text-yellow-200 bg-yellow-900 border border-yellow-700 rounded-lg p-4 text-center font-medium">
            { !project.clientEmail ? 'Set a client email to enable the inbox for this project.' : 'Connect Gmail from the sidebar to enable the inbox.' }
          </div>
        ) : gmailError ? (
          <div className="text-red-200 bg-red-900 border border-red-700 rounded-lg p-4 text-center font-medium">
            {gmailError}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-white">Client Email Inbox</h2>
            <div className="relative">
              {inboxLoading && (
                <div className="w-full mb-4 flex flex-col items-center justify-center">
                  <div className="w-full h-1 bg-blue-900 rounded overflow-hidden mb-2">
                    <div className="h-full bg-blue-500 progress-indeterminate w-1/2 rounded" />
                  </div>
                  <span className="text-blue-300 text-sm font-medium animate-pulse">Checking for updates...</span>
                </div>
              )}
              <div className={focusMode ? 'pointer-events-none filter blur-sm select-none transition-all duration-300' : ''}>
                <div className="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
                  {/* inboxLoading progress bar moved above */}
                  {inbox.length === 0 && !inboxLoading && <div className="text-gray-500">No client emails found for this project.</div>}
                  <div className="space-y-6">
                    {inbox.map((email, idx) => {
                      return (
                        <div
                          key={`${email.id}-${idx}`}
                          className="group relative space-y-3 rounded-2xl border border-gray-700 shadow-lg hover:shadow-2xl transition-shadow duration-300 p-6 cursor-pointer ring-1 ring-transparent hover:ring-blue-800 bg-gray-900"
                          style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)' }}
                        >
                          {/* Status badge */}
                          <div className="absolute top-3 right-4 z-10">{statusBadge(email.aiReplyStatus ?? '')}</div>
                          {/* Client Email */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                                <UserCircleIcon className="h-6 w-6 text-blue-300" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-base text-white">{email.from}</div>
                                <div className="text-xs text-gray-400 font-mono">{new Date(email.date).toLocaleString()}</div>
                              </div>
                              <div className="text-sm font-semibold text-blue-300 mb-1">{email.subject}</div>
                              <div className="text-sm text-gray-300 italic">{email.snippet}</div>
                            </div>
                          </div>
                          {/* Activity Timeline */}
                          <div className="ml-12">
                            <ol className="relative border-l-4 border-blue-900 pl-4">
                              <li
                                  className="mb-6 ml-6 flex items-center"
                                >
                                  <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-800 to-blue-900 rounded-full border-2 border-gray-900 shadow-lg animate-pulse">
                                    <InboxIcon className="h-5 w-5 text-white" />
                                  </span>
                                  <div>
                                    <span className="font-semibold text-white">Received</span>
                                    <span className="ml-2 text-xs text-gray-400 font-mono">{new Date(email.date).toLocaleString()}</span>
                                  </div>
                              </li>
                                {email.aiReply && (
                                <li
                                    className="mb-6 ml-6 flex items-center"
                                  >
                                    <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-700 to-yellow-900 rounded-full border-2 border-gray-900 shadow-lg animate-bounce">
                                      <BoltIcon className="h-5 w-5 text-yellow-200" />
                                    </span>
                                    <div>
                                      <span className="font-semibold text-yellow-200">AI Reply {email.aiReplyStatus === 'sent' ? 'Sent' : 'Draft'}</span>
                                      <span className="ml-2 text-xs text-gray-400 font-mono">{email.aiReplyStatus === 'sent' && email.aiReplySentAt ? new Date(email.aiReplySentAt).toLocaleString() : 'Ready'}</span>
                                    </div>
                                </li>
                                )}
                                {email.aiReplySentAt && (
                                <li
                                    className="ml-6 flex items-center"
                                  >
                                    <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-800 to-green-900 rounded-full border-2 border-gray-900 shadow-lg animate-pulse">
                                      <PaperAirplaneIcon className="h-5 w-5 text-white" />
                                    </span>
                                    <div>
                                      <span className="font-semibold text-green-200">Sent to Client</span>
                                      <span className="ml-2 text-xs text-gray-400 font-mono">{new Date(email.aiReplySentAt).toLocaleString()}</span>
                                    </div>
                                </li>
                                )}
                            </ol>
                          </div>
                          {/* Action buttons */}
                          <div className="flex gap-2 mt-4">
                            <button
                              className="bg-gradient-to-r from-yellow-700 to-yellow-900 hover:from-yellow-800 hover:to-yellow-900 text-white px-4 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2 justify-center disabled:opacity-50 transition-all duration-150 relative overflow-hidden"
                              onClick={() => handleOpenChatDrawer(email)}
                              title="Generate and refine AI reply for this email"
                            >
                              <span className="absolute left-0 top-0 w-full h-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.10) 0%,transparent 70%)' }} />
                              <ChatBubbleLeftRightIcon className="h-4 w-4 z-10" />
                              <span className="z-10">Generate Reply</span>
                            </button>
                            <button
                              className="bg-gradient-to-r from-green-800 to-green-900 hover:from-green-900 hover:to-green-900 text-white px-4 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2 justify-center disabled:opacity-50 transition-all duration-150 relative overflow-hidden"
                              disabled={!email.aiReply || email.aiReplyStatus === 'sent' || sendingToClient}
                              onClick={() =>
                                email && typeof email.id === 'string'
                                  ? sendReplyToClient(email.aiReply ?? '', email.id ?? 'unknown')
                                  : undefined
                              }
                              title={!email.aiReply ? 'No AI reply yet' : email.aiReplyStatus === 'sent' ? 'Already sent' : sendingToClient ? 'Sending...' : ''}
                            >
                              <span className="absolute left-0 top-0 w-full h-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.10) 0%,transparent 70%)' }} />
                              <EnvelopeIcon className="h-5 w-5 z-10" />
                              {email.aiReplyStatus === 'sent' ? (
                                <span className="flex items-center gap-1 z-10"><CheckCircleIcon className="h-4 w-4 text-green-200" /> Sent</span>
                              ) : sendingToClient ? (
                                <span className="flex items-center gap-1 z-10"><Spinner /> Sending...</span>
                              ) : 'Send to Client'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Custom Response Dialog */}
        <ResponseDialog
          isOpen={showCustomResponse}
          onClose={() => setShowCustomResponse(false)}
          onSend={handleSendUserMessage}
          email={selectedEmail}
        />
        {/* Side Chat Drawer */}
        <ChatDrawer
          open={chatDrawerOpen}
          onClose={() => setChatDrawerOpen(false)}
          email={chatEmail}
          onSendUserMessage={handleSendUserMessage}
          chatHistory={chatHistory}
          loadingAI={loadingAIChat}
          onSendToClient={sendReplyToClient}
          sendingToClient={sendingToClient}
        />
        {toast && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {toast}
          </div>
        )}
        {unsureAlert && (
          <div className="max-w-3xl mx-auto mt-4 mb-4 p-4 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded-lg flex items-center justify-between">
            <span>Some client messages are unclear. Please review and advance the phase manually if needed.</span>
            <button onClick={() => setUnsureAlert(false)} className="ml-4 px-3 py-1 bg-yellow-700 rounded">Dismiss</button>
          </div>
        )}
      </div>
      {/* Payment Status Section */}
      <div className="max-w-3xl mx-auto mt-8 mb-8">
        <div className="bg-gray-900/90 rounded-xl shadow-md p-6 border border-blue-900 mb-6">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
            Payment Status
            {paymentStatus === 'complete' ? (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-400 to-green-600 text-white shadow-md border border-green-500">Paid in Full</span>
            ) : (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 shadow-md border border-yellow-400">Pending</span>
            )}
          </h2>
          {paymentDueReminder}
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-blue-200 mb-1">Total Amount</label>
              <input
                type="number"
                min={0}
                className="w-full border px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800"
                value={totalAmount}
                onChange={e => setTotalAmount(Number(e.target.value))}
                placeholder="Total project amount"
              />
            </div>
            <div className="flex-1">
              <label className="block text-blue-200 mb-1">Advance Paid</label>
              <input
                type="number"
                min={0}
                className="w-full border px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800"
                value={advancePaid}
                onChange={e => setAdvancePaid(Number(e.target.value))}
                placeholder="Advance received"
              />
            </div>
            <div className="flex-1">
              <label className="block text-blue-200 mb-1">Amount Left</label>
              <input
                type="number"
                className="w-full border px-4 py-2 rounded-lg shadow-sm text-white border-gray-700 bg-gray-800 cursor-not-allowed opacity-70"
                value={amountLeft}
                readOnly
                tabIndex={-1}
                aria-readonly
              />
            </div>
            <div className="flex-1">
              <label className="block text-blue-200 mb-1">Payment Due Date</label>
              <input
                type="date"
                className="w-full border px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800"
                value={paymentDueDate ? paymentDueDate.slice(0, 10) : ''}
                onChange={e => setPaymentDueDate(e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50 mt-6"
                onClick={handlePaymentUpdate}
                disabled={paymentStatus === 'complete' || (advancePaid < 0 || totalAmount < 0 || advancePaid > totalAmount)}
                title={advancePaid > totalAmount ? 'Advance cannot exceed Total' : ''}
              >
                {paymentStatus === 'complete' ? 'Paid' : 'Save Payment'}
              </button>
            </div>
          </div>
          {advancePaid > totalAmount && (
            <div className="text-yellow-300 mt-2 text-sm">Advance cannot exceed Total Amount.</div>
          )}
        </div>
      </div>
      {/* Main Content: Phase History */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-900 rounded-xl shadow-md p-6 flex flex-col border border-gray-700">
          <div className="font-semibold mb-3 flex items-center gap-2 text-blue-300"><ClockIcon className="h-5 w-5" /> Phase History</div>
          <ul className="space-y-4">
            {(project.phaseHistory ?? []).map((ph: { id: string; phase: string; timestamp: string | Date }, idx: number) => (
              <li key={`${ph.id}-${idx}`} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-green-400'}`}></div>
                <div>
                  <div className="font-semibold text-sm text-white">{ph.phase}</div>
                  <div className="text-xs text-gray-400">{new Date(ph.timestamp).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={handleAdvance}
            className="mt-8 bg-yellow-700 hover:bg-yellow-800 transition text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50"
            disabled={advancing || project.currentPhase === 'DELIVERY'}
          >
            {advancing ? 'Advancing...' : 'Manual Phase Advance'}
          </button>
        </div>
      </div>
      {editPhasesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md border border-blue-900 relative">
            <button className="absolute top-3 right-3 p-2 rounded hover:bg-gray-800" onClick={() => setEditPhasesOpen(false)} aria-label="Close">
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
            <h3 className="text-lg font-bold mb-4 text-blue-200">Edit Project Phases</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (phasesDraft.length < 1 || phasesDraft.length > 6 || phasesDraft.some(p => !p.trim())) {
                setPhasesError('Enter 1-6 non-empty phases.');
                return;
              }
              setPhasesError(null);
              const user = auth.currentUser;
              if (!user) return;
              const token = await user.getIdToken();
              const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phases: phasesDraft }),
              });
              if (res.ok) {
                mutate(); // Re-fetch project and update SWR cache
                setEditPhasesOpen(false);
              } else {
                setPhasesError('Failed to update phases.');
              }
            }}>
              <div className="space-y-2 mb-4">
                {phasesDraft.map((phase, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border px-3 py-2 rounded bg-gray-800 text-white border-gray-700"
                      value={phase}
                      onChange={e => {
                        const arr = [...phasesDraft];
                        arr[idx] = e.target.value;
                        setPhasesDraft(arr);
                      }}
                      maxLength={32}
                      required
                    />
                    <button type="button" className="text-red-400 hover:text-red-600" onClick={() => setPhasesDraft(phasesDraft.filter((_, i) => i !== idx))} disabled={phasesDraft.length <= 1}>&times;</button>
                  </div>
                ))}
                {phasesDraft.length < 6 && (
                  <button type="button" className="text-xs text-blue-300 hover:underline" onClick={() => setPhasesDraft([...phasesDraft, ''])}>+ Add Phase</button>
                )}
              </div>
              {phasesError && <div className="text-red-400 mb-2 text-sm">{phasesError}</div>}
              <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold mt-2">Save Phases</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 