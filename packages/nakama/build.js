import * as esbuild from 'esbuild';

// Generate build timestamp for version checking
const buildTimestamp = Date.now().toString();

console.log(`Building with CLIENT_VERSION: ${buildTimestamp}`);

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'build/index.js',
  format: 'esm',
  target: 'es2020',
  external: ['nakama-runtime'],
  define: {
    '__CLIENT_VERSION__': JSON.stringify(buildTimestamp),
  },
});

console.log('Build complete!');
