import { redirect } from 'next/navigation';
import { strava } from '@/lib/strava/client';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LogoutPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams;
  const athleteId = searchParams.athleteId as string | undefined;

  if (athleteId) {
    try {
      await strava.storage.deleteTokens(athleteId);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  redirect('/');
}
