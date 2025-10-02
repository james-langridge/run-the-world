import { http, HttpResponse, delay } from 'msw';
import {
  generateMockActivities,
  generateMockActivity,
  generateAthleteStats,
  MOCK_ATHLETE_ID,
  MOCK_ACCESS_TOKEN,
  MOCK_REFRESH_TOKEN
} from './data';

const TOTAL_MOCK_ACTIVITIES = 500; // Total activities to simulate
const MOCK_DELAY_MS = 100; // Simulate network delay

export const handlers = [
  // List athlete activities
  http.get('https://www.strava.com/api/v3/athlete/activities', async ({ request }) => {
    await delay(MOCK_DELAY_MS);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '30');

    const activities = generateMockActivities(TOTAL_MOCK_ACTIVITIES, page, perPage);

    return HttpResponse.json(activities);
  }),

  // Get specific activity
  http.get('https://www.strava.com/api/v3/activities/:id', async ({ params }) => {
    await delay(MOCK_DELAY_MS);

    const activityId = parseInt(params.id as string);
    const activity = generateMockActivity(activityId, activityId - 1);

    return HttpResponse.json(activity);
  }),

  // Get athlete stats
  http.get('https://www.strava.com/api/v3/athletes/:id/stats', async () => {
    await delay(MOCK_DELAY_MS);

    return HttpResponse.json(generateAthleteStats());
  }),

  // OAuth token exchange
  http.post('https://www.strava.com/oauth/token', async () => {
    await delay(MOCK_DELAY_MS);

    return HttpResponse.json({
      token_type: 'Bearer',
      expires_at: Math.floor(Date.now() / 1000) + 21600, // 6 hours from now
      expires_in: 21600,
      refresh_token: MOCK_REFRESH_TOKEN,
      access_token: MOCK_ACCESS_TOKEN,
      athlete: {
        id: parseInt(MOCK_ATHLETE_ID),
        username: 'mockuser',
        resource_state: 2,
        firstname: 'Mock',
        lastname: 'User',
        city: 'San Francisco',
        state: 'California',
        country: 'United States',
        sex: 'M',
        premium: false,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        badge_type_id: 0,
        profile_medium: 'https://via.placeholder.com/62',
        profile: 'https://via.placeholder.com/124',
        friend: null,
        follower: null
      }
    });
  }),

  // Deauthorize
  http.post('https://www.strava.com/oauth/deauthorize', async () => {
    await delay(MOCK_DELAY_MS);

    return HttpResponse.json({
      access_token: MOCK_ACCESS_TOKEN
    });
  }),

  // Get authenticated athlete
  http.get('https://www.strava.com/api/v3/athlete', async () => {
    await delay(MOCK_DELAY_MS);

    return HttpResponse.json({
      id: parseInt(MOCK_ATHLETE_ID),
      username: 'mockuser',
      resource_state: 3,
      firstname: 'Mock',
      lastname: 'User',
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      sex: 'M',
      premium: false,
      created_at: '2020-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      badge_type_id: 0,
      profile_medium: 'https://via.placeholder.com/62',
      profile: 'https://via.placeholder.com/124',
      friend: null,
      follower: null,
      follower_count: 42,
      friend_count: 38,
      mutual_friend_count: 12,
      athlete_type: 0,
      date_preference: '%m/%d/%Y',
      measurement_preference: 'feet',
      clubs: [],
      ftp: null,
      weight: 75,
      bikes: [],
      shoes: []
    });
  })
];
