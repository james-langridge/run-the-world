/**
 * Reverse geocoding using Nominatim (OpenStreetMap)
 *
 * Rate limit: Max 1 request per second
 * https://operations.osmfoundation.org/policies/nominatim/
 */

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface LocationData {
  city: string | null;
  state: string | null;
  country: string | null;
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ? 0 : 1000; // No delay in dev, 1 second in prod

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationData> {
  // Enforce rate limit
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RunTheWorld/1.0 (Strava activity location tracker)',
          'Accept-Language': 'en' // Force English language responses
        }
      }
    );

    if (!response.ok) {
      console.error(`[Geocoding] HTTP ${response.status} for coordinates ${lat},${lng}`);
      return { city: null, state: null, country: null };
    }

    const data = await response.json() as NominatimResponse;

    if (!data.address) {
      console.warn(`[Geocoding] No address data for coordinates ${lat},${lng}`);
      return { city: null, state: null, country: null };
    }

    // Extract city (try multiple fields in order of preference)
    const city = data.address.city
      || data.address.town
      || data.address.village
      || data.address.municipality
      || null;

    const state = data.address.state || null;
    const country = data.address.country || null;

    console.log(`[Geocoding] ${lat},${lng} -> ${city || 'Unknown city'}, ${country || 'Unknown country'}`);

    return { city, state, country };
  } catch (error) {
    console.error(`[Geocoding] Failed to geocode ${lat},${lng}:`, error);
    return { city: null, state: null, country: null };
  }
}
