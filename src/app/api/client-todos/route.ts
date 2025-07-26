import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { extractEmailTodos } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

interface ClientTodo {
  projectId: string;
  projectName: string;
  task: string;
  dueDate: string | null;
  confidence: number;
  createdAt: string | Date | undefined;
}

export async function GET(req: NextRequest) {
  try {
  const userId = await getUserIdFromRequest(req);
    if (!userId) {
      console.error('No userId returned from getUserIdFromRequest. Check token verification logs above.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  // Fetch all projects for this user
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
  const todos: ClientTodo[] = [];
  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data() as { name?: string };
    // Fetch recent client messages
    const msgsSnap = await db.collection('projects').doc(projectDoc.id).collection('clientMessages')
      .where('from', '==', 'CLIENT')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    for (const msgDoc of msgsSnap.docs) {
      const msg = msgDoc.data();
      if (msg.body) {
        const extracted = await extractEmailTodos(msg.body);
        for (const todo of extracted) {
          todos.push({
            projectId: projectDoc.id,
            projectName: project.name || '',
            task: todo.task,
            dueDate: todo.dueDate,
            confidence: todo.confidence,
            createdAt: msg.createdAt,
          });
        }
      }
    }
  }
  // Fetch explicit todos from the 'todos' collection
  const todosSnap = await db.collection('todos').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(20).get();
  for (const doc of todosSnap.docs) {
    const data = doc.data();
    todos.push({
      projectId: data.projectId || '',
      projectName: data.projectName || '',
      task: data.task,
      dueDate: data.dueDate || null,
      confidence: typeof data.confidence === 'number' ? data.confidence : 1,
        createdAt: data.createdAt
    });
  }
  // Sort by createdAt descending
  todos.sort((a, b) => {
    const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
    const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
    return bDate.getTime() - aDate.getTime();
  });
  return NextResponse.json({ todos });
  } catch (err) {
    console.error('Error in /api/client-todos GET:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
} 