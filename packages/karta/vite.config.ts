import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { kartaWatch } from './vite-plugin-karta'

export default defineConfig({
  plugins: [
    kartaWatch(),
    react({
      babel: {
        plugins: [
          [
            '@stylexjs/babel-plugin',
            {
              dev: true,
              unstable_moduleResolution: { type: 'commonJS' },
            },
          ],
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Manager (index.html) + sandboxed Preview frame (preview.html).
      // Paths are relative to the Vite project root.
      input: {
        main: 'index.html',
        preview: 'preview.html',
      },
    },
  },
})
