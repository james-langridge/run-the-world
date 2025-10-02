import { strava } from '@/lib/strava/client';

export default function Home() {
  const authUrl = strava.oauth.getAuthUrl({
    scopes: ['activity:read_all']
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl px-8 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Run The World
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Discover where you&apos;ve been active. See your Strava activities organized by location, not just on a map.
        </p>
        <div className="space-y-4">
          <a
            href={authUrl}
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Connect with Strava
          </a>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View your activities by country, city, and activity type
          </p>
        </div>
      </div>
    </div>
  );
}
