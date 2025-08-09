import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { callGeminiAPI } from '@/lib/gemini';
import { db } from '@/lib/firebaseAdmin';
import { sendPushToUser } from '@/lib/pushNotifications';

// Placeholder: implement your own logic for these
async function addTodoForUser(task: string, token: string, dueDate?: string | null, projectId?: string, projectName?: string) {
  // Get user ID from token
  const userId = await getUserIdFromRequest({ headers: new Headers({ 'authorization': `Bearer ${token}` }) } as NextRequest);
  if (!userId) {
    return { reply: 'Failed to add to-do: authentication error.' };
  }
  
  try {
    // Add todo directly to database
    await db.collection('todos').add({
      userId,
      task,
      dueDate: dueDate || null,
      projectId: projectId || 'general',
      projectName: projectName || 'General',
      createdAt: new Date(),
      status: 'pending'
    });
    
    return { reply: `Added to-do: "${task}"${dueDate ? ` (Due: ${dueDate})` : ''}` };
  } catch (error) {
    console.error('Error adding todo:', error);
    return { reply: 'Failed to add to-do due to database error.' };
  }
}
async function getMetricsForUser() {
  // Call your real metrics API here
  return { reply: 'You have 3 active projects and 5 pending tasks.' };
}

// Add more handlers for new intents
async function listTodosForUser(userId: string) {
  const todosSnap = await db.collection('todos').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(10).get();
  const todos = todosSnap.docs.map(doc => doc.data().task).join(', ');
  return { reply: todos ? `Your to-dos: ${todos}` : 'No to-dos found.' };
}
async function createProjectForUser(userId: string, name: string) {
  await db.collection('projects').add({
    userId,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentPhase: 'DISCOVERY',
    status: 'active'
  });
  return { reply: `Created new project: ${name}` };
}
async function listProjectsForUser(userId: string) {
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
  const names = projectsSnap.docs.map(doc => doc.data().name).join(', ');
  return { reply: names ? `Your projects: ${names}` : 'No projects found.' };
}
async function getProjectStatusForUser(userId: string, name: string) {
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).where('name', '==', name).limit(1).get();
  if (projectsSnap.empty) return { reply: `No project found with name '${name}'.` };
  const project = projectsSnap.docs[0].data();
  return { reply: `Project '${name}' is in phase: ${project.currentPhase}` };
}
async function advanceProjectPhaseForUser(userId: string, name: string) {
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).where('name', '==', name).limit(1).get();
  if (projectsSnap.empty) return { reply: `No project found with name '${name}'.` };
  const projectRef = projectsSnap.docs[0].ref;
  const project = projectsSnap.docs[0].data();
  const phases = ['DISCOVERY', 'DESIGN', 'REVISIONS', 'DELIVERY'];
  const idx = phases.indexOf(project.currentPhase);
  if (idx === -1 || idx >= phases.length - 1) return { reply: 'Already at final phase.' };
  const nextPhase = phases[idx + 1];
  await projectRef.update({ currentPhase: nextPhase, updatedAt: new Date() });
  return { reply: `Project '${name}' advanced to phase: ${nextPhase}` };
}
async function listAIDraftsForUser(userId: string) {
  // Get all projects for this user
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
  let drafts: { subject: string; createdAt: Date; projectName?: string }[] = [];
  for (const projectDoc of projectsSnap.docs) {
    const project = projectDoc.data();
    const clientMsgsSnap = await db.collection('projects').doc(projectDoc.id).collection('clientMessages')
      .where('from', '==', 'AI')
      .where('status', '==', 'draft')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();
    for (const msgDoc of clientMsgsSnap.docs) {
      const msg = msgDoc.data();
      drafts.push({
        subject: msg.subject || 'AI Draft',
        createdAt: msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt?.toDate?.() || new Date()),
        projectName: project.name || undefined
      });
    }
  }
  drafts = drafts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
  return { reply: drafts.length ? `Your AI drafts: ${drafts.map(d => d.subject + (d.projectName ? ` (${d.projectName})` : '')).join(', ')}` : 'No AI drafts found.' };
}
async function approveAIDraftForUser() {
  // For demo, just reply; real logic would update a draft's status
  return { reply: 'Approved the latest AI draft.' };
}
async function listClientsForUser(userId: string) {
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
  const clients = Array.from(new Set(projectsSnap.docs.map(doc => doc.data().clientEmail).filter(Boolean))).join(', ');
  return { reply: clients ? `Your clients: ${clients}` : 'No clients found.' };
}
async function addClientFilterForUser(userId: string, email: string) {
  await db.collection('clientEmailFilters').add({
    userId,
    emailAddress: email.toLowerCase(),
    isActive: true,
    createdAt: new Date()
  });
  return { reply: `Added client filter for ${email}` };
}
async function showPaymentsForUser(userId: string) {
  const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
  const payments = projectsSnap.docs
    .map(doc => doc.data())
    .filter(data => data && data.paymentStatus === 'pending' && data.name)
    .map(data => {
      const amount = data.totalAmount !== undefined && data.totalAmount !== null ? data.totalAmount : 'amount unknown';
      return `${data.name} (₹${amount})`;
    });
  return { reply: payments.length ? `Pending payments for: ${payments.join(', ')}` : 'No pending payments.' };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    console.log('🔍 Processing Copilot message:', message);
    console.log('🔍 User ID:', userId);

    // 1. Call Gemini API to extract intent
    let geminiRes;
    try {
      geminiRes = await callGeminiAPI(message);
      console.log('🔍 Gemini response:', geminiRes);
    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      return NextResponse.json({ 
        reply: 'Sorry, I encountered an error processing your request. Please try again.'
      }, { status: 500 });
    }

    // 2. Route to the correct internal API
    let result;
    let push: { title: string; body: string; data?: Record<string,string> } | null = null;
    switch (geminiRes.action) {
      case 'add_todo': {
        const authHeader = req.headers.get('authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '') : '';
        result = await addTodoForUser(
          geminiRes.params.task as string,
          token,
          geminiRes.params.dueDate as string | undefined,
          geminiRes.params.projectId as string | undefined,
          geminiRes.params.projectName as string | undefined
        );
        push = {
          title: 'To-do added',
          body: geminiRes.params.task as string,
          data: { changeType: 'new_todo', projectId: (geminiRes.params.projectId as string) || 'general' }
        };
        break;
      }
      case 'list_todos':
        result = await listTodosForUser(userId);
        break;
      case 'create_project':
        result = await createProjectForUser(userId, geminiRes.params.name as string);
        push = { title: 'Project created', body: geminiRes.params.name as string, data: { changeType: 'ai_activity' } };
        break;
      case 'list_projects':
        result = await listProjectsForUser(userId);
        break;
      case 'get_project_status':
        result = await getProjectStatusForUser(userId, geminiRes.params.name as string);
        break;
      case 'advance_phase':
        result = await advanceProjectPhaseForUser(userId, geminiRes.params.name as string);
        push = { title: 'Project phase advanced', body: geminiRes.params.name as string, data: { changeType: 'phase_advance' } };
        break;
      case 'list_ai_drafts':
        result = await listAIDraftsForUser(userId);
        break;
      case 'approve_ai_draft':
        result = await approveAIDraftForUser();
        break;
      case 'list_clients':
        result = await listClientsForUser(userId);
        break;
      case 'add_client_filter':
        result = await addClientFilterForUser(userId, geminiRes.params.email as string);
        push = { title: 'Client filter added', body: geminiRes.params.email as string, data: { changeType: 'ai_activity' } };
        break;
      case 'show_payments':
        result = await showPaymentsForUser(userId);
        break;
      case 'get_metrics':
        result = await getMetricsForUser();
        break;
      case 'help':
        result = { reply: "I can help you add to-dos, fetch project statuses, get metrics, and more! Try asking: 'Add a to-do', 'Show my project status', or 'Get my metrics'." };
        break;
      default:
        result = { reply: "Sorry, I didn't understand that yet." };
    }

    // 2.5 Send push for impactful actions
    if (push) {
      await sendPushToUser({ userId, title: push.title, body: push.body, data: push.data, silent: false });
    }

    // 3. Return a chat-friendly response
    return NextResponse.json({ 
      reply: result.reply || 'Done!'
    });
  } catch (error) {
    console.error('Error in Copilot API:', error);
    return NextResponse.json({ 
      reply: 'Sorry, I encountered an error processing your request.'
    }, { status: 500 });
  }
} 