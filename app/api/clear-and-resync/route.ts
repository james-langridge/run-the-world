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

    console.log('[Clear and Re-sync API] Clearing location data for athlete:', athleteId);

    // Delete all activities and location stats
    await prisma.$transaction([
      prisma.activity.deleteMany({ where: { athleteId } }),
      prisma.locationStat.deleteMany({ where: { athleteId } })
    ]);

    console.log('[Clear and Re-sync API] Location data cleared, starting fresh sync');

    await prisma.user.update({
      where: { athleteId },
      data: {
        syncStatus: 'SYNCING',
        syncProgress: 0,
        syncStartedAt: new Date()
      }
    });

    syncActivities(athleteId).catch(error => {
      console.error('[Clear and Re-sync API] Background sync error:', error);
    });

    return NextResponse.json({
      status: 'syncing',
      athleteId
    });
  } catch (error) {
    console.error('[Clear and Re-sync API] Endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to clear and re-sync' },
      { status: 500 }
    );
  }
}
