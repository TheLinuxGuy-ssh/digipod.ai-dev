'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import PipAvatar from '@/components/PipAvatar';
import AntiHustleMeter from '@/components/AntiHustleMeter';

console.log('Firebase config (dashboard):', auth.app.options);

interface Project {
  id: string;
  name: string;
  clientEmail?: string;
  userId: string;
  currentPhase: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  phaseHistory?: { id: string; phase: string; timestamp: string | Date }[];
  clientMessages?: { id: string; body: string; from: string; createdAt: string | Date }[];
}

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hoursSaved, setHoursSaved] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [, forceRerender] = useState(0);
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
        fetchGmailUser().then((user: { email?: string, gmailConnected?: boolean } | null) => {
          if (user && user.email && user.gmailConnected) {
            setToast(`Gmail connected: ${user.email}`);
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
  }, []);

  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 3000); // 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  useEffect(() => {
    // Listen for theme change event to force re-render
    const handler = () => forceRerender(v => v + 1);
    window.addEventListener('digipod-theme-change', handler);
    return () => window.removeEventListener('digipod-theme-change', handler);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const project = await createProject(name, clientEmail);
    if (project && project.id) {
      setProjects([project, ...projects]);
      setName('');
      setClientEmail('');
      setToast(`Project "${project.name}" created!`);
    } else {
      setToast('Failed to create project. Please try again.');
    }
    setLoading(false);
    setTimeout(() => setToast(null), 2500);
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
    <main className="flex-1 flex flex-col min-h-screen bg-white relative overflow-x-hidden">
      {/* Animated shimmer overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ backgroundSize: '200% 100%' }} />
      {/* Hero Header */}
      <section className="w-full mb-12 relative z-10" style={{ background: 'linear-gradient(to right, #e6e7fa, #fff, #e6e7fa)' }}>
        <div className="w-full px-20 py-12">
          <div className="flex flex-row items-center justify-between w-full gap-16">
            <div className="flex-1 text-left">
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-purple-500 to-blue-400 drop-shadow-lg">Dashboard</h1>
              <p className="text-lg text-gray-500 font-medium">Welcome back, creative rebel. Your anti-hustle HQ awaits.</p>
            </div>
            <div className="flex-1 flex justify-center items-center">
              {/* Floating Pip Avatar */}
              <div className="animate-float drop-shadow-xl">
                <PipAvatar hoursSaved={hoursSaved} focusMode={focusMode} />
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <AntiHustleMeter hoursSaved={hoursSaved} />
            </div>
          </div>
        </div>
      </section>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto px-6">
        {/* Project Creation Card */}
        <div className="bg-white/80 rounded-2xl shadow-2xl p-10 mb-10 border border-blue-100 max-w-2xl mx-auto backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-200/60 group cursor-pointer">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-blue-700 group-hover:text-purple-600 transition-colors"><span className="animate-pulse"><PlusIcon className="h-6 w-6" /></span> Create a New Project</h2>
          <p className="text-gray-500 mb-6">Start a new project for a client. You can set the client email later.</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              className="border px-4 py-3 rounded-lg w-full shadow-sm focus:ring-2 focus:outline-none bg-white/70 border-gray-200"
              placeholder="New project name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="transition text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold shadow-lg disabled:opacity-50 min-w-[120px] justify-center bg-gradient-to-r from-blue-600 to-purple-500 hover:from-purple-500 hover:to-blue-600 focus:ring-2 focus:ring-blue-300 focus:outline-none active:scale-95"
              disabled={loading}
            >
              <PlusIcon className="h-5 w-5" style={{ color: '#fff', transition: 'color 0.2s' }} />
              {loading ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Array.isArray(projects) && projects.map((project, idx) => (
            <div key={project.id || idx} className="bg-white/80 rounded-2xl shadow-xl p-8 border border-blue-100 backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-200/60 group cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <FolderIcon className="h-6 w-6 text-blue-400 group-hover:text-purple-500 transition-colors animate-float-slow" />
                <span className="font-semibold text-lg text-blue-900 group-hover:text-purple-600 transition-colors">{project.name}</span>
              </div>
              <div className="text-gray-500 mb-2">{project.clientEmail ? `Client: ${project.clientEmail}` : 'No client email set'}</div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-400">Created: {new Date(project.createdAt).toLocaleString()}</span>
                <span className="text-xs text-gray-400">Phase: <span className="font-semibold text-blue-700">{project.currentPhase}</span></span>
              </div>
              <button
                className="mt-4 px-4 py-2 rounded-lg text-center font-semibold shadow-md bg-gradient-to-r from-blue-600 to-purple-500 text-white hover:from-purple-500 hover:to-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-300 focus:outline-none active:scale-95"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                Open Project
              </button>
            </div>
          ))}
          {Array.isArray(projects) && projects.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-16">
              <div className="mb-4">
                <FolderIcon className="h-12 w-12 mx-auto text-gray-200 animate-float-slow" />
              </div>
              No projects yet. Create your first project!
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 4s linear infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float 5s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </main>
  );
} 