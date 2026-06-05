import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
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
