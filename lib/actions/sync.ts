import { strava } from '@/lib/strava/client';
import { prisma } from '@/lib/db/prisma';

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  location_country: string | null;
  location_city: string | null;
  location_state: string | null;
};

function extractLocationData(activity: StravaActivity, athleteId: string) {
  return {
    athleteId,
    activityId: activity.id.toString(),
    name: activity.name,
    type: activity.type,
    distance: activity.distance,
    movingTime: activity.moving_time,
    startDate: new Date(activity.start_date),
    country: activity.location_country || 'Unknown',
    city: activity.location_city,
    state: activity.location_state
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function syncActivities(athleteId: string): Promise<void> {
  let page = 1;
  let totalSynced = 0;

  await prisma.user.update({
    where: { athleteId },
    data: { syncStatus: 'SYNCING', syncProgress: 0 }
  });

  try {
    while (true) {
      const activities = await strava.listAthleteActivitiesWithRefresh(
        athleteId,
        { per_page: 200, page }
      ) as unknown as StravaActivity[];

      if (activities.length === 0) break;

      const locations = activities
        .filter(a => a.location_country)
        .map(a => extractLocationData(a, athleteId));

      await prisma.activity.createMany({
        data: locations,
        skipDuplicates: true
      });

      totalSynced += activities.length;
      page++;

      await prisma.user.update({
        where: { athleteId },
        data: { syncProgress: totalSynced }
      });

      await sleep(1000);
    }

    await updateLocationStats(athleteId);

    await prisma.user.update({
      where: { athleteId },
      data: {
        syncStatus: 'COMPLETED',
        lastSyncAt: new Date()
      }
    });
  } catch (error) {
    await prisma.user.update({
      where: { athleteId },
      data: { syncStatus: 'FAILED' }
    });
    throw error;
  }
}

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
