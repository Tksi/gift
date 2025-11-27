import { hc } from 'hono/client';
import type { AppType } from './app.js';

// this is a trick to calculate the type when compiling
export type Client = ReturnType<typeof hc<AppType>>;

// eslint-disable-next-line jsdoc/require-jsdoc
export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args);
