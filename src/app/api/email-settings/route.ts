import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { EmailSettings } from '@/lib/emailMonitor';

export const dynamic = 'force-dynamic';

// GET /api/email-settings - Get all email settings for user
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settingsSnap = await db.collection('emailSettings')
      .where('userId', '==', userId)
      .get();

    const settings = settingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/email-settings - Create new email setting
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      provider,
      email,
      gmailToken,
      imapHost,
      imapPort,
      imapSecure,
      username,
      passwordEnc,
      checkInterval = 5
    } = body;

    // Validate required fields
    if (!provider || !email) {
      return NextResponse.json({ error: 'Provider and email are required' }, { status: 400 });
    }

    if (provider === 'gmail' && !gmailToken) {
      return NextResponse.json({ error: 'Gmail token is required for Gmail provider' }, { status: 400 });
    }

    if (provider === 'imap' && (!imapHost || !username || !passwordEnc)) {
      return NextResponse.json({ error: 'IMAP host, username, and password are required for IMAP provider' }, { status: 400 });
    }

    // Check if user already has an email setting for this provider
    const existingSnap = await db.collection('emailSettings')
      .where('userId', '==', userId)
      .where('provider', '==', provider)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: `Email setting for ${provider} already exists` }, { status: 409 });
    }

    // Create new email setting
    const emailSetting: Omit<EmailSettings, 'id'> = {
      userId,
      provider,
      email,
      gmailToken,
      imapHost,
      imapPort,
      imapSecure,
      username,
      passwordEnc,
      isActive: true,
      checkInterval,
      lastChecked: new Date()
    };

    const docRef = await db.collection('emailSettings').add(emailSetting);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      setting: { id: docRef.id, ...emailSetting }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating email setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/email-settings - Update email setting
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Setting ID is required' }, { status: 400 });
    }

    // Verify the setting belongs to the user
    const settingSnap = await db.collection('emailSettings').doc(id).get();
    if (!settingSnap.exists) {
      return NextResponse.json({ error: 'Email setting not found' }, { status: 404 });
    }

    const setting = settingSnap.data();
    if (setting?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the setting
    await db.collection('emailSettings').doc(id).update({
      ...updateData,
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating email setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/email-settings - Delete email setting
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Setting ID is required' }, { status: 400 });
    }

    // Verify the setting belongs to the user
    const settingSnap = await db.collection('emailSettings').doc(id).get();
    if (!settingSnap.exists) {
      return NextResponse.json({ error: 'Email setting not found' }, { status: 404 });
    }

    const setting = settingSnap.data();
    if (setting?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the setting
    await db.collection('emailSettings').doc(id).delete();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting email setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 