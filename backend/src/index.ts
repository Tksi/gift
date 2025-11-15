import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { roomsIndexGet } from 'routes/rooms/index.get.js';

export { createInMemoryGameStore } from 'states/inMemoryGameStore.js';

export { createSetupSnapshot } from 'states/setup.js';

const app = new OpenAPIHono();

app.route('/', roomsIndexGet);

app
  .doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'My API',
    },
  })
  .get('/scalar', Scalar({ url: '/doc' }));

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.info(`Server is running on http://localhost:${info.port}`);
  },
);
