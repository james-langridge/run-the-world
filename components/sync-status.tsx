'use client';

import { useRouter } from 'next/navigation';

export function SyncStatus({
  status,
  progress,
  message
}: {
  status: string;
  progress: number;
  message?: string | null;
}) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  if (status !== 'SYNCING') return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Sync in progress
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-2">
        {message || (progress > 0 ? `${progress} activities processed` : 'Starting sync...')}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Due to Strava rate limits, large syncs may take several hours. The sync will continue in the background even if you close this page. Your data will appear below as it&apos;s imported.
      </p>
      <button
        onClick={handleRefresh}
        className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Refresh Page
      </button>
    </div>
  );
}
