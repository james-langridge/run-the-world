import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

async function updateLocationStats(athleteId: string): Promise<void> {
  const activities = await prisma.activity.findMany({
    where: { athleteId }
  });

  const statsMap = new Map<string, {
    country: string;
    city: string | null;
    activityCount: number;
    totalDistance: number;
    totalTime: number;
    firstActivity: Date;
    lastActivity: Date;
  }>();

  for (const activity of activities) {
    const key = `${activity.country}|${activity.city || ''}`;
    const existing = statsMap.get(key);

    if (existing) {
      existing.activityCount++;
      existing.totalDistance += activity.distance;
      existing.totalTime += activity.movingTime;
      existing.firstActivity = activity.startDate < existing.firstActivity
        ? activity.startDate
        : existing.firstActivity;
      existing.lastActivity = activity.startDate > existing.lastActivity
        ? activity.startDate
        : existing.lastActivity;
    } else {
      statsMap.set(key, {
        country: activity.country,
        city: activity.city,
        activityCount: 1,
        totalDistance: activity.distance,
        totalTime: activity.movingTime,
        firstActivity: activity.startDate,
        lastActivity: activity.startDate
      });
    }
  }

  await prisma.locationStat.deleteMany({
    where: { athleteId }
  });

  const stats = Array.from(statsMap.values()).map(stat => ({
    athleteId,
    ...stat
  }));

  if (stats.length > 0) {
    await prisma.locationStat.createMany({
      data: stats
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { athleteId } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: 'athleteId is required' },
        { status: 400 }
      );
    }

    console.log('[Update Stats API] Updating stats for athlete:', athleteId);

    await updateLocationStats(athleteId);

    const count = await prisma.locationStat.count({ where: { athleteId } });

    console.log('[Update Stats API] Created', count, 'location stat records');

    return NextResponse.json({
      success: true,
      statsCount: count
    });
  } catch (error) {
    console.error('[Update Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update stats' },
      { status: 500 }
    );
  }
}
