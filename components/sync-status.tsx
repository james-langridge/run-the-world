'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SyncButton } from './sync-button';

type SyncStatusDisplay = 'In progress' | 'Paused' | 'Completed!';

export function SyncStatus({
  status,
  progress,
  syncTotal,
  syncLastActivityAt,
  athleteId
}: {
  status: string;
  progress: number;
  syncTotal: number;
  syncLastActivityAt: Date | null;
  athleteId: string;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    setLastChecked(new Date());
  }, [progress, status]);

  const handleCheck = async () => {
    setIsChecking(true);
    router.refresh();
    setTimeout(() => {
      setIsChecking(false);
      setLastChecked(new Date());
    }, 500);
  };

  if (status !== 'SYNCING') return null;

  // Detect if sync is stalled (no activity in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const lastActivity = syncLastActivityAt || new Date(0); // If null, use epoch (very old)
  const isPaused = lastActivity < fiveMinutesAgo;

  const displayStatus: SyncStatusDisplay = isPaused ? 'Paused' : 'In progress';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`${isPaused ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'} rounded-lg shadow p-8`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Status: {displayStatus}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {syncTotal > 0
              ? `${progress} / ${syncTotal} activities (${Math.round((progress / syncTotal) * 100)}%)`
              : `${progress} activities processed`
            } • Last checked: {formatTime(lastChecked)}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {isPaused
          ? 'Sync appears to be paused (possibly due to deployment). Click Resume Sync to continue.'
          : 'Due to Strava rate limits, large syncs may take several hours. You can close this page and check back later.'}
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleCheck}
          disabled={isChecking}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isChecking ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </>
          ) : (
            'Check Sync Status'
          )}
        </button>
        {isPaused && <SyncButton athleteId={athleteId} isResume={true} />}
      </div>
    </div>
  );
}
