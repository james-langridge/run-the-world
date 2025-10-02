'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UpdateStatsButton({ athleteId }: { athleteId: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  async function handleUpdate() {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/update-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      const data = await response.json();
      alert(`Stats updated! Created ${data.statsCount} location records.`);
      router.refresh();
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update stats. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <button
      onClick={handleUpdate}
      disabled={isUpdating}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
    >
      {isUpdating ? 'Updating...' : 'Update Stats Now'}
    </button>
  );
}
