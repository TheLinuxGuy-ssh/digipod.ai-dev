import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/getUserFromRequest';
import { ClientEmailFilter } from '@/lib/emailMonitor';

export const dynamic = 'force-dynamic';

// GET /api/client-filters - Get all client email filters for user
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filtersSnap = await db.collection('clientEmailFilters')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const filters = filtersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ filters });
  } catch (error) {
    console.error('Error fetching client filters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client-filters - Create new client email filter
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { emailAddress, projectId } = body;

    // Validate required fields
    if (!emailAddress) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if filter already exists for this email
    const existingSnap = await db.collection('clientEmailFilters')
      .where('userId', '==', userId)
      .where('emailAddress', '==', emailAddress.toLowerCase())
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Filter for this email already exists' }, { status: 409 });
    }

    // If projectId is provided, verify it belongs to the user
    if (projectId) {
      const projectSnap = await db.collection('projects').doc(projectId).get();
      if (!projectSnap.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      const project = projectSnap.data();
      if (project?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Create new client filter
    const clientFilter: Omit<ClientEmailFilter, 'id'> = {
      userId,
      emailAddress: emailAddress.toLowerCase(),
      projectId,
      isActive: true,
      createdAt: new Date()
    };

    const docRef = await db.collection('clientEmailFilters').add(clientFilter);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      filter: { id: docRef.id, ...clientFilter }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating client filter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/client-filters - Update client email filter
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }

    // Verify the filter belongs to the user
    const filterSnap = await db.collection('clientEmailFilters').doc(id).get();
    if (!filterSnap.exists) {
      return NextResponse.json({ error: 'Client filter not found' }, { status: 404 });
    }

    const filter = filterSnap.data();
    if (filter?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If updating email address, validate format and check for duplicates
    if (updateData.emailAddress) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.emailAddress)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      // Check for duplicates (excluding current filter)
      const duplicateSnap = await db.collection('clientEmailFilters')
        .where('userId', '==', userId)
        .where('emailAddress', '==', updateData.emailAddress.toLowerCase())
        .get();

      const duplicates = duplicateSnap.docs.filter(doc => doc.id !== id);
      if (duplicates.length > 0) {
        return NextResponse.json({ error: 'Filter for this email already exists' }, { status: 409 });
      }

      updateData.emailAddress = updateData.emailAddress.toLowerCase();
    }

    // If updating projectId, verify it belongs to the user
    if (updateData.projectId) {
      const projectSnap = await db.collection('projects').doc(updateData.projectId).get();
      if (!projectSnap.exists) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      const project = projectSnap.data();
      if (project?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Update the filter
    await db.collection('clientEmailFilters').doc(id).update({
      ...updateData,
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating client filter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client-filters - Delete client email filter
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Filter ID is required' }, { status: 400 });
    }

    // Verify the filter belongs to the user
    const filterSnap = await db.collection('clientEmailFilters').doc(id).get();
    if (!filterSnap.exists) {
      return NextResponse.json({ error: 'Client filter not found' }, { status: 404 });
    }

    const filter = filterSnap.data();
    if (filter?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the filter
    await db.collection('clientEmailFilters').doc(id).delete();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting client filter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 