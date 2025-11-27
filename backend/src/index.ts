import { serve } from '@hono/node-server';
import { hc } from 'hono/client';
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

// this is a trick to calculate the type when compiling
export type Client = ReturnType<typeof hc<typeof app>>;

// eslint-disable-next-line jsdoc/require-jsdoc
export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<typeof app>(...args);
