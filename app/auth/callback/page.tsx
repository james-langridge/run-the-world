import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { strava } from '@/lib/strava/client';
import { prisma } from '@/lib/db/prisma';
import { MOCK_ATHLETE_ID, MOCK_ACCESS_TOKEN, MOCK_REFRESH_TOKEN } from '@/lib/mocks/data';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CallbackPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams;
  const code = searchParams.code as string | undefined;
  const scope = searchParams.scope as string | undefined;
  const isMock = searchParams.mock === 'true';
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  // Handle mock authentication
  if (useMocks && isMock) {
    try {
      const athleteId = MOCK_ATHLETE_ID;

      await prisma.user.upsert({
        where: { athleteId },
        create: {
          athleteId,
          firstName: 'Mock',
          lastName: 'User'
        },
        update: {
          firstName: 'Mock',
          lastName: 'User'
        }
      });

      await strava.storage.saveTokens(athleteId, {
        athleteId,
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        scopes: ['activity:read_all']
      });

      redirect(`/dashboard?athleteId=${athleteId}`);
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      console.error('Mock auth error:', error);
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Mock Authentication Failed</h1>
            <p className="mt-2 text-gray-600">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </div>
      );
    }
  }

  // Normal OAuth flow
  if (!code || !scope) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Authentication Failed</h1>
          <p className="mt-2 text-gray-600">Missing authorization code or scope</p>
        </div>
      </div>
    );
  }

  try {
    const tokens = await strava.oauth.exchangeCode(code);
    const athleteId = tokens.athlete.id.toString();

    await prisma.user.upsert({
      where: { athleteId },
      create: {
        athleteId,
        firstName: tokens.athlete.firstname || 'Unknown',
        lastName: tokens.athlete.lastname || ''
      },
      update: {
        firstName: tokens.athlete.firstname || 'Unknown',
        lastName: tokens.athlete.lastname || ''
      }
    });

    await strava.storage.saveTokens(athleteId, {
      athleteId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expires_at * 1000),
      scopes: scope.split(',')
    });

    redirect(`/dashboard?athleteId=${athleteId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error('OAuth callback error:', error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Authentication Failed</h1>
          <p className="mt-2 text-gray-600">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }
}
