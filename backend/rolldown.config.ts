import { builtinModules } from 'node:module';
import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts';

export default defineConfig({
  input: './src/index.ts',
  plugins: [dts({ resolve: true })],
  output: { dir: '../hc', format: 'es' },
  external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
  tsconfig: './tsconfig.json',
});
