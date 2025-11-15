import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

export const roomsIndexGet = new OpenAPIHono();

const route = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: z.object({
      id: z.codec(z.string().min(1), z.number().int().positive(), {
        decode: Number,
        encode: String,
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            age: z.number(),
          }),
        },
      },
      description: 'Retrieve the user',
    },
  },
});

roomsIndexGet.openapi(route, (c) => {
  const { id } = c.req.valid('param');

  return c.json(
    {
      id,
      age: 20,
      name: 'Ultra-man',
    },
    200, // You should specify the status code even if it is 200.
  );
});
