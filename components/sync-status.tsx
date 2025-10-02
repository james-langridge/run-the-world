'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (status === 'SYNCING') {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [status, router]);

  if (status !== 'SYNCING') return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Syncing your activities...
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-2">
        {message || (progress > 0 ? `${progress} activities processed` : 'Starting sync...')}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This page will auto-refresh every 3 seconds
      </p>
    </div>
  );
}
