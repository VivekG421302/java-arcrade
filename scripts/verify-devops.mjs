// Bundles the DevOps engine with esbuild (already a Vite dependency) and plays through all of Stage 1 headlessly.
// Usage: node scripts/verify-devops.mjs
import { build } from 'esbuild'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(tmpdir(), 'verify-devops.bundle.mjs')
await build({ entryPoints: ['src/courses/devops/engine/verify.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' })
await import(pathToFileURL(out).href)
