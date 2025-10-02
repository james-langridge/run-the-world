import { NextRequest, NextResponse } from 'next/server';
import { syncActivities } from '@/lib/actions/sync';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const { athleteId } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: 'athleteId is required' },
        { status: 400 }
      );
    }

    console.log('[Sync API] Starting sync for athlete:', athleteId);

    // Get current user to preserve progress
    const user = await prisma.user.findUnique({
      where: { athleteId },
      select: { syncProgress: true }
    });

    await prisma.user.update({
      where: { athleteId },
      data: {
        syncStatus: 'SYNCING',
        syncProgress: user?.syncProgress || 0, // Preserve existing progress
        syncStartedAt: new Date()
      }
    });

    console.log('[Sync API] Updated user status to SYNCING');

    syncActivities(athleteId).catch(error => {
      console.error('[Sync API] Background sync error:', error);
    });

    return NextResponse.json({
      status: 'syncing',
      athleteId
    });
  } catch (error) {
    console.error('[Sync API] Sync endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}
