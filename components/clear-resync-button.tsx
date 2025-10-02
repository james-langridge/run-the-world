'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ClearResyncButton({ athleteId }: { athleteId: string }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  async function handleClearResync() {
    if (!confirm('This will delete all existing location data and re-sync from Strava. Continue?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/clear-and-resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
      });

      if (!response.ok) {
        throw new Error('Clear and re-sync failed');
      }

      router.refresh();
    } catch (error) {
      console.error('Clear and re-sync error:', error);
      alert('Failed to start clear and re-sync. Please try again.');
      setIsProcessing(false);
    }
  }

  return (
    <button
      onClick={handleClearResync}
      disabled={isProcessing}
      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
    >
      {isProcessing ? 'Clearing and re-syncing...' : 'Clear & Re-sync All'}
    </button>
  );
}
