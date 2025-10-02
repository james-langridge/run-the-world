import { StravaClient } from 'strava-sdk';
import { PrismaTokenStorage } from '@/lib/db/storage';
import { prisma } from '@/lib/db/prisma';

const tokenStorage = new PrismaTokenStorage(prisma);

export const strava = new StravaClient({
  clientId: process.env.STRAVA_CLIENT_ID!,
  clientSecret: process.env.STRAVA_CLIENT_SECRET!,
  redirectUri: process.env.STRAVA_REDIRECT_URI!,
  tokenStorage
});
