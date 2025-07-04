'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { PlusIcon, FolderIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import PipAvatar from '@/components/PipAvatar';
import AntiHustleMeter from '@/components/AntiHustleMeter';
import useSWR from 'swr';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
  phases?: string[]; // Added for edit functionality
}

const fetcher = async (url: string) => {
  const user = auth.currentUser;
  if (!user) return [];
  const token = await user.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data;
};

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

function ProjectCard({ project, onDelete, onEdit }: { project: Project, onDelete: (id: string) => void, onEdit: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="relative rounded-2xl shadow-xl p-8 border border-blue-200/30 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-200/60 group cursor-pointer bg-white/10 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(180,200,255,0.10) 100%)', boxShadow: '0 4px 32px 0 rgba(31,38,135,0.10)'}} />
      {/* Dots menu */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }} className="p-2 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <EllipsisVerticalIcon className="h-6 w-6 text-white" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-lg py-1 z-30">
            <button className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800" onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(project.id); }}>
              Edit
            </button>
            <button className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800" onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(project.id); }}>
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mb-2 relative z-10">
        <FolderIcon className="h-6 w-6 text-blue-400 group-hover:text-purple-500 transition-colors animate-float-slow" />
        <span className="font-semibold text-lg text-white group-hover:text-purple-200 transition-colors">{project.name}</span>
      </div>
      <div className="text-blue-100 mb-2 relative z-10">{project.clientEmail ? `Client: ${project.clientEmail}` : 'No client email set'}</div>
      <div className="flex flex-col gap-2 relative z-10">
        <span className="text-xs text-blue-200">Created: {new Date(project.createdAt).toLocaleString()}</span>
        <span className="text-xs text-blue-200">Phase: <span className="font-semibold text-blue-300">{project.currentPhase}</span></span>
      </div>
      <button
        className="mt-4 px-4 py-2 rounded-lg text-center font-semibold shadow-md bg-gradient-to-r from-blue-600 to-purple-500 text-white hover:from-purple-500 hover:to-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-300 focus:outline-none active:scale-95 relative z-10"
        onClick={() => router.push(`/project/${project.id}`)}
      >
        Open Project
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [name, setName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hoursSaved, setHoursSaved] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [, forceRerender] = useState(0);
  const router = useRouter();
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editPhases, setEditPhases] = useState<string[]>([]);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const { data: projectsData = [], mutate } = useSWR(
    authReady && auth.currentUser ? '/api/projects' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      console.log('onAuthStateChanged (dashboard) fired. User:', user);
      if (!user) {
        // User is not signed in, redirect to signin
        router.push('/signin');
      } else {
        // User is signed in, show dashboard
        setAuthChecking(false);
        // No need to fetchProjects here, SWR will handle it
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
      mutate();
      setName('');
      setClientEmail('');
      setToast(`Project "${project.name}" created!`);
    } else {
      setToast('Failed to create project. Please try again.');
    }
    setLoading(false);
    setTimeout(() => setToast(null), 2500);
  };

  const handleDelete = async (projectId: string) => {
    // Optionally, add a confirmation step here
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    mutate();
    setToast('Project deleted.');
  };

  // Edit handler
  const handleEdit = (projectId: string) => {
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    setEditProject(project);
    setEditPhases(project.phases && project.phases.length > 0 ? project.phases : ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY']);
    setEditName(project.name);
    setEditError(null);
  };

  // Save handler
  const handleEditSave = async () => {
    if (!editProject) return;
    if (editPhases.length < 1 || editPhases.length > 6 || editPhases.some(p => !p.trim())) {
      setEditError('Enter 1-6 non-empty phases.');
      return;
    }
    if (!editName.trim()) {
      setEditError('Project name cannot be empty.');
      return;
    }
    setEditLoading(true);
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/projects/${editProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ phases: editPhases, name: editName }),
    });
    setEditLoading(false);
    if (res.ok) {
      mutate();
      setEditProject(null);
    } else {
      setEditError('Failed to update project.');
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
    <main className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-x-hidden">
      {/* Animated shimmer overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ backgroundSize: '200% 100%' }} />
      {/* Hero Header */}
      <section className="w-full mb-12 relative z-10" style={{ background: 'linear-gradient(to right, #23243a, #23243a 60%, #23243a)' }}>
        <div className="w-full px-20 py-12">
          <div className="flex flex-row items-center justify-between w-full gap-16">
            <div className="flex-1 text-left">
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-blue-200 drop-shadow-lg">Dashboard</h1>
              <p className="text-lg text-gray-300 font-medium">Welcome back, creative rebel. Your anti-hustle HQ awaits.</p>
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
        <div className="bg-gray-800/80 rounded-2xl shadow-2xl p-10 mb-10 border border-blue-900 max-w-2xl mx-auto backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-900/40 group cursor-pointer">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-blue-200 group-hover:text-purple-200 transition-colors"><span className="animate-pulse"><PlusIcon className="h-6 w-6" /></span> Create a New Project</h2>
          <p className="text-gray-400 mb-6">Start a new project for a client. You can set the client email later.</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-center">
            <input
              className="border px-4 py-3 rounded-lg w-full shadow-sm focus:ring-2 focus:outline-none bg-gray-900/70 border-gray-700 text-white placeholder-gray-400"
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
        <div className={editProject ? 'transition-all duration-300 filter blur-md pointer-events-none select-none' : ''}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Array.isArray(projectsData) && projectsData.map((project, idx) => (
              <ProjectCard
                key={project.id || idx}
                project={project}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
            {Array.isArray(projectsData) && projectsData.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-16">
                <div className="mb-4">
                  <FolderIcon className="h-12 w-12 mx-auto text-gray-200 animate-float-slow" />
                </div>
                No projects yet. Create your first project!
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Edit Project Modal */}
      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md border border-blue-900 relative">
            <button className="absolute top-3 right-3 p-2 rounded hover:bg-gray-800" onClick={() => setEditProject(null)} aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-bold mb-4 text-blue-200">Edit Project</h3>
            <form onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <div className="mb-4">
                <label className="block text-blue-100 mb-1">Project Name</label>
                <input
                  className="w-full border px-3 py-2 rounded bg-gray-800 text-white border-gray-700"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={64}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-blue-100 mb-1">Phases</label>
                <DragDropContext
                  onDragEnd={(result: DropResult) => {
                    if (!result.destination) return;
                    const reordered = Array.from(editPhases);
                    const [removed] = reordered.splice(result.source.index, 1);
                    reordered.splice(result.destination.index, 0, removed);
                    setEditPhases(reordered);
                  }}
                >
                  <Droppable droppableId="phases-list">
                    {(provided) => (
                      <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                        {editPhases.map((phase, idx) => (
                          <Draggable key={idx} draggableId={String(idx)} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                className={`flex gap-2 items-center bg-gray-800 rounded ${dragSnapshot.isDragging ? 'ring-2 ring-blue-400' : ''}`}
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <span className="cursor-move text-blue-300 font-bold px-2">≡</span>
                                <input
                                  className="flex-1 border px-3 py-2 rounded bg-gray-800 text-white border-gray-700"
                                  value={phase}
                                  onChange={e => {
                                    const arr = [...editPhases];
                                    arr[idx] = e.target.value;
                                    setEditPhases(arr);
                                  }}
                                  maxLength={32}
                                  required
                                />
                                <button type="button" className="text-red-400 hover:text-red-600" onClick={() => setEditPhases(editPhases.filter((_, i) => i !== idx))} disabled={editPhases.length <= 1}>&times;</button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {editPhases.length < 6 && (
                          <button type="button" className="text-xs text-blue-300 hover:underline" onClick={() => setEditPhases([...editPhases, ''])}>+ Add Phase</button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
              {editError && <div className="text-red-400 mb-2 text-sm">{editError}</div>}
              <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold mt-2" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}
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