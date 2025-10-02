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
  let totalWithLocation = 0;

  const BATCH_SIZE = 20; // Insert activities every 20
  const PROGRESS_UPDATE_INTERVAL = 10; // Update progress every 10 activities

  console.log('[Sync] Starting sync for athlete:', athleteId);

  // Get current progress for resuming
  const user = await prisma.user.findUnique({
    where: { athleteId },
    select: { syncProgress: true }
  });
  let totalSynced = user?.syncProgress || 0;
  console.log(`[Sync] Resuming from ${totalSynced} activities already processed`);

  try {
    // Fetch athlete stats to get total activity count
    try {
      console.log('[Sync] Fetching athlete stats for total activity count');

      // Get fresh token
      const token = await prisma.token.findUnique({ where: { athleteId } });
      if (!token) throw new Error('No token found');

      const response = await fetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
        headers: { Authorization: `Bearer ${token.accessToken}` }
      });

      if (!response.ok) throw new Error(`Stats API returned ${response.status}`);

      const stats = await response.json();

      // Sum up all activity types
      const totalActivities = (
        (stats.all_run_totals?.count || 0) +
        (stats.all_ride_totals?.count || 0) +
        (stats.all_swim_totals?.count || 0)
      );

      console.log(`[Sync] Athlete has approximately ${totalActivities} total activities`);

      await prisma.user.update({
        where: { athleteId },
        data: { syncTotal: totalActivities }
      });
    } catch (error) {
      console.error('[Sync] Failed to fetch athlete stats, continuing without total:', error);
    }

    // Helper function to insert batch and update stats
    async function flushBatch(batch: StravaActivity[]): Promise<void> {
      if (batch.length === 0) return;

      const locations = batch.map(a => extractLocationData(a, athleteId));

      // Delete any existing records before inserting updates
      const locationIds = locations.map(l => l.activityId);
      await prisma.activity.deleteMany({
        where: {
          athleteId,
          activityId: { in: locationIds }
        }
      });

      // Insert all activities in batch
      await prisma.activity.createMany({
        data: locations
      });

      totalWithLocation += locations.length;

      // Update location stats so data appears in UI
      console.log(`[Sync] Batch inserted ${locations.length} activities, updating stats...`);
      await updateLocationStats(athleteId);
    }

    while (true) {
      // Check if server is shutting down
      if (isServerShuttingDown()) {
        console.log('[Sync] Server shutting down, exiting sync');
        return;
      }

      // Check if user still exists (could have been deleted)
      const userExists = await prisma.user.findUnique({
        where: { athleteId },
        select: { athleteId: true }
      });

      if (!userExists) {
        console.log('[Sync] User has been deleted, stopping sync');
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

      // Batch processing
      let batchBuffer: StravaActivity[] = [];
      let activitiesProcessedInPage = 0;

      // Fetch detailed activities to get location data
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

              batchBuffer.push(detailed);
              console.log(`[Sync]   ✓ Activity ${activity.id} geocoded: ${geocoded.city || 'Unknown city'}, ${geocoded.country}`);
            } else {
              console.log(`[Sync]   ✗ Activity ${activity.id} geocoding failed, no country found`);
            }
          } else if (detailed.location_country) {
            batchBuffer.push(detailed);
            console.log(`[Sync]   ✓ Activity ${activity.id} has Strava location: ${detailed.location_city || 'Unknown city'}, ${detailed.location_country}`);
          } else {
            console.log(`[Sync]   ✗ Activity ${activity.id} has no coordinates for geocoding`);
          }

          activitiesProcessedInPage++;

          // Update progress every PROGRESS_UPDATE_INTERVAL activities
          if (activitiesProcessedInPage % PROGRESS_UPDATE_INTERVAL === 0) {
            await prisma.user.update({
              where: { athleteId },
              data: {
                syncProgress: totalSynced + activitiesProcessedInPage,
                syncLastActivityAt: new Date()
              }
            });
            console.log(`[Sync] Progress update: ${totalSynced + activitiesProcessedInPage} activities processed`);
          }

          // Flush batch when it reaches BATCH_SIZE
          if (batchBuffer.length >= BATCH_SIZE) {
            await flushBatch(batchBuffer);
            batchBuffer = [];
          }

        } catch (error) {
          if (error instanceof RateLimitError) {
            console.error(`[Sync]   ✗ Rate limit exceeded for activity ${activity.id}`);
            // Flush current batch before throwing
            await flushBatch(batchBuffer);
            throw error;
          }

          // Check if user was deleted (token error)
          if (error instanceof Error && error.message.includes('No tokens found')) {
            console.log(`[Sync] User deleted during sync, stopping gracefully`);
            return;
          }

          console.error(`[Sync]   ✗ Failed to fetch activity ${activity.id}:`, error);
          // Continue with other activities for non-rate-limit errors
        }
      }

      // Flush any remaining activities in the batch
      await flushBatch(batchBuffer);

      // Update total with activities actually processed in this page
      totalSynced += activitiesProcessedInPage;
      page++;

      // Final progress update for this page
      await prisma.user.update({
        where: { athleteId },
        data: {
          syncProgress: totalSynced,
          syncLastActivityAt: new Date()
        }
      });

      console.log(`[Sync] Page complete. Progress: ${totalSynced} total, ${totalWithLocation} with location`);

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
    // If user was deleted, exit gracefully without updating status
    if (error instanceof Error && error.message.includes('No tokens found')) {
      console.log('[Sync] User was deleted, exiting sync gracefully');
      return;
    }

    console.error('[Sync] Sync failed for athlete:', athleteId, error);

    // Try to update user status to FAILED (user might have been deleted)
    try {
      await prisma.user.update({
        where: { athleteId },
        data: {
          syncStatus: 'FAILED'
        }
      });
    } catch {
      console.log('[Sync] Could not update user status (user may have been deleted)');
    }

    throw error;
  }
}

export async function updateLocationStats(athleteId: string): Promise<void> {
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
