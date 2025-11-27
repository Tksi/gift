import { serve } from '@hono/node-server';
import { hc } from 'hono/client';
import { createApp } from './app.js';
import type { ClientResponse, hc as honoHc } from 'hono/client';

const app = createApp();

// @ts-expect-error: import.meta.main の型がまだない
if (import.meta.main as boolean) {
  serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.info(`Server is running on http://localhost:${info.port}`);
    },
  );
}

// // app の型を明示的に定義
// type AppType = typeof app;

// // hc<AppType> の型を計算するためのヘルパー関数
// const createClient = (baseUrl: string) => hc<AppType>(baseUrl);

// // Client 型を ReturnType で取得
// export type Client = ReturnType<typeof createClient>;

// /**
//  * 型付き Hono クライアントを作成する関数。
//  * コンパイル時に型が計算されるため、IDE のパフォーマンスが向上する。
//  * @param args hc 関数に渡す引数
//  * @returns 型付き Hono クライアント
//  */
// export const hcWithType = (...args: Parameters<typeof honoHc>): Client =>
//   hc<AppType>(...args);

// this is a trick to calculate the type when compiling
export type Client = ReturnType<typeof hc<typeof app>>;

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<typeof app>(...args);
