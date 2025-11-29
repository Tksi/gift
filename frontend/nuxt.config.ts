import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@nuxtjs/robots'],
  compatibilityDate: '2025-10-19',
  devtools: { enabled: false },
  ssr: false,
  alias: {
    '@hc': path.resolve(__dirname, '../hc/index'),
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:5000',
    },
  },
  experimental: {
    typedPages: true,
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noImplicitOverride: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
    },
  },
  app: {
    head: {
      title: 'Gift',
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎁</text></svg>',
        },
      ],
      meta: [
        { name: 'robots', content: 'noindex, nofollow' },
      ]
    },
  },
  site: { indexable: false },
});
