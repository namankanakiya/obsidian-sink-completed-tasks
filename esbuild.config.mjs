import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2018',
  external: ['obsidian'],
  outfile: 'main.js',
  logLevel: 'info'
});
