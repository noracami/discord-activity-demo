import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

// Read version from root package.json
const rootPkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
const clientVersion = rootPkg.version;

console.log(`Building with CLIENT_VERSION: ${clientVersion}`);

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'build/index.js',
  format: 'esm',
  target: 'es2020',
  external: ['nakama-runtime'],
  define: {
    '__CLIENT_VERSION__': JSON.stringify(clientVersion),
  },
});

console.log('Build complete!');
