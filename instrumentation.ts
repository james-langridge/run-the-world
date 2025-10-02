export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Enable MSW mocking if configured
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      const { enableMocking } = await import('./lib/mocks/node');
      enableMocking();
    }

    console.log('[Instrumentation] Setting up graceful shutdown handlers...');
    const { setupGracefulShutdown } = await import('./lib/shutdown');
    setupGracefulShutdown();
    console.log('[Instrumentation] Shutdown handlers registered');
  }
}
