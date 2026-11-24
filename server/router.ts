/**
 * API router (Web-standard Request → Response), used by the Vercel functions in /api and by the Vite dev server.
 *
 *   GET  /api/health              which providers are live, currency and prices (no secrets)
 *   POST /api/payments/checkout   start a hosted checkout for a service → { checkoutUrl, reference }
 *   GET  /api/payments/verify     ?ref=…[&session=…] → verified status and amount from the provider
 *   GET/POST /api/payments/sandbox   development stand-in checkout (PAYMENT_PROVIDER=sandbox only)
 *   POST /api/sms/send            { to, template, params } → templated SMS through the configured gateway
 */
import { config } from './config'
import { clientIp, corsHeaders, HttpError, json, originAllowed, rateLimit, readJson } from './http'
import { createCheckout, sandboxComplete, sandboxPage, verifyPayment, type CheckoutInput } from './payments'
import { sendSms, TEMPLATES, type TemplateId } from './sms'

const MINUTE = 60_000

export async function handle(request: Request): Promise<Response> {
  const cfg = config()
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/+$/, '')
  const cors = corsHeaders(request, cfg.allowedOrigins)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  try {
    if (!originAllowed(request, cfg.allowedOrigins)) throw new HttpError(403, 'Origin not allowed', 'forbidden_origin')
    const ip = clientIp(request)

    if (path === '/api/health' && request.method === 'GET') {
      return json({
        ok: true,
        payments: cfg.payment ? { provider: cfg.payment, mode: cfg.testMode ? 'test' : 'live', currency: cfg.currency } : null,
        sms: cfg.sms ? { provider: cfg.sms } : null,
        prices: Object.fromEntries(Object.entries(cfg.prices).map(([id, item]) => [id, item.price])),
        templates: Object.keys(TEMPLATES),
      }, 200, cors)
    }

    if (path === '/api/payments/checkout' && request.method === 'POST') {
      rateLimit(`checkout:${ip}`, 12, 10 * MINUTE)
      const body = await readJson<CheckoutInput>(request)
      if (!body?.serviceId || !body.customer?.name || !body.returnUrl) throw new HttpError(400, 'serviceId, customer.name and returnUrl are required')
      const target = new URL(body.returnUrl)
      const allowedReturn = [url.origin, ...cfg.allowedOrigins, request.headers.get('origin') ?? ''].filter(Boolean)
      if (!allowedReturn.includes(target.origin)) throw new HttpError(400, 'Return address not allowed', 'bad_return_url')
      return json(await createCheckout(cfg, body, url.origin), 200, cors)
    }

    if (path === '/api/payments/verify' && request.method === 'GET') {
      rateLimit(`verify:${ip}`, 60, 10 * MINUTE)
      return json(await verifyPayment(cfg, url.searchParams.get('ref') ?? '', url.searchParams.get('session') ?? undefined), 200, cors)
    }

    if (path === '/api/payments/sandbox' && cfg.payment === 'sandbox') {
      return request.method === 'POST' ? sandboxComplete(request) : sandboxPage(url.searchParams.get('ref') ?? '')
    }

    if (path === '/api/sms/send' && request.method === 'POST') {
      const body = await readJson<{ to: string; template: TemplateId; params?: Record<string, unknown> }>(request)
      rateLimit(`sms-ip:${ip}`, cfg.smsPerIp, 60 * MINUTE)
      rateLimit(`sms-to:${String(body?.to ?? '').replace(/\D/g, '')}`, cfg.smsPerNumber, 60 * MINUTE)
      return json(await sendSms(cfg, String(body?.to ?? ''), body?.template, body?.params ?? {}), 200, cors)
    }

    throw new HttpError(404, 'Not found', 'not_found')
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status, cors)
    console.error('[api]', error)
    return json({ error: 'The service is unavailable — please try again', code: 'server_error' }, 502, cors)
  }
}
