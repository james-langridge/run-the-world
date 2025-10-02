import { NextRequest, NextResponse } from 'next/server';
import { syncActivities } from '@/lib/actions/sync';

export async function POST(request: NextRequest) {
  try {
    const { athleteId } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: 'athleteId is required' },
        { status: 400 }
      );
    }

    syncActivities(athleteId).catch(error => {
      console.error('Background sync error:', error);
    });

    return NextResponse.json({
      status: 'syncing',
      athleteId
    });
  } catch (error) {
    console.error('Sync endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}
