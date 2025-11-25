// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  compatibilityDate: '2025-10-19',
  devtools: { enabled: false },
  ssr: false,
  alias: {
    '@backend': '../backend/dist',
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3000',
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
});
