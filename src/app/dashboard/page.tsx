'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { PlusIcon, FolderIcon, EllipsisVerticalIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import PipAvatar from '@/components/PipAvatar';
import AntiHustleMeter from '@/components/AntiHustleMeter';
import useSWR from 'swr';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SparklesIcon, CalendarDaysIcon, EnvelopeOpenIcon } from '@heroicons/react/24/solid';
import './calendar-dashboard.css'; // Custom styles for react-big-calendar
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

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

interface DashboardEmail {
  id: string;
  projectId: string;
  projectName: string;
  clientEmail?: string;
  from: string;
  subject: string;
  body: string;
  closing: string;
  signature: string;
  status: string;
  createdAt: FirebaseFirestore.Timestamp | Date | string;
  parentId?: string;
  trigger?: string;
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

// Helper to fetch with auth token
async function fetchWithAuth(url: string): Promise<unknown> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

function ProjectCard({ project, onDelete, onEdit }: { project: Project, onDelete: (id: string) => void, onEdit: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <div
      className="relative rounded-2xl shadow-xl p-8 border border-blue-200/30 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-200/60 group cursor-pointer bg-white/10 overflow-hidden"
      onClick={() => router.push(`/project/${project.id}`)}
    >
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
        onClick={e => { e.stopPropagation(); router.push(`/project/${project.id}`); }}
      >
        Open Project
      </button>
    </div>
  );
}

// Helper for animated expand/collapse
function ExpandableCard({ expanded, onClick, title, icon, summary, content, loading, gradientClass }: {
  expanded: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  summary: React.ReactNode;
  content: React.ReactNode;
  loading: boolean;
  gradientClass: string;
}) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Expand ${title}`}
      className={
        `${gradientClass} rounded-2xl shadow-xl p-8 flex flex-col items-start min-h-[180px] h-full relative overflow-hidden transition-all duration-300 outline-none focus:ring-4 focus:ring-blue-400/50 hover:scale-[1.02] hover:shadow-2xl border-2 border-transparent hover:border-blue-400 ${expanded ? 'ring-2 ring-blue-300/30 border-blue-400' : ''}`
      }
      style={{ minHeight: 180, height: '100%', cursor: 'pointer' }}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div className="flex items-center w-full mb-2 select-none">
        {icon}
        <h2 className="text-2xl font-extrabold text-white ml-2 flex-1 drop-shadow-lg tracking-tight">{title}</h2>
        <ChevronDownIcon
          className={`h-6 w-6 text-blue-100 ml-2 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>
      {loading ? (
        <div className="w-full h-6 bg-blue-900/40 rounded animate-pulse mb-2" />
      ) : (
        <>
          <div className={`transition-all duration-300 ${expanded ? 'opacity-0 h-0 pointer-events-none' : 'opacity-100 h-auto'}`}>{summary}</div>
          <div
            className={`transition-all duration-500 ease-in-out ${expanded ? 'opacity-100 max-h-[320px] mt-2' : 'opacity-0 max-h-0 pointer-events-none'} w-full`}
            style={{ overflowY: expanded ? 'auto' : 'hidden' }}
          >
            {content}
          </div>
        </>
      )}
      <span className="absolute top-4 right-4 text-xs text-blue-100 bg-blue-900/80 px-2 py-1 rounded-lg shadow-md select-none">{expanded ? 'Click to collapse' : 'Click to expand'}</span>
    </div>
  );
}

function useDraftedEmails() {
  const [draftedEmails, setDraftedEmails] = useState<DashboardEmail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setDraftedEmails([]);
      setLoading(false);
      return;
    }
    const token = await user.getIdToken();
    const res = await fetch('/api/emails/drafts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      setDraftedEmails(data);
    } else {
      setDraftedEmails([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchDrafts();
      else {
        setDraftedEmails([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return { draftedEmails, setDraftedEmails, loading, refetch: fetchDrafts };
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

  // New state for AI-powered dashboard sections
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingTodos, setLoadingTodos] = useState(true);
  // Add state for expanded cards
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  // Add state for Gmail connection
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ date: Date; events: { title: string; start: Date; end: Date }[] } | null>(null);
  // Calendar state (must be at top level)
  const [calendarEvents, setCalendarEvents] = useState<{ title: string; date: string }[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const { draftedEmails, setDraftedEmails, loading: loadingDrafts } = useDraftedEmails();
  const [todos, setTodos] = useState<{ task: string; dueDate?: string; type: 'project' | 'calendar'; projectName?: string; confidence?: number }[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DashboardEmail | null>(null);
  const [editableDraft, setEditableDraft] = useState<DashboardEmail | null>(null);

  // Helper to toggle card expansion
  const handleCardToggle = (card: string) => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Helper to close draft modal
  const closeDraftModal = () => {
    setSelectedDraft(null);
    setEditableDraft(null);
  };

  // Helper to open draft modal with editable content
  const openDraftModal = (email: DashboardEmail) => {
    setSelectedDraft(email);
    setEditableDraft({ ...email }); // Create a copy for editing
  };

  // Helper: group events by date for modal
  function getEventsForDate(date: Date) {
    return calendarEvents.filter(ev => {
      const evDate = new Date(ev.date);
      return evDate.toDateString() === date.toDateString();
    });
  }

  // Helper to get date from Firestore Timestamp, Date, or string
  const getDateFromEmail = (dateVal: FirebaseFirestore.Timestamp | Date | string): Date => {
    if (dateVal && typeof dateVal === 'object' && typeof (dateVal as { toDate?: unknown }).toDate === 'function') {
      return (dateVal as { toDate: () => Date }).toDate();
    }
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal === 'string') return new Date(dateVal);
    return new Date();
  };

  // Helper to extract tasks from drafted emails
  const extractTasksFromDrafts = (drafts: DashboardEmail[]): { task: string; dueDate?: string; type: 'project' | 'calendar'; projectName?: string; confidence?: number }[] => {
    const tasks: { task: string; dueDate?: string; type: 'project' | 'calendar'; projectName?: string; confidence?: number }[] = [];
    
    drafts.forEach(draft => {
      const emailContent = `${draft.subject} ${draft.body} ${draft.closing} ${draft.signature}`.toLowerCase();
      const projectName = draft.projectName;
      const createdAt = getDateFromEmail(draft.createdAt);
      
      // Extract tasks based on common patterns in email content
      const taskPatterns = [
        {
          pattern: /(?:need to|have to|must|should|will|going to)\s+(?:review|approve|send|check|update|create|design|develop|implement|test|deploy|launch|publish|submit|deliver|complete|finish|start|begin|prepare|organize|schedule|plan|meet|call|email|contact|reach out to|follow up with|get back to|respond to|reply to)/gi,
          taskType: 'email_action'
        },
        {
          pattern: /(?:deadline|due date|due by|needed by|required by|by|before|until)\s+([a-zA-Z0-9\s,]+)/gi,
          taskType: 'deadline'
        },
        {
          pattern: /(?:review|approve|send|check|update|create|design|develop|implement|test|deploy|launch|publish|submit|deliver|complete|finish|start|begin|prepare|organize|schedule|plan|meet|call|email|contact|reach out to|follow up with|get back to|respond to|reply to)/gi,
          taskType: 'action_item'
        },
        {
          pattern: /(?:urgent|asap|immediately|soon|quickly|promptly|right away|now)/gi,
          taskType: 'urgent'
        }
      ];

      taskPatterns.forEach(({ pattern, taskType }) => {
        const matches = emailContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            let taskText = match.trim();
            
            // Clean up the task text
            if (taskType === 'deadline') {
              taskText = `Deadline: ${taskText}`;
            } else if (taskType === 'urgent') {
              taskText = `Urgent: ${taskText}`;
            }
            
            // Create a task with appropriate priority
            const confidence = taskType === 'urgent' ? 0.9 : 
                             taskType === 'deadline' ? 0.8 : 
                             taskType === 'email_action' ? 0.7 : 0.6;
            
            tasks.push({
              task: taskText,
              dueDate: createdAt.toISOString(),
              type: 'project',
              projectName: projectName,
              confidence: confidence
            });
          });
        }
      });

      // Add specific tasks based on email status and content
      if (draft.status === 'draft') {
        tasks.push({
          task: `Review and approve email draft: "${draft.subject}"`,
          dueDate: createdAt.toISOString(),
          type: 'project',
          projectName: projectName,
          confidence: 0.95
        });
      }

      // Extract client requests or requirements
      const clientRequestPatterns = [
        /(?:client|customer|user)\s+(?:wants|needs|requests|asks for|requires|expects)/gi,
        /(?:please|can you|could you)\s+(?:review|check|update|create|send|provide)/gi,
        /(?:I need|we need|required|necessary|essential|important)/gi
      ];

      clientRequestPatterns.forEach(pattern => {
        const matches = emailContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            tasks.push({
              task: `Client request: ${match.trim()}`,
              dueDate: createdAt.toISOString(),
              type: 'project',
              projectName: projectName,
              confidence: 0.85
            });
          });
        }
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueTasks = tasks.filter((task, index, self) => 
      index === self.findIndex(t => t.task === task.task && t.projectName === task.projectName)
    );

    return uniqueTasks.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  };

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

  useEffect(() => {
    if (!authReady || !Array.isArray(projectsData) || projectsData.length === 0) return;
    setLoadingSummary(true); setLoadingCalendar(true); setLoadingTodos(true);
    // Simulate async AI fetch/generation (replace with real API calls)
    setTimeout(() => {
      setSummary("Since your last visit: 2 new client emails, 1 project advanced to 'DESIGN', 1 payment due in 3 days.");
      setLoadingSummary(false);
    }, 1200);
    // Fetch actionable to-dos from backend
    Promise.all([
      fetchWithAuth('/api/calendar-events').catch((err) => err),
      fetchWithAuth('/api/client-todos').catch((err) => err)
    ]).then(([calendarData, todosData]) => {
      let calendarEventsRaw: { title: string; date: string; description?: string; id?: string; end?: string }[] = [];
      let todosRaw: { task: string; dueDate?: string; type: 'project' | 'calendar'; projectName?: string; confidence?: number }[] = [];

      if (calendarData && typeof calendarData === 'object' && 'error' in calendarData) {
        if (calendarData.error === 'Unauthorized') {
          setCalendarError('You are not logged in or your session expired. Please log in and reconnect Google.');
          setToast('Google Calendar: Not authorized. Please log in and reconnect.');
        } else if (calendarData.error === 'No Google token') {
          setCalendarError('Google account not connected. Please reconnect Google.');
          setToast('Google Calendar: Not connected. Please reconnect.');
        } else if (calendarData.error === 'Google Calendar API error') {
          setCalendarError('Google Calendar API error. Try reconnecting Google.');
          setToast('Google Calendar: API error. Try reconnecting.');
        } else {
          setCalendarError('Failed to load Google Calendar.');
          setToast('Google Calendar: Failed to load.');
        }
        setCalendarEvents([]);
        setLoadingCalendar(false);
      } else {
        calendarEventsRaw = (calendarData as { events?: { title: string; date: string; description?: string; id?: string; end?: string }[] }).events || [];
        setCalendarEvents(calendarEventsRaw);
        setCalendarError(null);
        setLoadingCalendar(false);
      }

      if (todosData && typeof todosData === 'object' && 'error' in todosData) {
        if (todosData.error === 'Unauthorized') {
          setToast('To-Do list: Not authorized. Please log in.');
        } else if (todosData.error === 'No Google token') {
          setToast('To-Do list: Not connected. Please reconnect Google.');
        } else if (todosData.error === 'Google Calendar API error') {
          setToast('To-Do list: API error. Try reconnecting.');
        } else {
          todosRaw = (todosData as { todos?: { task: string; dueDate?: string; type: 'project' | 'calendar'; projectName?: string; confidence?: number }[] }).todos || [];
        }
        setLoadingTodos(false);
      } else {
        todosRaw = (todosData as { todos?: { task: string; dueDate?: string; type: 'project' | 'calendar'; projectName?: string; confidence?: number }[] }).todos || [];
        setLoadingTodos(false);
      }

      // Combine project/client todos and calendar events
      const calendarTodos = calendarEventsRaw
        .filter(ev => {
          const text = (ev.title + ' ' + (ev.description || '')).toLowerCase();
          return /call|meeting|zoom|meet/.test(text);
        })
        .map(ev => ({
          task: ev.title,
          dueDate: ev.date,
          type: 'calendar' as const,
        }));

      // Extract tasks from drafted emails
      const draftTasks = extractTasksFromDrafts(draftedEmails);
      
      // Combine all tasks: backend todos, calendar events, and draft tasks
      setTodos([...todosRaw, ...calendarTodos, ...draftTasks]);
    }).catch(() => {
      setLoadingCalendar(false);
      setLoadingTodos(false);
      setCalendarError('Failed to load Google Calendar');
      setToast('Google Calendar: Failed to load.');
    });
  }, [authReady, projectsData, draftedEmails]);

  // Check Gmail connection
  const checkGmailConnection = async () => {
    const user = auth.currentUser;
    if (!user) {
      return;
    }
    const token = await user.getIdToken();
    const res = await fetch('/api/gmail-user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return;
    }
  };

  useEffect(() => {
    checkGmailConnection();
  }, [authReady]);

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

  const handleApproveDraft = async (email: DashboardEmail) => {
    if (!email.id) return;
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/emails/${email.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        subject: email.subject,
        body: email.body,
        closing: email.closing,
        signature: email.signature
      }),
    });
    if (res.ok) {
      setToast('Draft approved and sent!');
      // Remove the email from the local state immediately
      setDraftedEmails((prev: DashboardEmail[]) => prev.filter((draft: DashboardEmail) => draft.id !== email.id));
      setSelectedDraft(null);
      setEditableDraft(null);
    } else {
      setToast('Failed to approve draft.');
    }
  };

  const handleDeclineDraft = async (email: DashboardEmail) => {
    if (!email.id) return;
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/emails/${email.id}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      setToast('Draft declined.');
      // Remove the email from the local state immediately
      setDraftedEmails((prev: DashboardEmail[]) => prev.filter((draft: DashboardEmail) => draft.id !== email.id));
      setSelectedDraft(null);
      setEditableDraft(null);
    } else {
      setToast('Failed to decline draft.');
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

  const locales = {
    'en-US': enUS,
  };
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
    getDay,
    locales,
  });

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
      {/* AI-powered Overview Cards */}
      {/* Place 'What’s Changed' card separately above the grid */}
      <div className="max-w-3xl mx-auto px-6 mb-8">
        <ExpandableCard
          expanded={expandedCard === 'summary'}
          onClick={() => handleCardToggle('summary')}
          title="What’s Changed"
          icon={<SparklesIcon className="h-8 w-8 text-yellow-300 animate-float" />}
          summary={<p className="text-blue-100 text-base truncate w-full">{summary}</p>}
          content={<p className="text-blue-100 text-base mt-2">{summary}</p>}
          loading={loadingSummary}
          gradientClass="bg-gradient-to-br from-blue-800 via-blue-900 to-purple-900"
        />
      </div>
      {/* Centered cards row */}
      <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:items-start md:justify-center md:gap-8 mb-12">
        {/* To-Dos Card */}
        <div className="w-full max-w-md min-h-[260px] flex flex-col justify-between bg-gradient-to-br from-purple-800 via-blue-900 to-blue-900 rounded-2xl shadow-2xl p-0 border-2 border-blue-900/30">
          <ExpandableCard
            expanded={expandedCard === 'todos'}
            onClick={() => handleCardToggle('todos')}
            title="Upcoming To-Dos"
            icon={<ClipboardDocumentCheckIcon className="h-8 w-8 text-green-200 animate-float drop-shadow-lg" />}
            summary={
              loadingTodos ? (
                <div className="w-full h-6 bg-green-900/40 rounded animate-pulse mb-2" />
              ) : todos.length === 0 ? (
                <div className="text-blue-200 text-sm">No actionable to-dos found.</div>
              ) : (
                <ul className="space-y-2 w-full max-h-16 overflow-hidden">
                  {todos.slice(0, 2).map((todo, i) => (
                    <li key={i} className={`bg-white/10 rounded-lg p-3 text-blue-100 shadow flex flex-col border-l-4 ${
                      todo.type === 'calendar' ? 'border-blue-400' : 
                      (todo.confidence || 0) > 0.8 ? 'border-red-400' :
                      (todo.confidence || 0) > 0.6 ? 'border-yellow-400' : 'border-green-400'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-green-200 flex-1 truncate">{todo.task}</span>
                        {todo.type === 'calendar' && (
                          <span className="text-xs text-blue-400 bg-blue-900/40 px-1 py-0.5 rounded">
                            📅
                          </span>
                        )}
                        {todo.type === 'project' && (todo.confidence || 0) > 0.8 && (
                          <span className="text-xs text-red-400 bg-red-900/40 px-1 py-0.5 rounded">
                            ⚡
                          </span>
                        )}
                        {todo.type === 'project' && (todo.confidence || 0) > 0.6 && (todo.confidence || 0) <= 0.8 && (
                          <span className="text-xs text-yellow-400 bg-yellow-900/40 px-1 py-0.5 rounded">
                            ⏰
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 text-xs">
                        {todo.dueDate && (
                          <span className="text-yellow-300 bg-yellow-900/20 px-1 py-0.5 rounded">
                            {new Date(todo.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {todo.type === 'project' && todo.projectName && (
                          <span className="text-blue-300 bg-blue-900/20 px-1 py-0.5 rounded truncate">
                            {todo.projectName}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                  {todos.length > 2 && <li className="text-blue-300">...and {todos.length - 2} more</li>}
                </ul>
              )
            }
            content={
              loadingTodos ? (
                <div className="space-y-2 w-full">
                  <div className="h-5 bg-green-900/40 rounded animate-pulse" />
                  <div className="h-5 bg-green-900/40 rounded animate-pulse" />
                </div>
              ) : todos.length === 0 ? (
                <div className="text-blue-200 text-base">No actionable to-dos found.</div>
              ) : (
                <ul className="space-y-2 w-full max-h-60 overflow-y-auto">
                  {todos.map((todo, i) => (
                    <li key={i} className={`bg-white/10 rounded-lg p-3 text-blue-100 shadow flex flex-col border-l-4 ${
                      todo.type === 'calendar' ? 'border-blue-400' : 
                      (todo.confidence || 0) > 0.8 ? 'border-red-400' :
                      (todo.confidence || 0) > 0.6 ? 'border-yellow-400' : 'border-green-400'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-green-200 flex-1">{todo.task}</span>
                        {todo.type === 'calendar' && (
                          <span className="text-xs text-blue-400 bg-blue-900/40 px-2 py-1 rounded">
                            📅 Calendar
                          </span>
                        )}
                        {todo.type === 'project' && (todo.confidence || 0) > 0.8 && (
                          <span className="text-xs text-red-400 bg-red-900/40 px-2 py-1 rounded">
                            ⚡ Urgent
                          </span>
                        )}
                        {todo.type === 'project' && (todo.confidence || 0) > 0.6 && (todo.confidence || 0) <= 0.8 && (
                          <span className="text-xs text-yellow-400 bg-yellow-900/40 px-2 py-1 rounded">
                            ⏰ Due Soon
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        {todo.dueDate && (
                          <span className="text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded">
                            📅 {new Date(todo.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {todo.type === 'project' && todo.projectName && (
                          <span className="text-blue-300 bg-blue-900/20 px-2 py-1 rounded">
                            📁 {todo.projectName}
                          </span>
                        )}
                        {todo.type === 'project' && typeof todo.confidence === 'number' && !isNaN(todo.confidence) && (
                          <span className="text-green-400 bg-green-900/20 px-2 py-1 rounded">
                            🎯 {(todo.confidence * 100).toFixed(0)}% priority
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
            loading={loadingTodos}
            gradientClass="bg-gradient-to-br from-purple-800 via-blue-900 to-blue-900"
          />
        </div>
        {/* Drafted Replies Card */}
        <div className="w-full max-w-md min-h-[260px] flex flex-col justify-between bg-gradient-to-br from-blue-900/80 to-blue-800/60 rounded-2xl shadow-2xl p-0 border-2 border-blue-900/30">
          <ExpandableCard
            expanded={expandedCard === 'drafts'}
            onClick={() => handleCardToggle('drafts')}
            title="Drafted Replies"
            icon={<EnvelopeOpenIcon className="h-8 w-8 text-blue-200 animate-float drop-shadow-lg" />}
            summary={
              loadingDrafts ? (
                <div className="w-full h-6 bg-blue-900/40 rounded animate-pulse mb-2" />
              ) : draftedEmails.length === 0 ? (
                <div className="text-blue-200 text-sm">No drafted replies yet.</div>
              ) : (
                <div className="text-blue-200 text-sm">
                  {draftedEmails.length} draft{draftedEmails.length !== 1 ? 's' : ''} ready for review
                </div>
              )
            }
            content={
              loadingDrafts ? (
                <div className="space-y-2 w-full">
                  <div className="h-5 bg-blue-900/40 rounded animate-pulse" />
                  <div className="h-5 bg-blue-900/40 rounded animate-pulse" />
                </div>
              ) : draftedEmails.length === 0 ? (
                <div className="text-blue-200 text-base">No drafted replies yet.</div>
              ) : (
                <ul className="space-y-3 w-full max-h-60 overflow-y-auto">
                  {draftedEmails.map(email => (
                    <li key={email.id} className="bg-white/10 rounded-lg p-4 border border-blue-200/10 hover:border-blue-300/20 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-blue-100 truncate">{email.subject}</span>
                            <span className="px-2 py-0.5 text-xs rounded bg-blue-700/60 text-blue-200 font-semibold">
                              {email.projectName}
                            </span>
                          </div>
                          
                          {/* Clickable preview - shows first 100 chars */}
                          <div 
                            className="text-sm text-blue-200 mb-3 cursor-pointer hover:text-blue-100 transition-colors"
                            onClick={() => {
                              // Show full content in modal
                              openDraftModal(email);
                            }}
                          >
                            {email.body.length > 100 
                              ? `${email.body.substring(0, 100)}...` 
                              : email.body
                            }
                            <span className="text-blue-400 text-xs ml-2">(Click to view full)</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-blue-300">
                            <span>From: {email.from}</span>
                            <span>•</span>
                            <span>Status: {email.status}</span>
                            <span>•</span>
                            <span>
                              {getDateFromEmail(email.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-[120px] items-end">
                          {email.status === 'draft' && (
                            <>
                              <button
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold text-xs shadow-sm transition-all"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleApproveDraft(email);
                                }}
                              >
                                Approve & Send
                              </button>
                              <button
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-xs shadow-sm transition-all"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleDeclineDraft(email);
                                }}
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {email.status === 'approved' && (
                            <span className="text-green-400 text-xs font-semibold px-2 py-1 bg-green-900/40 rounded">
                              Sent ✓
                            </span>
                          )}
                          {email.status === 'declined' && (
                            <span className="text-red-400 text-xs font-semibold px-2 py-1 bg-red-900/40 rounded">
                              Declined ✗
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
            loading={loadingDrafts}
            gradientClass="bg-gradient-to-br from-blue-900/80 to-blue-800/60"
          />
        </div>
        {/* Google Calendar Card */}
        <div className="w-full max-w-md min-h-[260px] flex flex-col justify-between bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 rounded-2xl shadow-2xl p-0 border-2 border-blue-900/30">
          <ExpandableCard
            expanded={expandedCard === 'calendar'}
            onClick={() => handleCardToggle('calendar')}
            title="Google Calendar"
            icon={<CalendarDaysIcon className="h-8 w-8 text-blue-100 animate-float drop-shadow-lg" />}
            summary={calendarError ? (
              <div className="text-red-400 text-sm flex flex-col gap-2">
                <span>{calendarError}</span>
                <a href="/api/auth/google" className="inline-block bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded mt-1 text-xs font-semibold">Reconnect Google</a>
              </div>
            ) : (
              <div className="text-blue-200 text-sm">Your full calendar is below. Click any day to see all events for that day.</div>
            )}
            content={loadingCalendar ? (
              <div className="w-full h-6 bg-blue-900/40 rounded animate-pulse mb-2" />
            ) : (
              <div className="w-full h-[500px]">
                <BigCalendar
                  localizer={localizer}
                  events={calendarEvents.map(ev => ({
                    title: ev.title,
                    start: new Date(ev.date),
                    end: new Date(ev.date),
                    allDay: true,
                  }))}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 500, background: 'rgba(30,41,59,0.97)', borderRadius: '1.5rem', color: '#fff', fontFamily: 'Inter, sans-serif', boxShadow: '0 8px 32px 0 rgba(31,38,135,0.13)' }}
                  views={['month', 'week', 'day']}
                  popup
                  selectable
                  onSelectSlot={(slotInfo) => {
                    const slotDate = slotInfo.start;
                    const eventsForDate = getEventsForDate(slotDate);
                    setSelectedDateEvents({ date: slotDate, events: eventsForDate.map(ev => ({
                      title: ev.title,
                      start: new Date(ev.date),
                      end: new Date(ev.date),
                    })) });
                  }}
                  components={{
                    event: ({ event }) => (
                      <div className="custom-calendar-event">
                        <span className="font-semibold text-blue-200">{event.title}</span>
                      </div>
                    ),
                    toolbar: (toolbarProps) => (
                      <div className="custom-calendar-toolbar flex items-center justify-between mb-2 px-2 py-1 rounded-lg bg-blue-900/60">
                        <div className="flex gap-2">
                          <button className={`calendar-btn ${toolbarProps.view === 'month' ? 'active' : ''}`} onClick={() => toolbarProps.onView('month')}>Month</button>
                          <button className={`calendar-btn ${toolbarProps.view === 'week' ? 'active' : ''}`} onClick={() => toolbarProps.onView('week')}>Week</button>
                          <button className={`calendar-btn ${toolbarProps.view === 'day' ? 'active' : ''}`} onClick={() => toolbarProps.onView('day')}>Day</button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button className="calendar-btn" onClick={() => toolbarProps.onNavigate('PREV')}>&lt;</button>
                          <span className="font-bold text-blue-100 text-lg">{toolbarProps.label}</span>
                          <button className="calendar-btn" onClick={() => toolbarProps.onNavigate('NEXT')}> &gt; </button>
                        </div>
                      </div>
                    )
                  }}
                  eventPropGetter={() => ({
                    style: {
                      background: 'linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%)',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      border: 'none',
                      boxShadow: '0 2px 8px 0 rgba(99,102,241,0.15)',
                      padding: '2px 8px',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      transition: 'box-shadow 0.2s',
                    },
                    className: 'calendar-event-hover',
                  })}
                />
                {/* Modal for selected date events */}
                {selectedDateEvents && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md border border-blue-900 relative shadow-2xl">
                      <button className="absolute top-3 right-3 p-2 rounded hover:bg-gray-800" onClick={() => setSelectedDateEvents(null)} aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <h3 className="text-lg font-bold mb-4 text-blue-200">Events for {selectedDateEvents.date.toLocaleDateString()}</h3>
                      {selectedDateEvents.events.length === 0 ? (
                        <div className="text-blue-100">No events scheduled for this day.</div>
                      ) : (
                        <ul className="space-y-3">
                          {selectedDateEvents.events.map((ev, idx) => (
                            <li key={idx} className="bg-blue-900/60 rounded-lg p-4 shadow text-blue-100 flex flex-col">
                              <span className="font-semibold text-blue-200">{ev.title}</span>
                              <span className="text-xs text-blue-300 mt-1">{ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            loading={loadingCalendar}
            gradientClass="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700"
          />
        </div>
      </div>
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
      {/* Remove any other email lists/cards except Drafted Replies */}
      {/* Only keep the Drafted Replies card below */}
      {draftedEmails.length > 0 && (() => {
        // Deduplicate by subject+from+date and take top 5
        const uniqueEmailsMap = new Map();
        for (const email of draftedEmails) {
          const key = `${email.subject}|${email.from}|${email.createdAt}`;
          if (!uniqueEmailsMap.has(key)) {
            uniqueEmailsMap.set(key, email);
          }
        }
        const uniqueTop5 = Array.from(uniqueEmailsMap.values()).slice(0, 5);
        return (
          <div className="rounded-2xl shadow-xl p-8 bg-gradient-to-br from-blue-900/80 to-blue-800/60 border border-blue-300/20 mb-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <EnvelopeOpenIcon className="h-6 w-6 text-blue-300" /> Drafted Replies
            </h2>
            <div className="flex flex-col gap-6">
              {uniqueTop5.map(email => (
                <div key={email.id} className="bg-white/10 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 border border-blue-200/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-100 truncate">{email.subject || '(No Subject)'}</span>
                      <span className="ml-2 text-xs text-blue-300 truncate">From: {email.from}</span>
                    </div>
                    <div className="text-xs text-blue-200 mb-2 truncate">{email.body}</div>
                    <div className="bg-blue-950/60 rounded p-3 text-sm text-blue-100 whitespace-pre-line border border-blue-900/30">
                      {email.body}
                      {email.status === 'pending' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-700/80 text-yellow-100 font-semibold align-middle">Pending Approval</span>
                      )}
                      {email.status === 'approved' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-700/80 text-green-100 font-semibold align-middle">Approved & Sent</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px] items-end">
                    {email.status === 'pending' && (
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all" onClick={() => {/* TODO: Approve/send logic */}}>
                        Approve & Send
                      </button>
                    )}
                    {email.status === 'approved' && (
                      <span className="text-green-400 text-xs font-semibold">Sent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      
      {/* Draft Email Modal */}
      {selectedDraft && editableDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl p-8 w-full max-w-2xl border border-blue-900 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-4 right-4 p-2 rounded hover:bg-gray-800 transition-colors" 
              onClick={closeDraftModal} 
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-blue-200">Edit Email Draft</h3>
                <span className="px-3 py-1 text-xs rounded bg-blue-700/60 text-blue-200 font-semibold">
                  {selectedDraft.projectName}
                </span>
              </div>
              
              {/* Recipient Information */}
              <div className="mb-4 p-3 bg-blue-900/40 rounded-lg border border-blue-700/50">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-blue-300 font-semibold">To:</span>
                  <span className="text-blue-100">
                    {selectedDraft.clientEmail || 'No client email set'}
                  </span>
                  {!selectedDraft.clientEmail && (
                    <span className="text-yellow-400 text-xs">(Please set client email in project settings)</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-blue-100 text-sm font-semibold mb-1">Subject:</label>
                  <input
                    type="text"
                    value={editableDraft.subject || ''}
                    onChange={(e) => setEditableDraft({ ...editableDraft, subject: e.target.value })}
                    className="w-full bg-gray-800 rounded p-3 text-blue-100 border border-gray-700 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter subject..."
                  />
                </div>
                
                <div>
                  <label className="block text-blue-100 text-sm font-semibold mb-1">Body:</label>
                  <textarea
                    value={editableDraft.body || ''}
                    onChange={(e) => setEditableDraft({ ...editableDraft, body: e.target.value })}
                    className="w-full bg-gray-800 rounded p-3 text-blue-100 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                    rows={8}
                    placeholder="Enter email body..."
                  />
                </div>
                
                <div>
                  <label className="block text-blue-100 text-sm font-semibold mb-1">Closing:</label>
                  <input
                    type="text"
                    value={editableDraft.closing || ''}
                    onChange={(e) => setEditableDraft({ ...editableDraft, closing: e.target.value })}
                    className="w-full bg-gray-800 rounded p-3 text-blue-100 border border-gray-700 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Best regards,"
                  />
                </div>
                
                <div>
                  <label className="block text-blue-100 text-sm font-semibold mb-1">Signature:</label>
                  <input
                    type="text"
                    value={editableDraft.signature || ''}
                    onChange={(e) => setEditableDraft({ ...editableDraft, signature: e.target.value })}
                    className="w-full bg-gray-800 rounded p-3 text-blue-100 border border-gray-700 focus:border-blue-500 focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
                
                <div className="flex items-center gap-4 text-xs text-blue-300 pt-2 border-t border-gray-700">
                  <span>From: {selectedDraft.from}</span>
                  <span>•</span>
                  <span>Status: {selectedDraft.status}</span>
                  <span>•</span>
                  <span>
                    {getDateFromEmail(selectedDraft.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            {selectedDraft.status === 'draft' && (
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition-all"
                  onClick={async () => {
                    await handleDeclineDraft(selectedDraft);
                    closeDraftModal();
                  }}
                >
                  Decline
                </button>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition-all"
                  onClick={async () => {
                    // Use the edited content for approval
                    await handleApproveDraft(editableDraft);
                    closeDraftModal();
                  }}
                >
                  Approve & Send
                </button>
              </div>
            )}
            
            {selectedDraft.status === 'approved' && (
              <div className="flex justify-end pt-4 border-t border-gray-700">
                <span className="text-green-400 text-sm font-semibold px-4 py-2 bg-green-900/40 rounded">
                  Sent ✓
                </span>
              </div>
            )}
            
            {selectedDraft.status === 'declined' && (
              <div className="flex justify-end pt-4 border-t border-gray-700">
                <span className="text-red-400 text-sm font-semibold px-4 py-2 bg-red-900/40 rounded">
                  Declined ✗
                </span>
              </div>
            )}
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