import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const { athleteId } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: 'athleteId is required' },
        { status: 400 }
      );
    }

    console.log('[Disconnect API] Deleting all data for athlete:', athleteId);

    // Delete location stats first (no cascade relation defined)
    await prisma.locationStat.deleteMany({
      where: { athleteId }
    });

    // Delete user (will cascade delete tokens and activities via schema)
    await prisma.user.delete({
      where: { athleteId }
    });

    console.log('[Disconnect API] Successfully deleted all data for athlete:', athleteId);

    return NextResponse.json({
      success: true,
      message: 'All data deleted successfully'
    });
  } catch (error) {
    console.error('[Disconnect API] Error deleting user data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}
