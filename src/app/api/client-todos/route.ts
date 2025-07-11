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
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  return NextResponse.json({ todos });
} 