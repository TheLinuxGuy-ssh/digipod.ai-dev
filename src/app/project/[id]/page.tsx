/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-key, react-hooks/exhaustive-deps, prefer-const */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, UserCircleIcon, PaperAirplaneIcon, XMarkIcon, BoltIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

// Add interfaces at the top
interface AiReplyVersion {
  subject: string;
  body: string;
  closing: string;
  signature: string;
  trigger?: string;
  createdAt: string;
  edited?: boolean;
  attachments?: File[];
}

interface Email {
  id: string;
  from: string;
  subject?: string;
  date?: string;
  snippet?: string;
  body: string;
  aiReplies?: AiReplyVersion[];
  aiReplyStatus?: string;
  aiReplySentAt?: string;
  intent?: string;
  threadId?: string;
  createdAt?: string; // Added for sorting
  status?: string; // Added for sent status
  to?: string; // Added for recipient
}

const DEFAULT_PHASES = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];

async function fetchProjectInbox(projectId: string, fromDate?: string, toDate?: string, sender?: string) {
  const user = auth.currentUser;
  if (!user) return { emails: [], gmailError: null };
  const token = await user.getIdToken();
  let url = `/api/gmail/project-inbox?projectId=${projectId}`;
  if (fromDate) url += `&fromDate=${fromDate}`;
  if (toDate) url += `&toDate=${toDate}`;
  if (sender && sender.trim() !== '') url += `&sender=${encodeURIComponent(sender.trim())}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 400) {
      return { emails: [], gmailError: 'Gmail not connected for this user.' };
    }
    return { emails: [], gmailError: 'Failed to load inbox.' };
  }
  const emails = await res.json();
  return { emails, gmailError: null };
}

async function generateAIReply(body: string, tone?: string, template?: string, signature?: string, clientName?: string) {
  const res = await fetch('/api/gemini/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, tone, template, signature, clientName }),
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
function ChatDrawer({ open, onClose, email, onSendUserMessage, chatHistory, loadingAI, onSendToClient, sendingToClient, signatureImage, emailSignature }: {
  open: boolean;
  onClose: () => void;
  email: Email | null;
  onSendUserMessage: (message: string) => void;
  chatHistory: { sender: 'user' | 'ai', text: string }[];
  loadingAI: boolean;
  onSendToClient: (reply: string, clientMessageId: string) => void;
  sendingToClient: boolean;
  signatureImage: string | null;
  emailSignature: string;
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

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md h-full bg-gray-900 shadow-2xl flex flex-col border-l border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="font-bold text-lg text-white">Refine Email Reply</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><XMarkIcon className="h-6 w-6" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '60vh' }}>
        {/* Original email bubble */}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-300" /></div>
          <div className="bg-gray-800 rounded-lg p-3 max-w-xs">
            <div className="font-semibold text-sm mb-1 text-gray-100">{safeDisplay(email.from)}</div>
            <div className="text-xs text-gray-400 mb-1">{safeDisplay(email.date)}</div>
            <div className="text-sm font-medium text-gray-100 mb-1">{safeDisplay(email.subject)}</div>
            <div className="text-sm text-gray-200">{safeDisplay(email.body || email.snippet)}</div>
          </div>
        </div>
        {/* Chat history */}
        {chatHistory.map((msg, idx) => (
          <div key={`${msg.sender}-${idx}`} className={`flex ${msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg text-sm ${msg.sender === 'ai' ? 'bg-blue-900 border border-blue-700 font-mono text-blue-100' : 'bg-gray-700 text-gray-100'}`} style={msg.sender === 'ai' ? { whiteSpace: 'pre-wrap' } : {}}>
              {msg.sender === 'ai' ? (
                <>
                  <div>{renderAIReplyBody(msg.text).body}</div>
                  {/* Always show user's signature (image or text) at the end */}
                  {signatureImage ? (
                    <img src={signatureImage} alt="Signature" className="mt-2 max-h-16" />
                  ) : (
                    <div className="mt-2 whitespace-pre-line text-blue-200 font-semibold">
                      {emailSignature || 'Best regards,\nYour Name'}
                    </div>
                  )}
                </>
              ) : msg.text}
            </div>
          </div>
        ))}
        {/* Loading spinner for AI */}
        {loadingAI && (
          <div className="flex justify-end"><div className="flex items-center gap-2"><Spinner /> <span className="text-xs text-blue-300">AI is typing...</span></div></div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-gray-800 flex flex-col gap-2 bg-gray-900">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none bg-gray-800 text-white placeholder-gray-400"
            style={{ color: 'white' }}
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
            className="bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2 hover:bg-blue-800"
            disabled={!input.trim() || loadingAI}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            Send
          </button>
        </div>
        <button
          className="mt-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2 justify-center"
          disabled={sendingToClient}
          onClick={() => {
            if (email && chatHistory.some(h => h.sender === 'ai')) {
              const lastAI = [...chatHistory].reverse().find(h => h.sender === 'ai');
              if (lastAI) {
                onSendToClient(lastAI.text, String(email.id ?? 'unknown'));
              }
            }
          }}
        >
          <EnvelopeIcon className="h-5 w-5" />
          Send to Client
        </button>
      </div>
    </div>
  );
}

// Utility function to safely display any value (handles Firestore Timestamps, nulls, etc.)
function safeDisplay(val: any): string {
  if (!val) return '';
  if (typeof val === 'object' && val._seconds) {
    return new Date(val._seconds * 1000).toLocaleString();
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

// Add this helper function above the component
function renderAIReplyBody(text: string) {
  try {
    const obj = JSON.parse(text);
    if (typeof obj === 'object') {
      // Join all relevant fields into a plain text email
      const parts = [obj.subject, obj.body, obj.closing, obj.signature].filter(Boolean);
      return { body: parts.join('\n\n'), signature: '' };
    }
  } catch {
    // Not JSON, just return as is
  }
  return { body: text, signature: '' };
}

// Standard fetcher for useSWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProjectDetailPage({ params }: { params: any }) {
  // All filter-related hooks must be at the very top, before any logic or early returns
  const [filterClientEmail, setFilterClientEmail] = useState('');
  const [filteredInbox, setFilteredInbox] = useState<Email[]>([]);
  const [unsureAlert, setUnsureAlert] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  // All other hooks below
  const [emailTone, setEmailTone] = useState('Professional');
  const [emailTemplate, setEmailTemplate] = useState('Default');
  const [emailSignature, setEmailSignature] = useState('Best regards,\nYour Name');
  const toneOptions = ['Professional', 'Friendly', 'Concise', 'Formal', 'Enthusiastic'];
  const templateOptions = ['Default', 'Bullet Points', 'Paragraphs', 'Short & Sweet'];
  const [emailFilterFromDate, setEmailFilterFromDate] = useState<string | undefined>(undefined);
  const [emailFilterToDate, setEmailFilterToDate] = useState<string | undefined>(undefined);
  const [clientNameInput, setClientNameInput] = useState('');
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
  const [authChecking, setAuthChecking] = useState(true);
  const prevPhaseRef = useRef(project?.currentPhase);
  // Ref for always getting the latest client name input value
  const clientNameInputRef = useRef<HTMLInputElement | null>(null);
  // Add gmailError state
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
      setClientNameInput(project.clientName || '');
      setEmailSignature(project.emailSignature || 'Best regards,\nYour Name');
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
    const handler = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('digipod-focus-mode');
        let shouldBeDark = false;
        if (stored === 'on') shouldBeDark = true;
        else if (stored === 'off') shouldBeDark = false;
        else shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (shouldBeDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

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
      if (email.aiReplies && email.id && !lastCountedAIReplies.includes(email.id)) {
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

  useEffect(() => {
    if (project && project.clientMessages) {
      setInbox(project.clientMessages);
    }
  }, [project]);

  // Handler to fetch filtered emails when the filter form is submitted
  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setFilterLoading(true);
    console.log('Filter submit - filterClientEmail:', filterClientEmail);
    console.log('Filter email trimmed and lowercase:', filterClientEmail.trim().toLowerCase());
    console.log('Current inbox length:', inbox.length);
    
    // Save client email to project in Firestore
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ clientEmail: filterClientEmail.trim() }),
      });
      mutate();
    }
    // Fetch filtered inbox from backend
    const res = await fetchProjectInbox(id, emailFilterFromDate, emailFilterToDate, filterClientEmail);
    console.log('Emails fetched:', res.emails?.length || 0);
    
    setInbox(res.emails as Email[]);
    setFilteredInbox(res.emails as Email[]);
    
    if (res.gmailError) {
      setToast(res.gmailError);
      setTimeout(() => setToast(null), 4000);
    } else if ((res.emails as Email[]).length === 0) {
      setToast('No emails found for the selected filters.');
      setTimeout(() => setToast(null), 4000);
    }
    setFilterLoading(false);
  };

  const handleAdvance = async () => {
    setAdvancing(true);
    const res = await fetch(`/api/projects/${id}/phase/next`, { method: 'POST' });
    const data = await res.json();
    // Auto-refresh project and inbox after phase change
    const inboxRes = await fetchProjectInbox(id);
    mutate(); // Re-fetch project and update SWR cache
    setInbox(inboxRes.emails as Email[]);
    setAdvancing(false);
    if (data.success) {
      setToast(`AI: ${data.aiReply || 'Phase advanced!'} (Phase advanced)`);
    } else {
      setToast(`AI: ${data.reason || 'Phase not advanced.'}`);
    }
    setTimeout(() => setToast(null), 5000);
  };

  // New: send user message in chat
  // In handleSendUserMessage and handleOpenChatAndGenerate, always use the latest state values
  const handleSendUserMessage = async (message: string) => {
    setLoadingAIChat(true);
    // Compose conversation history for Gemini
    const conversation = chatHistory
      .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
      .concat([`User: ${message}`])
      .join('\n');
    // Always use the latest state values
    const ai = await generateAIReply(conversation, emailTone, emailTemplate, emailSignature, clientNameInput);
    const newReply = { subject: ai.subject || '', body: ai.body || '', closing: ai.closing || '', signature: ai.signature || '', createdAt: new Date().toISOString() };
    if (chatEmail) {
      setInbox(prev => prev.map(msg => msg.id === chatEmail.id ? { 
        ...msg, 
        aiReplies: [...(msg.aiReplies || []), newReply],
        aiReplyStatus: 'draft' 
      } : msg));
      setChatHistory(prev => [...prev, { sender: 'ai', text: JSON.stringify(newReply) }]);
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
          aiReplies: [...(msg.aiReplies || []), {
            subject: msg.subject || '',
            body: msg.body || '',
            closing: 'Regards,',
            signature: 'John Doe',
            createdAt: new Date().toISOString(),
          }],
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

  // Add at the top of ProjectDetailPage, with other hooks
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  // Add a ref for the hidden file input
  const signatureImageInputRef = useRef<HTMLInputElement | null>(null);

  // Add a handler for image upload
  function handleSignatureImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // 1. Add a handler to open the chat drawer and auto-generate a response for a message
  // 1. Add helper to save AI reply to Firestore
  async function saveAIReplyDraft(projectId: string, messageId: string, aiReply: { subject: string; body: string; closing: string; signature: string; trigger?: string }) {
    await fetch(`/api/projects/${projectId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '', // Not a client message, just a draft
        aiReply,
        parentId: messageId,
      }),
    });
  }

  // 2. Add helper to fetch AI drafts for a thread
  async function fetchAIDrafts(projectId: string, messageId: string) {
    const res = await fetch(`/api/projects/${projectId}/clientMessages?messageId=${messageId}&from=AI`);
    if (!res.ok) return [];
    return await res.json();
  }

  // 3. Update handleOpenChatAndGenerate to persist and fetch drafts
  async function handleOpenChatAndGenerate(msg: Email) {
    setChatEmail(msg);
    setChatDrawerOpen(true);
    setLoadingAIChat(true);
    setChatHistory([]);
    try {
      // 1. Fetch all drafts for this message
      const drafts = await fetchAIDrafts(id, msg.id);
      if (drafts.length > 0) {
        // If drafts exist, show them in the chat drawer
        setChatHistory((drafts || []).map((d: any) => ({
          sender: 'ai',
          text: typeof d.body === 'string' ? d.body : '',
          date: typeof d.createdAt === 'object' && d.createdAt !== null && '_seconds' in d.createdAt ? new Date(d.createdAt._seconds * 1000).toLocaleString() : (typeof d.createdAt === 'string' ? d.createdAt : '')
        })));
      } else {
        // Always use the latest value from the input ref
        const latestClientName = clientNameInputRef.current?.value ?? clientNameInput;
        // If no drafts, generate a new reply, save it, and show it
        // Always use the latest state values
        const ai = await generateAIReply(msg.body, emailTone, emailTemplate, emailSignature, latestClientName);
        await saveAIReplyDraft(id, msg.id, ai);
        const newDrafts = await fetchAIDrafts(id, msg.id);
        setChatHistory((newDrafts || []).map((d: any) => ({
          sender: 'ai',
          text: typeof d.body === 'string' ? d.body : '',
          date: typeof d.createdAt === 'object' && d.createdAt !== null && '_seconds' in d.createdAt ? new Date(d.createdAt._seconds * 1000).toLocaleString() : (typeof d.createdAt === 'string' ? d.createdAt : '')
        })));
      }
    } catch {
      setChatHistory([{ sender: 'ai', text: 'Error generating reply.' }]);
    } finally {
      setLoadingAIChat(false);
    }
  }

  // Handler to update client name in Firestore and local state
  const handleClientNameBlur = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ clientName: clientNameInput }),
    });
    setToast('Client name saved!');
    // Immediately update local state from Firestore to avoid stale values
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const updated = await res.json();
      setClientNameInput(updated.clientName || '');
    }
    mutate();
    setTimeout(() => setToast(null), 2000);
  };

  // Handler to update email signature in Firestore and local state
  const handleEmailSignatureBlur = async () => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ emailSignature }),
    });
    setToast('Signature saved!');
    // Immediately update local state from Firestore to avoid stale values
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const updated = await res.json();
      setEmailSignature(updated.emailSignature || '');
    }
    mutate();
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    setFilterClientEmail(project?.clientEmail || '');
  }, [project?.clientEmail]);

  useEffect(() => {
    if (!project?.clientEmail) {
      setFilteredInbox([]);
    } else {
      setFilteredInbox(
        inbox.filter(email => {
          if (!email.from || !project.clientEmail) return false;
          const match = email.from.match(/<(.+?)>/);
          const sender = match ? match[1] : email.from;
          return sender.trim().toLowerCase().includes(project.clientEmail.trim().toLowerCase());
        })
      );
    }
  }, [inbox, project?.clientEmail]);

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

  console.log('Inbox state:', inbox);
  // Use a separate state for the filter input, and only apply filtering on form submit
  // const [filterClientEmail, setFilterClientEmail] = useState(''); // Moved to top
  // const [filteredInbox, setFilteredInbox] = useState<Email[]>([]); // Moved to top

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
      <div className="max-w-3xl mx-auto mb-16 space-y-12">
        {/* Onboarding tip */}
        <div className="bg-blue-900/80 text-blue-100 rounded-lg p-4 mb-12 text-xs flex items-center gap-3">
          <span className="font-bold">Tip:</span> Use the filters and preferences above to customize your workflow. Hover over any label for more info.
        </div>
        {/* Filters */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-blue-200 mb-3">Client Feed Filters</h2>
          <p className="text-xs text-blue-300 mb-6">Set filters to control which emails are shown below. You can filter by client name, client email, and date.</p>
          <form onSubmit={(e) => { console.log('Form submitted!'); handleFilterSubmit(e); }} className="grid grid-cols-1 gap-6 items-end w-full mb-6 md:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col w-full gap-y-4">
                <label className="text-xs text-blue-200 font-semibold mb-2">Client Name</label>
                <input
                  className="border px-4 h-12 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800 !text-white"
                  placeholder="e.g. John Doe"
                  value={clientNameInput}
                  onChange={e => setClientNameInput(e.target.value)}
                  onBlur={handleClientNameBlur}
                  type="text"
                  ref={clientNameInputRef}
                />
                <span className="text-xs text-blue-400 min-h-[24px]">Enter the client&apos;s name.</span>
              </div>
              <div className="flex flex-col w-full gap-y-4">
                <label className="text-xs text-blue-200 font-semibold mb-2">Client Email Address</label>
                <input
                  className="border px-4 h-12 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800 !text-white"
                  placeholder="e.g. client@email.com"
                  value={filterClientEmail}
                  onChange={e => setFilterClientEmail(e.target.value)}
                  type="text"
                />
                {/* {showSuggestions && senderSuggestions.length > 0 && (
                  <ul className="absolute z-50 bg-gray-800 border border-gray-700 rounded-lg mt-1 w-full max-h-48 overflow-y-auto text-white shadow-lg">
                    {senderSuggestions.filter(s => s.toLowerCase().includes(filterClientEmail.toLowerCase())).map(s => (
                      <li
                        key={s}
                        className="px-4 py-2 hover:bg-blue-700 cursor-pointer"
                        onMouseDown={() => { setFilterClientEmail(s); setShowSuggestions(false); }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )} */}
                <span className="text-xs text-blue-400 min-h-[24px]">Only emails from this address will be shown.</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col w-full gap-y-4">
                <label className="text-xs text-blue-200 font-semibold mb-2">From</label>
                <input
                  type="date"
                  className="border px-3 h-12 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800"
                  value={emailFilterFromDate || ''}
                  onChange={e => setEmailFilterFromDate(e.target.value || undefined)}
                  placeholder="Start date (optional)"
                />
                <span className="text-xs text-blue-400 min-h-[24px]">Show emails from this date onwards.</span>
              </div>
              <div className="flex flex-col w-full gap-y-4">
                <label className="text-xs text-blue-200 font-semibold mb-2">To</label>
                <input
                  type="date"
                  className="border px-3 h-12 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-400 border-gray-700 bg-gray-800"
                  value={emailFilterToDate || ''}
                  onChange={e => setEmailFilterToDate(e.target.value || undefined)}
                  placeholder="End date (optional)"
                />
                <span className="text-xs text-blue-400 min-h-[24px]">Show emails up to this date. Leave blank to show all.</span>
              </div>
            </div>
            <div className="flex flex-col w-full gap-y-4">
              <button
                type="submit"
                disabled={filterLoading}
                onClick={() => console.log('Filter button clicked!')}
                className="h-12 w-full bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow transition-all duration-150 flex items-center justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {filterLoading ? 'Filtering...' : 'Set Filters'}
              </button>
              <span className="min-h-[24px]"></span>
            </div>
          </form>
        </div>
        {/* Mailbox (Inbox) UI for Client Feed */}
        <div className="max-w-3xl mx-auto mb-16 space-y-8">
          
          {filteredInbox.length === 0 && (
            <div className="text-gray-400 text-center py-16 text-base">No client emails found for this project.</div>
          )}
          {filteredInbox.map((msg, idx) => (
            <div key={msg.id || idx} className="bg-white rounded-xl shadow border border-gray-200 mb-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <div className="font-bold text-base text-gray-900">{safeDisplay(msg.subject) || '(No Subject)'}</div>
                  <div className="text-xs text-gray-600 mt-1">{safeDisplay(msg.from)}</div>
                </div>
                <div className="text-xs text-gray-400">{safeDisplay(msg.createdAt)}</div>
              </div>
              <div className="px-6 py-3 text-gray-700 text-sm border-b border-gray-100">
                {msg.aiReplies && msg.aiReplies.length > 0 ? (
                  <div>
                    <div className="font-semibold text-blue-700 mb-1">AI Draft (Pending Approval)</div>
                    <div className="whitespace-pre-line">{msg.aiReplies[0].body}</div>
                    <div className="mt-2 text-xs text-gray-500">{msg.aiReplies[0].signature}</div>
                  </div>
                ) : (
                  safeDisplay(msg.body ? msg.body.slice(0, 120) + (msg.body.length > 120 ? '...' : '') : msg.snippet)
                )}
              </div>
              <div className="flex items-center justify-end px-6 py-3 gap-2">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm"
                  onClick={() => handleOpenChatAndGenerate(msg)}
                >
                  Generate Reply
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Chat Drawer remains as implemented, opens when handleOpenChatAndGenerate is called */}
        {/* Preferences */}
        <div className="mb-16 mt-16">
          <h2 className="text-lg font-bold text-blue-200 mb-3">Email Preferences</h2>
          <p className="text-xs text-blue-300 mb-6">Choose your preferred tone, template, and signature for AI-generated replies. These settings will be used for all new replies.</p>
          <div className="bg-gray-800 rounded-xl p-8 border border-blue-900 flex flex-col md:flex-row gap-12 items-start">
            <div className="flex flex-col gap-4 flex-1">
              <label className="text-xs text-blue-200 font-semibold mb-1">Email Tone</label>
              <select
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-blue-400"
                value={emailTone}
                onChange={e => setEmailTone(e.target.value)}
              >
                {toneOptions.map(tone => <option key={tone} value={tone}>{tone}</option>)}
              </select>
              <span className="text-xs text-blue-400 mt-1">How should your emails sound? (e.g., friendly, professional)</span>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <label className="text-xs text-blue-200 font-semibold mb-1">Email Template</label>
              <select
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-blue-400"
                value={emailTemplate}
                onChange={e => setEmailTemplate(e.target.value)}
              >
                {templateOptions.map(template => <option key={template} value={template}>{template}</option>)}
              </select>
              <span className="text-xs text-blue-400 mt-1">Choose a layout for your replies.</span>
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <label className="text-xs text-blue-200 font-semibold mb-1">Your Email Signature</label>
              <textarea
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-blue-400 min-h-[48px]"
                value={emailSignature}
                onChange={e => setEmailSignature(e.target.value)}
                onBlur={handleEmailSignatureBlur}
                rows={2}
                placeholder="e.g. Best regards, John Doe"
              />
              <span className="text-xs text-blue-400 mt-1">This will appear at the end of your emails.</span>
              <label className="text-xs text-blue-200 font-semibold mt-2">Handwritten Signature (optional)</label>
              <button
                type="button"
                className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded-lg font-semibold shadow-sm mt-1 text-xs"
                onClick={() => signatureImageInputRef.current?.click()}
              >
                Upload Handwritten Signature
              </button>
              <input
                type="file"
                accept="image/*"
                ref={signatureImageInputRef}
                onChange={handleSignatureImageUpload}
                className="hidden"
              />
              <span className="text-xs text-blue-400 mt-1">Add a scanned or photographed signature for a personal touch.</span>
              {signatureImage && (
                <div className="mt-2">
                  <span className="text-xs text-blue-300">Preview:</span>
                  <img src={signatureImage} alt="Signature Preview" className="mt-1 max-h-16 rounded shadow border border-blue-900" />
                </div>
              )}
            </div>
          </div>
        </div>
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
          signatureImage={signatureImage}
          emailSignature={emailSignature}
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