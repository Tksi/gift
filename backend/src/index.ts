import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const app = createApp();

// @ts-expect-error: import.meta.main の型がまだない
if (import.meta.main as boolean) {
  serve(
    {
      fetch: app.fetch,
      port: 5000,
    },
    (info) => {
      console.info(`Server is running on http://localhost:${info.port}`);
    },
  );
}
