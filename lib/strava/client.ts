import { StravaClient } from 'strava-sdk';
import { PrismaTokenStorage } from '@/lib/db/storage';
import { prisma } from '@/lib/db/prisma';

const storage = new PrismaTokenStorage(prisma);

export const strava = new StravaClient({
  clientId: process.env.STRAVA_CLIENT_ID!,
  clientSecret: process.env.STRAVA_CLIENT_SECRET!,
  redirectUri: process.env.STRAVA_REDIRECT_URI!,
  storage,
  rateLimiting: {
    // No rate limiting delay in dev mode with mocks, conservative 6s in production
    minTime: process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ? 0 : 6000
  }
});
