import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Google AI Studio sets DISABLE_HMR while its agent edits files.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    rolldownOptions: {
      output: {
        // Keep the React and animation runtime in a long-lived vendor chunk.
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router|framer-motion|motion-dom|motion-utils|lucide-react)/ }] },
      },
    },
  },
})
