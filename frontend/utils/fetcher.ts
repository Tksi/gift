import { hcWithType } from '@hc';

export const fetcher = hcWithType(useRuntimeConfig().public.apiBase);
