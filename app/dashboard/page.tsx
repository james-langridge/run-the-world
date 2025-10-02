import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { SyncButton } from '@/components/sync-button';
import { ClearResyncButton } from '@/components/clear-resync-button';
import { SyncStatus } from '@/components/sync-status';
import { LocationStats } from '@/components/location-stats';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function DashboardPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams;
  const athleteId = searchParams.athleteId as string | undefined;

  if (!athleteId) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { athleteId },
    include: {
      activities: {
        take: 1
      }
    }
  });

  if (!user) {
    redirect('/');
  }

  // Check for stale sync (stuck in SYNCING for more than 20 minutes)
  if (user.syncStatus === 'SYNCING') {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const syncTime = user.syncStartedAt || user.lastSyncAt;

    if (syncTime && syncTime < twentyMinutesAgo) {
      console.log('[Dashboard] Detected stale sync, marking as FAILED');
      await prisma.user.update({
        where: { athleteId },
        data: { syncStatus: 'FAILED' }
      });
      user.syncStatus = 'FAILED';
    }
  }

  const stats = await prisma.locationStat.findMany({
    where: { athleteId },
    orderBy: { totalDistance: 'desc' }
  });

  const totalCountries = new Set(stats.map(s => s.country)).size;
  const totalCities = stats.filter(s => s.city).length;
  const totalActivities = stats.reduce((sum, s) => sum + s.activityCount, 0);
  const totalDistance = stats.reduce((sum, s) => sum + s.totalDistance, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Run The World
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {user.firstName} {user.lastName}
              </span>
              <a
                href={`/auth/logout?athleteId=${athleteId}`}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.syncStatus === 'NOT_STARTED' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Welcome! Let&apos;s sync your activities
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Click below to start importing your Strava activities. This may take a few minutes.
            </p>
            <SyncButton athleteId={athleteId} />
          </div>
        )}

        <SyncStatus status={user.syncStatus} progress={user.syncProgress} message={user.syncMessage} />

        {user.syncStatus === 'FAILED' && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-300 mb-4">
              Sync failed or was interrupted
            </h2>
            <p className="text-red-700 dark:text-red-400 mb-6">
              The sync may have been interrupted by a deployment or encountered an error. Click below to try again.
            </p>
            <div className="flex gap-4 justify-center">
              <SyncButton athleteId={athleteId} />
              <ClearResyncButton athleteId={athleteId} />
            </div>
          </div>
        )}

        {user.syncStatus === 'COMPLETED' && stats.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <ClearResyncButton athleteId={athleteId} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Countries</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCountries}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Cities</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCities}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Activities</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalActivities}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Distance</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.round(totalDistance / 1000).toLocaleString()} km
                </div>
              </div>
            </div>

            <LocationStats stats={stats} />
          </div>
        )}

        {user.syncStatus === 'COMPLETED' && stats.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
              No location data found
            </h2>
            <p className="text-yellow-700 dark:text-yellow-400 mb-4">
              Your activities don&apos;t have location information, or the sync may have failed.
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mb-6">
              Last sync: {user.lastSyncAt ? new Date(user.lastSyncAt).toLocaleString() : 'Never'} |
              Activities processed: {user.syncProgress}
            </p>
            <div className="flex gap-4 justify-center">
              <SyncButton athleteId={athleteId} />
              <ClearResyncButton athleteId={athleteId} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
