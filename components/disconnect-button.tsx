'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DisconnectButton({ athleteId }: { athleteId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
      });

      if (!response.ok) {
        throw new Error('Disconnect failed');
      }

      // Redirect to home page after successful deletion
      router.push('/');
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect. Please try again.');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
      >
        Disconnect & Delete Data
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Disconnect from Strava?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          This will permanently delete all your data including:
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-1">
          <li>All imported activities</li>
          <li>Location statistics</li>
          <li>Your account and access tokens</li>
        </ul>
        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDisconnect}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
