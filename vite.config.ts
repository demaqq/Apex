import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Production builds carry a strict Content Security Policy: scripts only from this app (no inline or third-party
 * code), no plugins, no framing of other sites, fonts only from Google Fonts. Not applied to the dev server,
 * which needs inline scripts for hot reload.
 */
/** The API may live on another origin (VITE_API_BASE); the production CSP must allow the app to call it. */
const apiOrigin = (() => { try { return process.env.VITE_API_BASE ? new URL(process.env.VITE_API_BASE).origin : '' } catch { return '' } })()

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
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

/** Serves /api/* from server/router.ts during development, with the server-only variables from .env files. */
const apiDev = (): Plugin => ({
  name: 'api-dev',
  apply: 'serve',
  config: (_, { mode }) => { Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ''), ...process.env }) },
  configureServer(server) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (!req.url?.startsWith('/api/')) return next()
      try {
        const { handle } = await server.ssrLoadModule('/server/router.ts') as { handle: (request: Request) => Promise<Response> }
        const chunks: Buffer[] = []
        if (req.method !== 'GET' && req.method !== 'HEAD') for await (const chunk of req) chunks.push(chunk as Buffer)
        const headers = new Headers()
        Object.entries(req.headers).forEach(([key, value]) => { if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value) })
        const response = await handle(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined }))
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      } catch (error) {
        res.statusCode = 500; res.end(String(error))
      }
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders(), apiDev()],
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
