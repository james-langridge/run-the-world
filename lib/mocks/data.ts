import type { StravaActivity } from 'strava-sdk';

// Generate consistent data based on seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const ACTIVITY_TYPES = ['Run', 'Ride', 'Walk', 'Hike', 'Swim'];

const CITIES = [
  { city: 'San Francisco', state: 'California', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { city: 'London', state: null, country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { city: 'Tokyo', state: null, country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { city: 'Paris', state: null, country: 'France', lat: 48.8566, lng: 2.3522 },
  { city: 'Berlin', state: null, country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { city: 'Sydney', state: 'New South Wales', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { city: 'New York', state: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { city: 'Barcelona', state: null, country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { city: 'Amsterdam', state: null, country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { city: 'Singapore', state: null, country: 'Singapore', lat: 1.3521, lng: 103.8198 },
];

export function generateMockActivity(id: number, daysAgo: number): StravaActivity {
  const seed = id;
  const cityIndex = Math.floor(seededRandom(seed) * CITIES.length);
  const location = CITIES[cityIndex];
  const typeIndex = Math.floor(seededRandom(seed + 1) * ACTIVITY_TYPES.length);
  const activityType = ACTIVITY_TYPES[typeIndex];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  // Add some random variation to coordinates (within ~5km)
  const latOffset = (seededRandom(seed + 2) - 0.5) * 0.05;
  const lngOffset = (seededRandom(seed + 3) - 0.5) * 0.05;

  const distance = 1000 + seededRandom(seed + 4) * 20000; // 1-21km
  const movingTime = Math.floor(distance / 3); // ~3m/s average pace

  return {
    id,
    name: `${activityType === 'Run' ? 'Morning' : activityType === 'Ride' ? 'Evening' : 'Afternoon'} ${activityType}`,
    type: activityType,
    distance,
    moving_time: movingTime,
    elapsed_time: movingTime + Math.floor(seededRandom(seed + 5) * 300),
    total_elevation_gain: seededRandom(seed + 6) * 500,
    start_date: startDate.toISOString(),
    start_date_local: startDate.toISOString(),
    timezone: '(GMT-08:00) America/Los_Angeles',
    start_latlng: [location.lat + latOffset, location.lng + lngOffset] as [number, number],
    end_latlng: [location.lat + latOffset + 0.01, location.lng + lngOffset + 0.01] as [number, number],
    location_city: location.city,
    location_state: location.state,
    location_country: location.country,
    achievement_count: Math.floor(seededRandom(seed + 7) * 5),
    kudos_count: Math.floor(seededRandom(seed + 8) * 50),
    comment_count: Math.floor(seededRandom(seed + 9) * 10),
    athlete_count: 1,
    photo_count: Math.floor(seededRandom(seed + 10) * 3),
    map: {
      id: `a${id}`,
      summary_polyline: 'fake_polyline',
      resource_state: 2
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: null,
    average_speed: distance / movingTime,
    max_speed: (distance / movingTime) * 1.5,
    has_heartrate: seededRandom(seed + 11) > 0.5,
    heartrate_opt_out: false,
    display_hide_heartrate_option: false,
    resource_state: 2,
    athlete: {
      id: 12345,
      resource_state: 1
    },
    upload_id: id * 100,
    external_id: `fake-${id}.fit`,
    from_accepted_tag: false,
    average_cadence: activityType === 'Run' ? 85 + seededRandom(seed + 12) * 10 : undefined,
    has_kudoed: false
  } as StravaActivity;
}

export function generateMockActivities(count: number, page: number, perPage: number): StravaActivity[] {
  const startIndex = (page - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, count);

  const activities: StravaActivity[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    activities.push(generateMockActivity(i + 1, i));
  }

  return activities;
}

export function generateAthleteStats() {
  return {
    biggest_ride_distance: 120000,
    biggest_climb_elevation_gain: 1200,
    recent_ride_totals: {
      count: 42,
      distance: 850000,
      moving_time: 120000,
      elapsed_time: 125000,
      elevation_gain: 12000,
      achievement_count: 15
    },
    recent_run_totals: {
      count: 68,
      distance: 450000,
      moving_time: 95000,
      elapsed_time: 98000,
      elevation_gain: 5500,
      achievement_count: 22
    },
    recent_swim_totals: {
      count: 12,
      distance: 25000,
      moving_time: 15000,
      elapsed_time: 16000,
      elevation_gain: 0,
      achievement_count: 3
    },
    ytd_ride_totals: {
      count: 156,
      distance: 3200000,
      moving_time: 480000,
      elapsed_time: 495000,
      elevation_gain: 45000
    },
    ytd_run_totals: {
      count: 234,
      distance: 1850000,
      moving_time: 380000,
      elapsed_time: 392000,
      elevation_gain: 18500
    },
    ytd_swim_totals: {
      count: 45,
      distance: 98000,
      moving_time: 58000,
      elapsed_time: 62000,
      elevation_gain: 0
    },
    all_ride_totals: {
      count: 523,
      distance: 12500000,
      moving_time: 1850000,
      elapsed_time: 1920000,
      elevation_gain: 175000
    },
    all_run_totals: {
      count: 847,
      distance: 6200000,
      moving_time: 1250000,
      elapsed_time: 1290000,
      elevation_gain: 65000
    },
    all_swim_totals: {
      count: 134,
      distance: 285000,
      moving_time: 165000,
      elapsed_time: 178000,
      elevation_gain: 0
    }
  };
}

export const MOCK_ATHLETE_ID = '12345';
export const MOCK_ACCESS_TOKEN = 'mock_access_token';
export const MOCK_REFRESH_TOKEN = 'mock_refresh_token';
