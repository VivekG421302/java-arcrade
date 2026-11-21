import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PGlite (PostgreSQL compiled to WebAssembly) is loaded from a Web Worker: it must stay out of dependency pre-bundling so its .wasm/.data files resolve, and workers are built as ES modules.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
})
