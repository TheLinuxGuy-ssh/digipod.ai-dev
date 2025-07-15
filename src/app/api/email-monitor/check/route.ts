import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { emailMonitor } from '@/lib/emailMonitor';

export const dynamic = 'force-dynamic';

// POST /api/email-monitor/check - Manually trigger email checking
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger manual email check for this user
    await emailMonitor.checkUserEmailsManually(userId);

    return NextResponse.json({ success: true, message: 'Email check initiated' });

  } catch (error) {
    console.error('Error triggering email check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/email-monitor/check - Get processing status
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get processing status for this user
    const processingStatus = await emailMonitor.getProcessingStatus(userId);

    return NextResponse.json({ processingStatus });

  } catch (error) {
    console.error('Error getting processing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 