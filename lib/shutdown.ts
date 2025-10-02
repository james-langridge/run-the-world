import { prisma } from '@/lib/db/prisma';

let isShuttingDown = false;

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

export function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;

    console.log(`[Shutdown] Received ${signal}, cancelling in-progress syncs...`);
    isShuttingDown = true;

    try {
      // Mark all SYNCING users as FAILED
      const result = await prisma.user.updateMany({
        where: { syncStatus: 'SYNCING' },
        data: { syncStatus: 'FAILED' }
      });

      console.log(`[Shutdown] Cancelled ${result.count} in-progress sync(s)`);
    } catch (error) {
      console.error('[Shutdown] Error cancelling syncs:', error);
    } finally {
      await prisma.$disconnect();
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
