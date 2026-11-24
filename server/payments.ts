/**
 * Payment gateways. The patient pays on the provider's own hosted checkout (card details and wallet PINs never touch
 * our servers), then comes back to the portal, which asks this server to verify the payment with the provider before
 * the visit is booked. The amount always comes from the server's price list, never from the browser.
 *
 * - Chapa (Ethiopia): telebirr, CBE Birr, M-Pesa, Amole/Awash and cards. https://developer.chapa.co
 * - Stripe: international cards.
 * - sandbox: a local stand-in checkout for development and automated tests only.
 */
import type { ServerConfig } from './config'
import { clean, HttpError } from './http'

export interface CheckoutInput {
  serviceId: string
  customer: { name: string; phone?: string; email?: string }
  returnUrl: string
}

export interface CheckoutResult { checkoutUrl: string; reference: string; amount: number; currency: string; provider: string }
export interface VerifyResult { status: 'paid' | 'pending' | 'failed'; reference: string; amount: number; currency: string; provider: string; method?: string; serviceId?: string }

const CHAPA = 'https://api.chapa.co/v1'
const STRIPE = 'https://api.stripe.com/v1'

/** Our own reference: unguessable, unique, and valid for Chapa's tx_ref (letters, digits, hyphens). */
export function newReference() {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `NS-${Date.now().toString(36).toUpperCase()}-${random.toUpperCase()}`
}

/** Ethiopian numbers in Chapa's local form (09… / 07…). */
const localPhone = (phone?: string) => {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (/^251[79]\d{8}$/.test(digits)) return `0${digits.slice(3)}`
  if (/^0[79]\d{8}$/.test(digits)) return digits
  return undefined
}

function withParams(url: string, params: Record<string, string>) {
  // Works for both routers: the query goes before any #/hash route.
  const [base, hash] = url.split('#')
  const next = new URL(base)
  Object.entries(params).forEach(([key, value]) => next.searchParams.set(key, value))
  return `${next.toString()}${hash !== undefined ? `#${hash}` : ''}`
}

export function priceFor(cfg: ServerConfig, serviceId: string) {
  const item = cfg.prices[serviceId]
  if (!item || !(item.price > 0)) throw new HttpError(400, 'Unknown service', 'unknown_service')
  return item
}

/* ---------- Sandbox (development only) ---------- */

const sandbox = new Map<string, { amount: number; currency: string; serviceId: string; status: VerifyResult['status']; returnUrl: string }>()

export function sandboxPage(reference: string) {
  const entry = sandbox.get(reference)
  if (!entry) return new Response('Unknown payment', { status: 404 })
  const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sandbox checkout</title><style>body{font:15px system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#eef4f3;color:#16312f}main{background:#fff;padding:28px;border-radius:16px;max-width:380px;width:90%;box-shadow:0 8px 30px #0001}h1{font-size:20px;margin:0 0 4px}p{color:#5b6f6d}b{font-size:26px}button{font:inherit;padding:12px 16px;border-radius:10px;border:0;margin-top:10px;width:100%;cursor:pointer}.pay{background:#0f766e;color:#fff}.no{background:#f1f5f4}</style></head><body><main><h1>Sandbox checkout</h1><p>Development stand-in for the payment provider. No money moves.</p><p>Reference <code>${esc(reference)}</code></p><b>${entry.amount.toFixed(2)} ${esc(entry.currency)}</b><form method="post"><input type="hidden" name="ref" value="${esc(reference)}"><button class="pay" name="action" value="pay">Pay (simulated telebirr)</button><button class="no" name="action" value="cancel">Cancel</button></form></main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

export async function sandboxComplete(request: Request) {
  const form = new URLSearchParams(await request.text())
  const reference = form.get('ref') ?? ''
  const entry = sandbox.get(reference)
  if (!entry) return new Response('Unknown payment', { status: 404 })
  entry.status = form.get('action') === 'pay' ? 'paid' : 'failed'
  return new Response(null, { status: 303, headers: { location: withParams(entry.returnUrl, { paid: reference, ...(entry.status === 'failed' ? { cancelled: '1' } : {}) }) } })
}

/* ---------- Create a checkout ---------- */

export async function createCheckout(cfg: ServerConfig, input: CheckoutInput, apiOrigin: string): Promise<CheckoutResult> {
  if (!cfg.payment) throw new HttpError(503, 'Online payment is not set up', 'payments_off')
  const item = priceFor(cfg, input.serviceId)
  const reference = newReference()
  const name = clean(input.customer.name, 60) || 'Patient'
  const [first, ...rest] = name.split(' ')
  const returnUrl = withParams(input.returnUrl, { paid: reference })

  if (cfg.payment === 'sandbox') {
    sandbox.set(reference, { amount: item.price, currency: cfg.currency, serviceId: input.serviceId, status: 'pending', returnUrl: input.returnUrl })
    return { checkoutUrl: `${apiOrigin}/api/payments/sandbox?ref=${reference}`, reference, amount: item.price, currency: cfg.currency, provider: 'sandbox' }
  }

  if (cfg.payment === 'chapa') {
    const response = await fetch(`${CHAPA}/transaction/initialize`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.chapaKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: item.price.toFixed(2), currency: cfg.currency, tx_ref: reference, return_url: returnUrl,
        first_name: clean(first, 40), last_name: clean(rest.join(' '), 40) || clean(first, 40),
        ...(input.customer.email ? { email: clean(input.customer.email, 80) } : {}),
        ...(localPhone(input.customer.phone) ? { phone_number: localPhone(input.customer.phone) } : {}),
        // Chapa allows only letters, numbers, hyphens, underscores, spaces and dots here.
        customization: { title: 'Video visit', description: clean(item.name, 60).replace(/[^\w .-]/g, '') },
        meta: { service: input.serviceId },
      }),
    })
    const data = await response.json().catch(() => ({})) as { status?: string; message?: unknown; data?: { checkout_url?: string } }
    if (!response.ok || data.status !== 'success' || !data.data?.checkout_url) throw new HttpError(502, `Chapa could not start the payment${typeof data.message === 'string' ? `: ${data.message}` : ''}`, 'provider_error')
    return { checkoutUrl: data.data.checkout_url, reference, amount: item.price, currency: cfg.currency, provider: 'chapa' }
  }

  // Stripe Checkout: {CHECKOUT_SESSION_ID} is filled in by Stripe so we can verify the session on return.
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: `${returnUrl.split('#')[0]}${returnUrl.split('#')[0].includes('?') ? '&' : '?'}session={CHECKOUT_SESSION_ID}${returnUrl.includes('#') ? `#${returnUrl.split('#')[1]}` : ''}`,
    cancel_url: withParams(input.returnUrl, { paid: reference, cancelled: '1' }),
    client_reference_id: reference,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': cfg.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(Math.round(item.price * 100)),
    'line_items[0][price_data][product_data][name]': item.name,
    'metadata[reference]': reference,
    'metadata[service]': input.serviceId,
    ...(input.customer.email ? { customer_email: clean(input.customer.email, 80) } : {}),
  })
  const response = await fetch(`${STRIPE}/checkout/sessions`, { method: 'POST', headers: { authorization: `Bearer ${cfg.stripeKey}`, 'content-type': 'application/x-www-form-urlencoded' }, body: form })
  const data = await response.json().catch(() => ({})) as { url?: string; error?: { message?: string } }
  if (!response.ok || !data.url) throw new HttpError(502, `Stripe could not start the payment${data.error?.message ? `: ${data.error.message}` : ''}`, 'provider_error')
  return { checkoutUrl: data.url, reference, amount: item.price, currency: cfg.currency, provider: 'stripe' }
}

/* ---------- Verify with the provider ---------- */

export async function verifyPayment(cfg: ServerConfig, reference: string, session?: string): Promise<VerifyResult> {
  if (!/^NS-[A-Z0-9]+-[A-F0-9]{16}$/.test(reference)) throw new HttpError(400, 'Invalid payment reference', 'invalid_reference')
  if (!cfg.payment) throw new HttpError(503, 'Online payment is not set up', 'payments_off')

  if (cfg.payment === 'sandbox') {
    const entry = sandbox.get(reference)
    if (!entry) throw new HttpError(404, 'Payment not found', 'not_found')
    return { status: entry.status, reference, amount: entry.amount, currency: entry.currency, provider: 'sandbox', method: 'telebirr (simulated)', serviceId: entry.serviceId }
  }

  if (cfg.payment === 'chapa') {
    const response = await fetch(`${CHAPA}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${cfg.chapaKey}` } })
    const data = await response.json().catch(() => ({})) as { status?: string; data?: { status?: string; amount?: number | string; currency?: string; tx_ref?: string; method?: string; payment_method?: string; meta?: { service?: string } } | null }
    if (response.status === 404 || !data.data) return { status: 'pending', reference, amount: 0, currency: cfg.currency, provider: 'chapa' }
    const state = String(data.data.status ?? '').toLowerCase()
    if (data.data.tx_ref && data.data.tx_ref !== reference) throw new HttpError(502, 'Reference mismatch', 'provider_error')
    return { status: state === 'success' ? 'paid' : state === 'failed' ? 'failed' : 'pending', reference, amount: Number(data.data.amount ?? 0), currency: String(data.data.currency ?? cfg.currency), provider: 'chapa', method: data.data.payment_method ?? data.data.method, serviceId: data.data.meta?.service }
  }

  if (!session || !/^cs_[A-Za-z0-9_]+$/.test(session)) return { status: 'pending', reference, amount: 0, currency: cfg.currency, provider: 'stripe' }
  const response = await fetch(`${STRIPE}/checkout/sessions/${encodeURIComponent(session)}`, { headers: { authorization: `Bearer ${cfg.stripeKey}` } })
  const data = await response.json().catch(() => ({})) as { client_reference_id?: string; payment_status?: string; status?: string; amount_total?: number; currency?: string; metadata?: { service?: string } }
  if (!response.ok || data.client_reference_id !== reference) throw new HttpError(400, 'Payment does not match this reference', 'mismatch')
  return { status: data.payment_status === 'paid' ? 'paid' : data.status === 'expired' ? 'failed' : 'pending', reference, amount: (data.amount_total ?? 0) / 100, currency: String(data.currency ?? '').toUpperCase(), provider: 'stripe', method: 'card', serviceId: data.metadata?.service }
}
