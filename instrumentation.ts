export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupGracefulShutdown } = await import('./lib/shutdown');
    setupGracefulShutdown();
  }
}
