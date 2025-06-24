'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserCircleIcon, PlusIcon, FolderIcon, EnvelopeIcon, CheckCircleIcon, ClockIcon, LockClosedIcon, ServerStackIcon } from '@heroicons/react/24/outline';
import PipAvatar from '@/components/PipAvatar';
import AntiHustleMeter from '@/components/AntiHustleMeter';
import FocusModeToggle from '@/components/FocusModeToggle';

console.log('Firebase config (dashboard):', auth.app.options);

async function fetchProjects() {
  const user = auth.currentUser;
  if (!user) return [];
  const token = await user.getIdToken();
  const res = await fetch('/api/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // Optionally, show a toast or log the error
    return [];
  }
  const data = await res.json();
  // If the backend returns an error object, also return []
  if (!Array.isArray(data)) return [];
  return data;
}

async function createProject(name: string, clientEmail: string) {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, clientEmail }),
  });
  if (!res.ok) {
    // Optionally, show a toast or log the error
    return null;
  }
  const data = await res.json();
  if (!data || !data.id) return null;
  return data;
}

async function fetchGmailUser() {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const res = await fetch('/api/gmail-user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
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
  const [toast, setToast] = useState<string | null>(null);
  const [hoursSaved, setHoursSaved] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [pipAnimate, setPipAnimate] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('onAuthStateChanged (dashboard) fired. User:', user);
      if (!user) {
        // User is not signed in, redirect to signin
        router.push('/signin');
      } else {
        // User is signed in, show dashboard
        setAuthChecking(false);
        // Fetch projects and Gmail user info only after auth
        fetchProjects().then(setProjects);
        fetchGmailUser().then(user => {
          if (user && user.email) {
            setGmailConnected(true);
            setGmailEmail(user.email);
          } else {
            setGmailConnected(false);
            setGmailEmail(null);
          }
        });
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('digipod-hours-saved') || '0', 10);
    setHoursSaved(saved);
    setFocusMode(localStorage.getItem('digipod-focus-mode') === 'on');
    setPipAnimate(true);
    setTimeout(() => setPipAnimate(false), 1200);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const project = await createProject(name, clientEmail);
    if (project && project.id) {
      setProjects([project, ...projects]);
      setName('');
      setClientEmail && setClientEmail('');
      setToast(`Project "${project.name}" created!`);
    } else {
      setToast('Failed to create project. Please try again.');
    }
    setLoading(false);
    setTimeout(() => setToast(null), 2500);
  };

  const handleFetchGmail = async () => {
    setLastChecked('Checking...');
    await fetch('/api/fetch-gmail', { method: 'POST' });
    fetchProjects().then(setProjects);
    setLastChecked(new Date().toLocaleString());
  };

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
      } else {
        setImapStatus('error');
        setImapError(data.error || 'Connection failed');
      }
    } catch (err: any) {
      setImapStatus('error');
      setImapError(err.message || 'Connection failed');
    }
  };

  // Show loading while checking authentication
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

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-gray-50">
      {/* Hero Header */}
      <section className="w-full mb-12" style={{ background: 'linear-gradient(to right, #e6e7fa, #fff, #e6e7fa)' }}>
        <div className="w-full px-20 py-12">
          <div className="flex flex-row items-center justify-between w-full gap-16">
            <div className="flex-1 text-left">
              <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: '#4D55CC' }}>Dashboard</h1>
            </div>
            <div className="flex-1 flex justify-center">
              <PipAvatar hoursSaved={hoursSaved} focusMode={focusMode} animate={pipAnimate} />
            </div>
            <div className="flex-1 flex justify-end">
              <AntiHustleMeter hoursSaved={hoursSaved} />
            </div>
          </div>
        </div>
      </section>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto px-6">
        {/* Project Creation Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-10 border max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: '#4D55CC' }}><PlusIcon className="h-6 w-6" style={{ color: '#4D55CC' }} /> Create a New Project</h2>
          <p className="text-gray-500 mb-6">Start a new project for a client. You can set the client email later.</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              className="border px-4 py-3 rounded-lg w-full shadow-sm focus:ring-2 focus:outline-none"
              placeholder="New project name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="transition text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold shadow-sm disabled:opacity-50 min-w-[120px] justify-center"
              style={{ backgroundColor: '#4D55CC' }}
              disabled={loading}
            >
              <PlusIcon className="h-5 w-5" style={{ color: '#fff' }} />
              {loading ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.isArray(projects) && projects.map((project, idx) => {
            console.log('Project:', project, 'ID:', project.id);
            return (
              <div key={project.id || idx} className="bg-white rounded-2xl shadow-lg p-7 flex flex-col justify-between border hover:shadow-2xl transition group">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderIcon className="h-7 w-7" style={{ color: '#4D55CC' }} />
                    <span className="font-semibold text-xl text-gray-900 truncate">{project.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ background: '#e6e7fa', color: '#4D55CC', border: '1px solid #4D55CC' }}>
                      <ClockIcon className="h-4 w-4" style={{ color: '#4D55CC' }} /> {project.currentPhase}
                    </span>
                    {project.userId && <span className="text-xs text-gray-400 ml-2">Owner: {project.userId.slice(0, 6)}...</span>}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-500 mb-1">Client Email: {project.clientEmail || <span className='italic text-gray-300'>Not set</span>}</div>
                  <div className="text-xs text-gray-400 mb-2">{project.clientMessages?.length ? `Last: ${project.clientMessages[project.clientMessages.length-1].body.slice(0, 40)}...` : 'No messages yet.'}</div>
                </div>
                {project.id ? (
                  <Link href={`/project/${project.id}`} className="mt-4 transition text-white px-4 py-2 rounded-lg text-center font-semibold shadow-sm group-hover:scale-105" style={{ backgroundColor: '#4D55CC' }}>Open Project</Link>
                ) : (
                  <button className="mt-4 px-4 py-2 rounded-lg text-center font-semibold shadow-sm bg-gray-300 text-gray-500 cursor-not-allowed" title="Project ID missing, cannot open">Open Project</button>
                )}
              </div>
            );
          })}
          {Array.isArray(projects) && projects.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-16">
              <div className="mb-4">
                <FolderIcon className="h-12 w-12 mx-auto text-gray-200" />
              </div>
              No projects yet. Create your first project!
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 