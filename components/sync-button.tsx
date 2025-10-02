'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SyncButton({ athleteId, isResume = false }: { athleteId: string; isResume?: boolean }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      router.refresh();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to start sync. Please try again.');
      setIsSyncing(false);
    }
  }

  const buttonText = isSyncing ? 'Starting...' : (isResume ? 'Resume Sync' : 'Sync Activities');

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
    >
      {buttonText}
    </button>
  );
}
