import { serve } from '@hono/node-server';
import { createApp } from './app.js';

export { createInMemoryGameStore } from './states/inMemoryGameStore.js';

export { createSetupSnapshot } from './states/setup.js';

const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.info(`Server is running on http://localhost:${info.port}`);
  },
);
