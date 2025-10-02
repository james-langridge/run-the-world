import { prisma } from '@/lib/db/prisma';

let isShuttingDown = false;

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

export function setupGracefulShutdown() {
  console.log('[Shutdown] Registering SIGTERM and SIGINT handlers');

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log(`[Shutdown] Already shutting down, ignoring ${signal}`);
      return;
    }

    console.log(`[Shutdown] ========================================`);
    console.log(`[Shutdown] Received ${signal}, starting graceful shutdown`);
    console.log(`[Shutdown] ========================================`);
    isShuttingDown = true;

    try {
      console.log('[Shutdown] Checking for in-progress syncs...');

      // Mark all SYNCING users as FAILED
      const result = await prisma.user.updateMany({
        where: { syncStatus: 'SYNCING' },
        data: { syncStatus: 'FAILED' }
      });

      console.log(`[Shutdown] Successfully cancelled ${result.count} in-progress sync(s)`);
    } catch (error) {
      console.error('[Shutdown] Error cancelling syncs:', error);
    } finally {
      console.log('[Shutdown] Disconnecting from database...');
      await prisma.$disconnect();
      console.log('[Shutdown] Shutdown complete, exiting process');
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => {
    console.log('[Shutdown] SIGTERM signal received');
    shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('[Shutdown] SIGINT signal received');
    shutdown('SIGINT');
  });

  console.log('[Shutdown] Handlers registered successfully');
}
