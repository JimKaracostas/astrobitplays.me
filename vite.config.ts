import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'public-cover-manifest',
    transformIndexHtml() {
      const manifest = existsSync('.generated/covers.json') ? readFileSync('.generated/covers.json', 'utf8') : '{}'
      return [{ tag: 'script', attrs: { type: 'application/json', id: 'cover-images' }, children: manifest.replace(/</g, '\\u003c'), injectTo: 'head' as const }]
    },
  }],
})
