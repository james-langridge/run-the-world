import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

export function enableMocking() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    console.log('[MSW] Mock Service Worker enabled for Strava API');
    server.listen({
      onUnhandledRequest: 'bypass'
    });

    // Clean up on exit
    process.on('SIGINT', () => server.close());
    process.on('SIGTERM', () => server.close());
  }
}
