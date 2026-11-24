/** Small HTTP helpers shared by the API routes: JSON responses, CORS, body limits and rate limits. */

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'bad_request') { super(message) }
}

const BASE_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' }

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } })
}

/** CORS: only the hospital's own origins may call the API from a browser. Same-origin calls carry no Origin check. */
export function corsHeaders(request: Request, allowed: string[]): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin) return {}
  const self = new URL(request.url).origin
  if (origin !== self && !allowed.includes(origin)) return {}
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600', vary: 'origin' }
}

export function originAllowed(request: Request, allowed: string[]) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  return origin === new URL(request.url).origin || allowed.includes(origin)
}

export async function readJson<T>(request: Request, maxBytes = 8_192): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > maxBytes) throw new HttpError(413, 'Request too large', 'too_large')
  const text = await request.text()
  if (text.length > maxBytes) throw new HttpError(413, 'Request too large', 'too_large')
  try { return JSON.parse(text) as T } catch { throw new HttpError(400, 'Invalid JSON', 'invalid_json') }
}

export function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local'
}

/** In-memory sliding-window limiter (per server instance). Put a shared store in front for multi-instance deployments. */
const hits = new Map<string, number[]>()
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs)
  if (recent.length >= limit) throw new HttpError(429, 'Too many requests — please wait and try again', 'rate_limited')
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5_000) for (const [name, times] of hits) if (!times.some((at) => now - at < windowMs)) hits.delete(name)
}

export const clean = (value: unknown, max = 120) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
