import { strava } from '@/lib/strava/client';
import { prisma } from '@/lib/db/prisma';

type StravaActivitySummary = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  start_latlng: [number, number] | null;
};

type StravaActivityDetailed = {
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

function extractLocationData(activity: StravaActivityDetailed, athleteId: string) {
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
  let totalWithLocation = 0;

  console.log('[Sync] Starting sync for athlete:', athleteId);

  try {
    while (true) {
      console.log(`[Sync] Fetching page ${page} for athlete ${athleteId}`);

      const activities = await strava.listAthleteActivitiesWithRefresh(
        athleteId,
        { per_page: 200, page }
      ) as unknown as StravaActivitySummary[];

      console.log(`[Sync] Received ${activities.length} activities on page ${page}`);

      if (activities.length === 0) break;

      // Filter for activities with coordinates
      const activitiesWithCoords = activities.filter(a => a.start_latlng && a.start_latlng.length === 2);
      console.log(`[Sync] ${activitiesWithCoords.length} of ${activities.length} activities have coordinates`);

      // Fetch detailed activities to get location data
      const detailedActivities: StravaActivityDetailed[] = [];
      for (let i = 0; i < activitiesWithCoords.length; i++) {
        const activity = activitiesWithCoords[i];
        console.log(`[Sync] Fetching detailed activity ${i + 1}/${activitiesWithCoords.length} (ID: ${activity.id})`);

        try {
          const detailed = await strava.getActivityWithRefresh(
            activity.id.toString(),
            athleteId
          ) as unknown as StravaActivityDetailed;

          if (detailed.location_country) {
            detailedActivities.push(detailed);
            console.log(`[Sync]   ✓ Activity ${activity.id} has location: ${detailed.location_city || 'Unknown city'}, ${detailed.location_country}`);
          } else {
            console.log(`[Sync]   ✗ Activity ${activity.id} has no location data`);
          }
        } catch (error) {
          console.error(`[Sync]   ✗ Failed to fetch activity ${activity.id}:`, error);
          // Continue with other activities
        }
      }

      console.log(`[Sync] ${detailedActivities.length} of ${activitiesWithCoords.length} activities have location data`);

      const locations = detailedActivities.map(a => extractLocationData(a, athleteId));

      if (locations.length > 0) {
        await prisma.activity.createMany({
          data: locations,
          skipDuplicates: true
        });
        totalWithLocation += locations.length;
      }

      totalSynced += activities.length;
      page++;

      await prisma.user.update({
        where: { athleteId },
        data: { syncProgress: totalSynced }
      });

      console.log(`[Sync] Progress: ${totalSynced} total, ${totalWithLocation} with location`);

      await sleep(1000);
    }

    console.log('[Sync] Updating location stats for athlete:', athleteId);
    await updateLocationStats(athleteId);

    const stats = await prisma.locationStat.count({ where: { athleteId } });
    console.log(`[Sync] Created ${stats} location stat records`);

    await prisma.user.update({
      where: { athleteId },
      data: {
        syncStatus: 'COMPLETED',
        lastSyncAt: new Date()
      }
    });

    console.log('[Sync] Sync completed successfully for athlete:', athleteId);
  } catch (error) {
    console.error('[Sync] Sync failed for athlete:', athleteId, error);
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
