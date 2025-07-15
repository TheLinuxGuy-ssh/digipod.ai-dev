import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { emailMonitor } from '@/lib/backgroundService';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize the email monitoring system
    await emailMonitor.startMonitoring();

    return NextResponse.json({ 
      success: true, 
      message: 'Email monitoring system initialized',
      isRunning: true
    });
  } catch (error) {
    console.error('Error initializing email monitoring:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize email monitoring system' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current status of the email monitoring system
    const status = await emailMonitor.getProcessingStatus(userId);
    
    return NextResponse.json({ 
      success: true, 
      status,
      isRunning: true
    });
  } catch (error) {
    console.error('Error getting email monitoring status:', error);
    return NextResponse.json({ 
      error: 'Failed to get email monitoring status' 
    }, { status: 500 });
  }
} 