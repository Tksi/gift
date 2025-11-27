import { builtinModules } from 'node:module';
import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

export default defineConfig({
  input: { index: './src/client.ts' },
  output: { cleanDir: true, dir: '../hc', format: 'es' },
  plugins: [dts({ resolve: true })],
  external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
  tsconfig: './tsconfig.json',
});
