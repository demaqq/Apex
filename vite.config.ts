import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Production builds carry a strict Content Security Policy: scripts only from this app (no inline or third-party
 * code), no plugins, no framing of other sites, fonts only from Google Fonts. Not applied to the dev server,
 * which needs inline scripts for hot reload.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'self' blob: data:",
  "worker-src 'self' blob:",
].join('; ')

const securityHeaders = (): Plugin => ({
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`),
})

export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders()],
  server: {
    // Google AI Studio sets DISABLE_HMR while its agent edits files.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    rolldownOptions: {
      output: {
        // Keep the React and animation runtime in a long-lived vendor chunk.
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router|framer-motion|motion-dom|motion-utils|lucide-react)/ }] },
        // The hosted demo (hash router) keeps stable file names so each update replaces the same files.
        ...(process.env.VITE_HASH_ROUTER === '1' ? { entryFileNames: 'assets/[name].js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } : {}),
      },
    },
  },
})
