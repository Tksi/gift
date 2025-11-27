import { hcWithType } from '@hc/index';

export const fetcher = hcWithType(useRuntimeConfig().public.apiBase);
