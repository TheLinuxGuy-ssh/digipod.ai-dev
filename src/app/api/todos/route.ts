import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { sendPushToUser } from '@/lib/pushNotifications';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    console.log('Received /api/todos POST body:', body);
    const { task, dueDate, projectId, projectName } = body;
    if (!task) return NextResponse.json({ error: 'Missing task' }, { status: 400 });

    const docRef = await db.collection('todos').add({
      userId,
      task,
      dueDate: dueDate || null,
      projectId: projectId || '',
      projectName: projectName || '',
      createdAt: new Date(),
      status: 'pending'
    });

    // Fire a push notification to the user for the new todo
    await sendPushToUser({
      userId,
      title: 'New to-do added',
      body: task,
      data: {
        changeType: 'new_todo',
        projectId: projectId || '',
        projectName: projectName || '',
        description: task,
      },
      silent: false,
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error('Error in /api/todos POST:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 