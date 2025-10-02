import { strava } from '@/lib/strava/client';
import { prisma } from '@/lib/db/prisma';
import { reverseGeocode } from '@/lib/geocoding/nominatim';
import { isServerShuttingDown } from '@/lib/shutdown';
import { RateLimitError, type StravaActivity } from 'strava-sdk';

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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If it's a rate limit error, use the suggested retry time
      if (error instanceof RateLimitError) {
        const retryAfterSeconds = error.retryAfter ?? 900; // Default to 15 min
        const retryAfterMs = retryAfterSeconds * 1000;

        console.log(`[Retry] Rate limit hit, waiting ${retryAfterSeconds}s before retry ${attempt + 1}/${maxRetries}`);

        if (attempt < maxRetries) {
          await sleep(retryAfterMs);
          continue;
        }
      }

      // For other errors, use exponential backoff
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }

      // Max retries exhausted
      throw error;
    }
  }

  throw lastError;
}

export async function syncActivities(athleteId: string): Promise<void> {
  let page = 1;
  let totalSynced = 0;
  let totalWithLocation = 0;

  console.log('[Sync] Starting sync for athlete:', athleteId);

  try {
    while (true) {
      // Check if server is shutting down
      if (isServerShuttingDown()) {
        console.log('[Sync] Server shutting down, exiting sync');
        return;
      }

      console.log(`[Sync] Fetching page ${page} for athlete ${athleteId}`);

      const activities = await retryWithBackoff(
        async () => strava.listAthleteActivitiesWithRefresh(
          athleteId,
          { per_page: 200, page }
        ),
        3 // Max 3 retries for listing activities
      );

      console.log(`[Sync] Received ${activities.length} activities on page ${page}`);

      if (activities.length === 0) break;

      // Filter for activities with coordinates
      const activitiesWithCoords = activities.filter((a: StravaActivity) => a.start_latlng && a.start_latlng.length === 2);
      console.log(`[Sync] ${activitiesWithCoords.length} of ${activities.length} activities have coordinates`);

      // Check which activities we already have WITH location data
      const activityIds = activitiesWithCoords.map((a: StravaActivity) => a.id.toString());
      const existingActivities = await prisma.activity.findMany({
        where: {
          athleteId,
          activityId: { in: activityIds },
          country: { not: 'Unknown' } // Only skip if we have real location data
        },
        select: { activityId: true }
      });
      const existingWithLocationIds = new Set(existingActivities.map((a: { activityId: string }) => a.activityId));
      const activitiesToFetch = activitiesWithCoords.filter((a: StravaActivity) => !existingWithLocationIds.has(a.id.toString()));

      console.log(`[Sync] ${existingWithLocationIds.size} activities already have location data, ${activitiesToFetch.length} activities to fetch`);

      // Fetch detailed activities to get location data
      const detailedActivities: StravaActivity[] = [];
      for (let i = 0; i < activitiesToFetch.length; i++) {
        const activity = activitiesToFetch[i];
        console.log(`[Sync] Fetching detailed activity ${i + 1}/${activitiesToFetch.length} (ID: ${activity.id})`);

        try {
          const detailed = await retryWithBackoff(
            async () => strava.getActivityWithRefresh(
              activity.id.toString(),
              athleteId
            ),
            3 // Max 3 retries per activity
          );

          // If Strava doesn't provide location data, use reverse geocoding
          if (!detailed.location_country && detailed.start_latlng && detailed.start_latlng.length === 2) {
            const [lat, lng] = detailed.start_latlng;
            console.log(`[Sync]   Strava has no location data, reverse geocoding ${lat},${lng}...`);

            const geocoded = await reverseGeocode(lat, lng);

            if (geocoded.country) {
              // Update the detailed object with geocoded data
              detailed.location_country = geocoded.country;
              detailed.location_city = geocoded.city;
              detailed.location_state = geocoded.state;

              detailedActivities.push(detailed);
              console.log(`[Sync]   ✓ Activity ${activity.id} geocoded: ${geocoded.city || 'Unknown city'}, ${geocoded.country}`);
            } else {
              console.log(`[Sync]   ✗ Activity ${activity.id} geocoding failed, no country found`);
            }
          } else if (detailed.location_country) {
            detailedActivities.push(detailed);
            console.log(`[Sync]   ✓ Activity ${activity.id} has Strava location: ${detailed.location_city || 'Unknown city'}, ${detailed.location_country}`);
          } else {
            console.log(`[Sync]   ✗ Activity ${activity.id} has no coordinates for geocoding`);
          }
        } catch (error) {
          if (error instanceof RateLimitError) {
            console.error(`[Sync]   ✗ Rate limit exceeded for activity ${activity.id}`);
            // Re-throw to stop this batch and wait
            throw error;
          }
          console.error(`[Sync]   ✗ Failed to fetch activity ${activity.id}:`, error);
          // Continue with other activities for non-rate-limit errors
        }
      }

      console.log(`[Sync] ${detailedActivities.length} of ${activitiesToFetch.length} fetched activities have location data`);

      const locations = detailedActivities.map(a => extractLocationData(a, athleteId));

      if (locations.length > 0) {
        // Delete any existing records (those with country='Unknown') before inserting updates
        const locationIds = locations.map(l => l.activityId);
        await prisma.activity.deleteMany({
          where: {
            athleteId,
            activityId: { in: locationIds }
          }
        });

        // Insert all activities (new and updated)
        await prisma.activity.createMany({
          data: locations
        });
        totalWithLocation += locations.length;

        // Update location stats incrementally so data appears in UI
        console.log('[Sync] Updating location stats...');
        await updateLocationStats(athleteId);
      }

      totalSynced += activities.length;
      page++;

      await prisma.user.update({
        where: { athleteId },
        data: {
          syncProgress: totalSynced,
          syncStartedAt: new Date() // Update to show activity
        }
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
      data: {
        syncStatus: 'FAILED'
      }
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
