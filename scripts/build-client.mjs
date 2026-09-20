import { build } from 'esbuild';

await build({
  entryPoints: ['client/app.js'],
  bundle: true,
  format: 'iife',
  minify: false,
  sourcemap: false,
  outfile: 'public/app.js',
  target: ['es2022'],
});
