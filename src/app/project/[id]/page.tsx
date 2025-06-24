'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db as clientDb } from '@/lib/firebase';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ClockIcon, EnvelopeIcon, UserCircleIcon, PaperAirplaneIcon, XMarkIcon, SunIcon, MoonIcon, InboxIcon, BoltIcon, ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';

async function fetchProjectInbox(projectId: string) {
  const user = auth.currentUser;
  if (!user) return [];
  const token = await user.getIdToken();
  const res = await fetch(`/api/gmail/project-inbox?projectId=${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
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
function ResponseDialog({ isOpen, onClose, onSend, email }: { isOpen: boolean; onClose: () => void; onSend: (message: string) => void; email: any }) {
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
function ChatDrawer({ open, onClose, email, initialAIReply, onRegenerate, onSendUserMessage, chatHistory, loadingAI, onSendToClient, sendingToClient }: {
  open: boolean;
  onClose: () => void;
  email: any;
  initialAIReply: string;
  onRegenerate: () => void;
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
          <div key={idx} className={`flex ${msg.sender === 'ai' ? 'justify-end' : 'justify-start'}`}>
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
          onClick={() => lastReply && lastReply.text && onSendToClient(lastReply.text, email.id)}
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

export default function ProjectDetailPage({ params }: { params: any }) {
  let id: string;
  if (typeof params?.then === 'function') {
    const unwrapped = React.use(params) as { id: string };
    id = unwrapped.id;
  } else {
    id = params.id;
  }
  const [project, setProject] = useState<any>(null);
  const [advancing, setAdvancing] = useState(false);
  const [inbox, setInbox] = useState<any[]>([]);
  const [aiReplies, setAiReplies] = useState<{ [id: string]: { replyText: string; trigger: string } }>({});
  const [loadingReply, setLoadingReply] = useState<string | null>(null);
  const [clientEmailInput, setClientEmailInput] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showCustomResponse, setShowCustomResponse] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatEmail, setChatEmail] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [loadingAIChat, setLoadingAIChat] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, forceRerender] = useState(0);
  const router = useRouter();
  const [sendingToClient, setSendingToClient] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [phaseAnim, setPhaseAnim] = useState(false);
  const prevPhaseRef = useRef(project?.currentPhase);
  const [unsureAlert, setUnsureAlert] = useState(false);
  // Store the connected Gmail email for display
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  // Poll for Gmail connection and refresh inbox only on transition or client email change
  const prevGmailConnected = useRef(false);
  const prevClientEmail = useRef(project?.clientEmail);
  // Local loading state for just the inbox widget
  const [inboxLoading, setInboxLoading] = useState(false);

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
    if (!id) return;
    // Real-time Firestore listener for project phase and data
    const unsub = onSnapshot(doc(clientDb, 'projects', id), (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() };
        setProject(projectData);
        setClientEmailInput((projectData as any).clientEmail || '');
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id]);

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
        // Persist Gmail connection for the session if connected
        if (connected) {
          setGmailConnected(true);
          setGmailEmail(email);
        } else {
          setGmailConnected(false);
          setGmailEmail(null);
        }
      }
      // Only fetch inbox if Gmail just became connected, or clientEmail changed
      if (
        connected &&
        project?.clientEmail &&
        (!prevGmailConnected.current || prevClientEmail.current !== project.clientEmail)
      ) {
        setLoading(true);
        try {
          const inboxRes = await fetchProjectInbox(project.id);
          setInbox(inboxRes);
        } finally {
          setLoading(false);
        }
      }
      prevGmailConnected.current = connected;
      prevClientEmail.current = project?.clientEmail;
    };
    checkAndFetch();
    interval = setInterval(checkAndFetch, 5000);
    return () => clearInterval(interval);
  }, [project?.id, project?.clientEmail]);

  // Detect phase change and show toast/animation
  useEffect(() => {
    if (!project) return;
    if (prevPhaseRef.current && prevPhaseRef.current !== project.currentPhase) {
      setToast(`Phase advanced to ${project.currentPhase}!`);
      setPhaseAnim(true);
      setTimeout(() => setPhaseAnim(false), 800);
      setTimeout(() => setToast(null), 2500);
    }
    prevPhaseRef.current = project.currentPhase;
  }, [project?.currentPhase]);

  // After fetching inbox, check for unsure intents
  useEffect(() => {
    async function checkUnsure() {
      if (!inbox.length) return setUnsureAlert(false);
      // Fetch intents for all messages (assume backend stores intent in clientMessage or fetch via API)
      const unsure = inbox.some(msg => msg.intent === 'unsure');
      setUnsureAlert(unsure);
    }
    checkUnsure();
  }, [inbox]);

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
    const projectRes = await fetch(`/api/projects/${id}`);
    const inboxRes = await fetchProjectInbox(id);
    setProject(await projectRes.json());
    setInbox(inboxRes);
    setAdvancing(false);
    if (data.success) {
      setToast(`AI: ${data.aiReply || 'Phase advanced!'} (Phase advanced)`);
    } else {
      setToast(`AI: ${data.reason || 'Phase not advanced.'}`);
    }
    setTimeout(() => setToast(null), 5000);
  };

  const handleGenerateReply = async (email: any) => {
    setLoadingReply(email.id);
    const res = await fetch('/api/gemini/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: email.body, clientMessageId: email.id }),
    });
    const data = await res.json();
    setInbox(prev => prev.map(msg => msg.id === email.id ? { ...msg, aiReply: data.replyText, aiReplyStatus: 'draft' } : msg));
    setLoadingReply(null);
  };

  // When client email is set/updated, immediately fetch filtered emails with loader
  const handleClientEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmailInput.trim()) return;
    setUpdatingEmail(true);
    setInboxLoading(true);
    try {
      await updateProjectClientEmail(id, clientEmailInput.trim());
      setProject((prev: any) => prev ? { ...prev, clientEmail: clientEmailInput.trim() } : null);
      // Immediately fetch filtered emails after setting client email
      const newInbox = await fetchProjectInbox(id);
      setInbox(newInbox);
    } catch (err: any) {
      console.error('Failed to update client email:', err);
      setInbox([]); // Clear inbox on error
    } finally {
      setUpdatingEmail(false);
      setInboxLoading(false);
    }
  };

  const handleCustomResponse = (email: any) => {
    setSelectedEmail(email);
    setShowCustomResponse(true);
  };

  const handleSendCustomResponse = (message: string) => {
    if (selectedEmail) {
      setAiReplies(prev => ({ 
        ...prev, 
        [selectedEmail.id]: { 
          replyText: message, 
          trigger: null 
        } 
      }));
    }
  };

  // New: open chat drawer and start with AI reply
  const handleOpenChatDrawer = async (email: any) => {
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
    } catch (err) {
      setToast('Failed to send email');
    } finally {
      setSendingToClient(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!project) return <div className="p-8">Loading...</div>;

  const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
  const phaseIcons = [<ClockIcon className="h-5 w-5" />, <ChatBubbleLeftRightIcon className="h-5 w-5" />, <CheckCircleIcon className="h-5 w-5" />, <CheckCircleIcon className="h-5 w-5" />];

  const toggleDarkMode = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    if (isCurrentlyDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('digipod-dark-mode', 'false');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('digipod-dark-mode', 'true');
    }
    forceRerender(x => x + 1);
  };

  return (
    <div className="min-h-screen font-sans bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white border-b flex items-center px-8 h-16 shadow-sm">
        <button onClick={() => router.back()} className="mr-4 text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeftIcon className="h-5 w-5" /> Back
        </button>
        <h1 className="text-xl font-bold tracking-tight flex-1">{project.name}</h1>
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="h-7 w-7 text-blue-500" />
        </div>
      </header>
      {/* Timeline Stepper */}
      <div className="max-w-3xl mx-auto mt-8 mb-10">
        <div className="flex items-center justify-between">
          {phases.map((phase, idx) => {
            const isActive = project.currentPhase === phase;
            const isCompleted = phases.indexOf(project.currentPhase) > idx;
            return (
              <div key={phase} className="flex-1 flex flex-col items-center relative">
                <motion.div
                  animate={isActive && phaseAnim ? { scale: [1, 1.2, 0.95, 1] } : {}}
                  transition={{ duration: 0.8, times: [0, 0.3, 0.7, 1] }}
                  className={`rounded-full h-10 w-10 flex items-center justify-center mb-2 border-2 ${isActive ? 'bg-blue-600 text-white border-blue-600' : isCompleted ? 'bg-green-100 text-green-700 border-green-400' : 'bg-gray-200 border-gray-300'}`}
                >
                  {phaseIcons[idx]}
                </motion.div>
                <span className={`text-xs font-semibold ${isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-400'}`}>{phase}</span>
                {idx < phases.length - 1 && (
                  <div className="absolute top-5 right-0 w-full h-0.5 bg-gray-200 z-0" style={{ left: '50%', width: '100%' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Project-specific Client Email Inbox */}
      <div className="max-w-3xl mx-auto mb-12">
        {/* Always show client email filter input */}
        <form onSubmit={handleClientEmailUpdate} className="flex gap-2 mb-4 items-center">
          <input
            className="border px-4 py-2 rounded-lg w-full shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none text-gray-900 placeholder-gray-500 border-gray-300"
            placeholder="Client email for this project"
            value={clientEmailInput}
            onChange={e => setClientEmailInput(e.target.value)}
            type="email"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50"
            disabled={updatingEmail}
          >
            {updatingEmail ? 'Updating...' : 'Set Email Filter'}
          </button>
        </form>
        {/* If Gmail is connected, show the connected account */}
        {gmailConnected && gmailEmail && (
          <div className="mb-2 flex items-center gap-2 justify-center text-blue-700 text-sm">
            <EnvelopeIcon className="h-5 w-5 text-blue-400" />
            <span>Connected Gmail: <span className="font-semibold">{gmailEmail}</span></span>
          </div>
        )}
        {/* Show prompt or inbox based on client email presence and Gmail connection */}
        {(!project.clientEmail || !gmailConnected) ? (
          <div className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center font-medium">
            { !project.clientEmail ? 'Set a client email to enable the inbox for this project.' : 'Connect Gmail from the sidebar to enable the inbox.' }
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Client Email Inbox</h2>
            <div className="relative">
              <div className={focusMode ? 'pointer-events-none filter blur-sm select-none transition-all duration-300' : ''}>
                <div className="bg-white rounded-xl shadow-md p-6 border">
                  {inboxLoading && (
                    <div className="w-full h-1 mb-4 bg-blue-100 rounded overflow-hidden">
                      <div className="h-full bg-blue-500 progress-indeterminate w-1/2 rounded" />
                    </div>
                  )}
                  {inbox.length === 0 && !inboxLoading && <div className="text-gray-400">No client emails found for this project.</div>}
                  <div className="space-y-6">
                    {inbox.map(email => {
                      return (
                        <motion.div
                          key={email.id}
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 24 }}
                          transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
                          className="group relative space-y-3 rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl transition-shadow duration-300 p-6 cursor-pointer ring-1 ring-transparent hover:ring-blue-200"
                          style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)' }}
                        >
                          {/* Status badge */}
                          <div className="absolute top-3 right-4 z-10">{statusBadge(email.aiReplyStatus)}</div>
                          {/* Client Email */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-200 via-blue-100 to-blue-400 rounded-full flex items-center justify-center shadow-md">
                                <UserCircleIcon className="h-6 w-6 text-blue-700" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-base text-gray-900">{email.from}</div>
                                <div className="text-xs text-gray-500 font-mono">{new Date(email.date).toLocaleString()}</div>
                              </div>
                              <div className="text-sm font-semibold text-blue-700 mb-1">{email.subject}</div>
                              <div className="text-sm text-gray-700 italic">{email.snippet}</div>
                            </div>
                          </div>
                          {/* Activity Timeline */}
                          <div className="ml-12">
                            <ol className="relative border-l-4 border-blue-200 pl-4">
                              <AnimatePresence>
                                <motion.li
                                  key={email.id + '-received'}
                                  className="mb-6 ml-6 flex items-center"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse">
                                    <InboxIcon className="h-5 w-5 text-white" />
                                  </span>
                                  <div>
                                    <span className="font-semibold text-gray-900">Received</span>
                                    <span className="ml-2 text-xs text-gray-500 font-mono">{new Date(email.date).toLocaleString()}</span>
                                  </div>
                                </motion.li>
                                {email.aiReply && (
                                  <motion.li
                                    key={email.id + '-ai-reply'}
                                    className="mb-6 ml-6 flex items-center"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                  >
                                    <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full border-2 border-white shadow-lg animate-bounce">
                                      <BoltIcon className="h-5 w-5 text-yellow-900" />
                                    </span>
                                    <div>
                                      <span className="font-semibold text-yellow-700">AI Reply {email.aiReplyStatus === 'sent' ? 'Sent' : 'Draft'}</span>
                                      <span className="ml-2 text-xs text-gray-500 font-mono">{email.aiReplyStatus === 'sent' && email.aiReplySentAt ? new Date(email.aiReplySentAt).toLocaleString() : 'Ready'}</span>
                                    </div>
                                  </motion.li>
                                )}
                                {email.aiReplySentAt && (
                                  <motion.li
                                    key={email.id + '-sent'}
                                    className="ml-6 flex items-center"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                  >
                                    <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-white shadow-lg animate-pulse">
                                      <PaperAirplaneIcon className="h-5 w-5 text-white" />
                                    </span>
                                    <div>
                                      <span className="font-semibold text-green-700">Sent to Client</span>
                                      <span className="ml-2 text-xs text-gray-500 font-mono">{new Date(email.aiReplySentAt).toLocaleString()}</span>
                                    </div>
                                  </motion.li>
                                )}
                              </AnimatePresence>
                            </ol>
                          </div>
                          {/* Action buttons */}
                          <div className="flex gap-2 mt-4">
                            <button
                              className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2 justify-center disabled:opacity-50 transition-all duration-150 relative overflow-hidden"
                              onClick={() => handleOpenChatDrawer(email)}
                              title="Generate and refine AI reply for this email"
                            >
                              <span className="absolute left-0 top-0 w-full h-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.15) 0%,transparent 70%)' }} />
                              <ChatBubbleLeftRightIcon className="h-4 w-4 z-10" />
                              <span className="z-10">Generate Reply</span>
                            </button>
                            <button
                              className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-4 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2 justify-center disabled:opacity-50 transition-all duration-150 relative overflow-hidden"
                              disabled={!email.aiReply || email.aiReplyStatus === 'sent' || sendingToClient}
                              onClick={() => sendReplyToClient(email.aiReply, email.id)}
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
                        </motion.div>
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
          onSend={handleSendCustomResponse}
          email={selectedEmail}
        />
        {/* Side Chat Drawer */}
        <ChatDrawer
          open={chatDrawerOpen}
          onClose={() => setChatDrawerOpen(false)}
          email={chatEmail}
          initialAIReply={chatHistory[0]?.text || ''}
          onRegenerate={() => chatEmail && handleOpenChatDrawer(chatEmail)}
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
          <div className="max-w-3xl mx-auto mt-4 mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-900 rounded-lg flex items-center justify-between">
            <span>Some client messages are unclear. Please review and advance the phase manually if needed.</span>
            <button onClick={() => setUnsureAlert(false)} className="ml-4 px-3 py-1 bg-yellow-300 rounded">Dismiss</button>
          </div>
        )}
      </div>
      {/* Main Content: Phase History */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col border">
          <div className="font-semibold mb-3 flex items-center gap-2 text-blue-700"><ClockIcon className="h-5 w-5" /> Phase History</div>
          <ul className="space-y-4">
            {(project.phaseHistory ?? []).map((ph: any, idx: number) => (
              <li key={ph.id} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-green-400'}`}></div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{ph.phase}</div>
                  <div className="text-xs text-gray-400">{new Date(ph.timestamp).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={handleAdvance}
            className="mt-8 bg-yellow-500 hover:bg-yellow-600 transition text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-50"
            disabled={advancing || project.currentPhase === 'DELIVERY'}
          >
            {advancing ? 'Advancing...' : 'Manual Phase Advance'}
          </button>
        </div>
      </div>
    </div>
  );
} 