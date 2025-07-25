"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from './CoPilot.module.css';

// Placeholder pip icon SVG
const PipIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="18" fill="#6C4AD6" />
    <ellipse cx="18" cy="14" rx="8" ry="7" fill="#fff" />
    <ellipse cx="18" cy="14" rx="4" ry="3.5" fill="#6C4AD6" />
    <ellipse cx="18" cy="26" rx="6" ry="2.5" fill="#fff" />
  </svg>
);

export default function CoPilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hi! I’m Pip, your Digipod Co-Pilot. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const promptTemplates = [
    {
      label: "Add To-Do",
      message: "Add 'Follow up with client' to my to-do list",
      intent: "add_todo"
    },
    {
      label: "List To-Dos",
      message: "Show my to-do list",
      intent: "list_todos"
    },
    {
      label: "Create Project",
      message: "Create project called 'Website Redesign'",
      intent: "create_project"
    },
    {
      label: "List Projects",
      message: "List all projects",
      intent: "list_projects"
    },
    {
      label: "Project Status",
      message: "Show project status for 'Website Redesign'",
      intent: "get_project_status"
    },
    {
      label: "Advance Project Phase",
      message: "Advance phase for project 'Website Redesign'",
      intent: "advance_phase"
    },
    {
      label: "List AI Drafts",
      message: "Show my AI drafts",
      intent: "list_ai_drafts"
    },
    {
      label: "Approve AI Draft",
      message: "Approve the latest AI draft",
      intent: "approve_ai_draft"
    },
    {
      label: "List Clients",
      message: "List all clients",
      intent: "list_clients"
    },
    {
      label: "Add Client Filter",
      message: "Add john@client.com to my client filters",
      intent: "add_client_filter"
    },
    {
      label: "Show Payments",
      message: "Show all pending payments",
      intent: "show_payments"
    },
    {
      label: "Get Metrics",
      message: "Get my metrics",
      intent: "get_metrics"
    },
    {
      label: "Help",
      message: "What can you do?",
      intent: "help"
    }
  ];

  async function sendMessage(msg?: string) {
    const messageToSend = (msg !== undefined ? msg : input).trim();
    if (!messageToSend) return;
    setMessages(msgs => [...msgs, { from: "user", text: messageToSend }]);
    setLoading(true);
    setInput("");
    try {
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      const token = user && await user.getIdToken();
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: messageToSend })
      });
      const data = await res.json();
      setMessages(msgs => [...msgs, { from: "ai", text: data.reply || "I'm on it! (No response)" }]);
      
      // If the response indicates a todo was added, trigger a refresh and increment hustle meter
      if (data.reply && data.reply.toLowerCase().includes('added to-do')) {
        // Dispatch a custom event to notify the dashboard to refresh
        window.dispatchEvent(new CustomEvent('todo-added'));
        
        // Increment hustle meter for Co-Pilot tasks
        const { incrementMinutesSaved } = await import('@/lib/hustleMeter');
        incrementMinutesSaved(2); // Co-Pilot tasks save 2 minutes
        
        // Also trigger a refresh of the summary card
        window.dispatchEvent(new CustomEvent('summary-refresh'));
      }
    } catch {
      setMessages(msgs => [...msgs, { from: "ai", text: "Sorry, something went wrong." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating Pip Button */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-white shadow-xl rounded-full p-3 border-2 border-blue-300 hover:scale-105 transition-all"
        style={{ boxShadow: "0 4px 24px 0 #6c4ad644" }}
        onClick={() => setOpen(true)}
        aria-label="Open Co-Pilot"
      >
        <PipIcon />
      </button>
      {/* Side Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <div className="relative w-full max-w-md h-full bg-gray-900 border-l border-blue-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-blue-800 bg-gray-900">
              <div className="flex items-center gap-2">
                <PipIcon />
                <span className="text-lg font-bold text-white">Hi I&apos;m Pip, Your Pod assistant</span>
              </div>
              <button className="text-blue-300 hover:text-blue-500 text-2xl font-bold px-2" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "ai" ? "justify-start" : "justify-end"}`}>
                  <div className={`rounded-xl px-4 py-2 max-w-[80%] shadow ${msg.from === "ai" ? "bg-blue-800 text-white" : "bg-blue-600 text-white"}`}>{msg.text}</div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start"><div className="rounded-xl px-4 py-2 bg-blue-800 text-white shadow animate-pulse">Pip is thinking…</div></div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              className="flex flex-col gap-2 p-4 border-t border-blue-800 bg-gray-900"
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
            >
              {/* Prompt Templates */}
              <div className={`w-full flex gap-2 px-0 mb-2 overflow-x-auto flex-nowrap pb-3 min-h-[48px] ${styles['hide-scrollbar']}`}>
                {promptTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    className="bg-blue-800 text-white px-4 py-2 rounded-full text-xs hover:bg-blue-600 transition shadow whitespace-nowrap"
                    onClick={() => setInput(tpl.message)}
                    disabled={loading}
                    title={tpl.message}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              <input
                className="flex-1 rounded-lg px-4 py-3 bg-gray-800 text-white border border-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Type a task or question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 