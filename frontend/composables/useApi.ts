import { hc } from 'hono/client';
import type { AppType } from '@backend/index.mjs';

/**
 * バックエンドAPIとの型安全な通信を行うHono RPCクライアントを提供する。
 * @returns Hono RPCクライアントインスタンス
 */
export const useApi = (): ReturnType<typeof hc<AppType>> => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase;

  return hc<AppType>(baseUrl);
};
