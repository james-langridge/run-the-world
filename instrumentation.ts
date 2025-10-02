export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Setting up graceful shutdown handlers...');
    const { setupGracefulShutdown } = await import('./lib/shutdown');
    setupGracefulShutdown();
    console.log('[Instrumentation] Shutdown handlers registered');
  }
}
