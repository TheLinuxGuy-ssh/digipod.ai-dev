import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';

export const dynamic = 'force-dynamic';

interface AIChange {
  type: 'phase_advance' | 'new_todo' | 'new_draft' | 'email_processed' | 'ai_activity';
  projectId?: string;
  projectName?: string;
  description: string;
  timestamp: Date;
  impact: 'high' | 'medium' | 'low';
}

export async function GET(req: NextRequest) {
  try {
    console.log('Dashboard summary API called');
    
    const userId = await getUserIdFromRequest(req);
    console.log('User ID from request:', userId);
    
    if (!userId) {
      console.log('No user ID found, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const changes: AIChange[] = [];
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('Fetching projects for user:', userId);
    
    // Get all projects for this user
    const projectsSnap = await db.collection('projects').where('userId', '==', userId).get();
    const projects = projectsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{
      id: string;
      name: string;
      userId: string;
      phaseHistory?: Array<{
        phase: string;
        timestamp: Date | string;
      }>;
    }>;
    
    console.log('Found projects:', projects.length);

    // 1. Check for recent phase advances (AI-driven or manual)
    for (const project of projects) {
      if (project.phaseHistory && Array.isArray(project.phaseHistory)) {
        const recentPhaseChanges = project.phaseHistory
          .filter((phase: { phase: string; timestamp: Date | string }) => {
            const phaseDate = phase.timestamp instanceof Date ? phase.timestamp : new Date(phase.timestamp);
            return phaseDate > last24Hours;
          })
          .sort((a: { phase: string; timestamp: Date | string }, b: { phase: string; timestamp: Date | string }) => {
            const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
          });

        for (const phaseChange of recentPhaseChanges) {
          changes.push({
            type: 'phase_advance',
            projectId: project.id,
            projectName: project.name,
            description: `Project "${project.name}" advanced to ${phaseChange.phase} phase`,
            timestamp: phaseChange.timestamp instanceof Date ? phaseChange.timestamp : new Date(phaseChange.timestamp),
            impact: 'high'
          });
        }
      }
    }

    // 2. Check for new AI-generated todos (with error handling)
    try {
      const recentTodosSnap = await db.collection('todos')
        .where('userId', '==', userId)
        .where('createdAt', '>', last24Hours)
        .orderBy('createdAt', 'desc')
        .get();

      for (const todoDoc of recentTodosSnap.docs) {
        const todo = todoDoc.data();
        const project = projects.find(p => p.id === todo.projectId);
        changes.push({
          type: 'new_todo',
          projectId: todo.projectId,
          projectName: project?.name || 'Unknown Project',
          description: `New AI-extracted todo: "${todo.task}"`,
          timestamp: todo.createdAt.toDate(),
          impact: todo.confidence > 0.8 ? 'high' : todo.confidence > 0.6 ? 'medium' : 'low'
        });
      }
    } catch (error) {
      console.log('Error fetching todos:', error);
      // Continue without todos
    }

    // 3. Check for new AI drafts (with error handling)
    try {
      const recentDraftsSnap = await db.collection('aiDrafts')
        .where('status', '==', 'draft')
        .where('createdAt', '>', last24Hours)
        .orderBy('createdAt', 'desc')
        .get();

      for (const draftDoc of recentDraftsSnap.docs) {
        const draft = draftDoc.data();
        const project = projects.find(p => p.id === draft.projectId);
        changes.push({
          type: 'new_draft',
          projectId: draft.projectId,
          projectName: project?.name || 'Unknown Project',
          description: `New AI draft generated: "${draft.subject}"`,
          timestamp: draft.createdAt.toDate(),
          impact: 'high'
        });
      }
    } catch (error) {
      console.log('Error fetching AI drafts:', error);
      // Continue without drafts
    }

    // 4. Check for processed emails (AI processing) - with error handling
    try {
      const recentProcessedEmailsSnap = await db.collection('processedEmails')
        .where('userId', '==', userId)
        .where('processedAt', '>', last24Hours)
        .orderBy('processedAt', 'desc')
        .get();

      for (const emailDoc of recentProcessedEmailsSnap.docs) {
        const email = emailDoc.data();
        const project = projects.find(p => p.id === email.projectId);
        changes.push({
          type: 'email_processed',
          projectId: email.projectId,
          projectName: project?.name || 'Unknown Project',
          description: `AI processed email from ${email.from}: "${email.subject}"`,
          timestamp: email.processedAt.toDate(),
          impact: 'medium'
        });
      }
    } catch (error) {
      console.log('Error fetching processed emails:', error);
      // Continue without processed emails
    }

    // 5. Check for AI activity in client messages (with error handling)
    for (const project of projects) {
      try {
        const recentMessagesSnap = await db.collection('projects')
          .doc(project.id)
          .collection('clientMessages')
          .where('createdAt', '>', last24Hours)
          .orderBy('createdAt', 'desc')
          .get();

        for (const msgDoc of recentMessagesSnap.docs) {
          const message = msgDoc.data();
          if (message.from === 'AI') {
            changes.push({
              type: 'ai_activity',
              projectId: project.id,
              projectName: project.name,
              description: `AI generated response for project "${project.name}"`,
              timestamp: message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt),
              impact: 'medium'
            });
          }
        }
      } catch (error) {
        console.log(`Error fetching client messages for project ${project.id}:`, error);
        // Continue without this project's messages
      }
    }

    // Sort all changes by timestamp (most recent first)
    changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Calculate summary statistics
    const summary = {
      totalChanges: changes.length,
      phaseAdvances: changes.filter(c => c.type === 'phase_advance').length,
      newTodos: changes.filter(c => c.type === 'new_todo').length,
      newDrafts: changes.filter(c => c.type === 'new_draft').length,
      processedEmails: changes.filter(c => c.type === 'email_processed').length,
      aiActivities: changes.filter(c => c.type === 'ai_activity').length,
      highImpactChanges: changes.filter(c => c.impact === 'high').length,
      mediumImpactChanges: changes.filter(c => c.impact === 'medium').length,
      lowImpactChanges: changes.filter(c => c.impact === 'low').length
    };

    // Generate a human-readable summary
    let summaryText = '';
    if (changes.length === 0) {
      summaryText = "No AI-driven changes detected in the last 24 hours.";
    } else {
      const highImpact = changes.filter(c => c.impact === 'high');
      const mediumImpact = changes.filter(c => c.impact === 'medium');
      
      if (highImpact.length > 0) {
        summaryText += `🚀 ${highImpact.length} high-impact AI changes: `;
        summaryText += highImpact.slice(0, 3).map(c => c.description.split(':')[0]).join(', ');
        if (highImpact.length > 3) summaryText += ` and ${highImpact.length - 3} more`;
        summaryText += '. ';
      }
      
      if (mediumImpact.length > 0) {
        summaryText += `📈 ${mediumImpact.length} medium-impact changes including new todos and processed emails. `;
      }
      
      summaryText += `Total: ${changes.length} AI activities in the last 24 hours.`;
    }

    console.log('Returning successful response with', changes.length, 'changes');
    
    return NextResponse.json({
      changes,
      summary,
      summaryText,
      lastUpdated: now.toISOString()
    });

  } catch (error) {
    console.error('Error generating dashboard summary:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      error: 'Failed to generate dashboard summary',
      changes: [],
      summary: {
        totalChanges: 0,
        phaseAdvances: 0,
        newTodos: 0,
        newDrafts: 0,
        processedEmails: 0,
        aiActivities: 0,
        highImpactChanges: 0,
        mediumImpactChanges: 0,
        lowImpactChanges: 0
      },
      summaryText: "Unable to load AI changes summary.",
      lastUpdated: new Date().toISOString()
    }, { status: 500 });
  }
} 