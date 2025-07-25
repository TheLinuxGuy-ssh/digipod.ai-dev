"use client";

import React, { useEffect, useState } from 'react';

interface Task {
  task: string;
  dueDate?: string;
  type?: 'project' | 'calendar';
  projectName?: string;
  confidence?: number;
  createdAt?: string | Date;
  source?: 'AI' | 'CoPilot';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      try {
        const res = await fetch('/api/client-todos');
        const data = await res.json();
        // Add a 'source' field for grouping (AI if confidence < 1, CoPilot if confidence === 1)
        const withSource = (data.todos || []).map((t: unknown) => {
          const task = t as Task;
          return {
            ...task,
            source: typeof task.confidence === 'number' && task.confidence < 1 ? 'AI' : 'CoPilot',
          };
        });
        setTasks(withSource);
      } catch {
        setTasks([]);
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  // Get unique projects and sources
  const projects = Array.from(new Set(tasks.map(t => t.projectName || 'General')));
  const sources = Array.from(new Set(tasks.map(t => t.source || 'Unknown')));

  // Filtered tasks
  const filtered = tasks.filter(t =>
    (filterProject === 'all' || (t.projectName || 'General') === filterProject) &&
    (filterSource === 'all' || t.source === filterSource)
  );

  // Group by project
  const grouped = filtered.reduce((acc, t) => {
    const key = t.projectName || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">All Tasks</h1>
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Project</label>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border rounded px-2 py-1">
            <option value="all">All</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Source</label>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="border rounded px-2 py-1">
            <option value="all">All</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-blue-500">Loading tasks...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-gray-400">No tasks found.</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([project, tasks]) => (
            <div key={project}>
              <h2 className="text-xl font-bold mb-2">{project}</h2>
              <div className="space-y-2">
                {tasks.map((task, i) => (
                  <div key={i} className="bg-white/10 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between border border-blue-200/10">
                    <div>
                      <div className="font-semibold text-blue-100">{task.task}</div>
                      <div className="text-xs text-blue-300 flex gap-2 mt-1">
                        {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        <span>Source: <span className="font-bold">{task.source}</span></span>
                        {task.confidence !== undefined && <span>Confidence: {(task.confidence * 100).toFixed(0)}%</span>}
                      </div>
                    </div>
                    <div className="mt-2 md:mt-0 text-xs text-blue-200">
                      {task.createdAt && <span>Created: {new Date(task.createdAt as string | number | Date).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
} 