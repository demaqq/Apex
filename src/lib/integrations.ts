/**
 * Talks to the hospital's own API (server/router.ts) for real payments and SMS. When no API answers — the static
 * demo, or before the server is configured — everything falls back to demo mode and nothing is charged or sent.
 */
import { useEffect, useState } from 'react'

const API = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export interface Integrations {
  payments: { provider: 'chapa' | 'stripe' | 'sandbox'; mode: 'live' | 'test'; currency: string } | null
  sms: { provider: 'afromessage' | 'africastalking' | 'twilio' | 'log' } | null
  prices: Record<string, number>
}

export const PROVIDER_NAME: Record<string, string> = { chapa: 'Chapa', stripe: 'Stripe', sandbox: 'Sandbox checkout', afromessage: 'AfroMessage', africastalking: "Africa's Talking", twilio: 'Twilio', log: 'Server log (development)' }

let cached: Promise<Integrations | null> | null = null

/** Reads /api/health once (4 s timeout). Null means demo mode. */
export function loadIntegrations(force = false): Promise<Integrations | null> {
  if (cached && !force) return cached
  cached = (async () => {
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 4000)
      const response = await fetch(`${API}/api/health`, { signal: controller.signal, headers: { accept: 'application/json' } })
      window.clearTimeout(timer)
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) return null
      const data = await response.json() as Integrations & { ok?: boolean }
      return data.ok ? { payments: data.payments ?? null, sms: data.sms ?? null, prices: data.prices ?? {} } : null
    } catch {
      return null
    }
  })()
  return cached
}

/** undefined while checking, null in demo mode. */
export function useIntegrations() {
  const [value, setValue] = useState<Integrations | null | undefined>(undefined)
  useEffect(() => { let live = true; void loadIntegrations().then((result) => { if (live) setValue(result) }); return () => { live = false } }, [])
  return value
}

/** A link into the app that works with either router (hash router in the hosted demo). */
export function appLink(path: string) {
  const { origin, pathname } = window.location
  return import.meta.env.VITE_HASH_ROUTER === '1' ? `${origin}${pathname}#${path}` : `${origin}${path}`
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { 'content-type': 'application/json', accept: 'application/json', ...(init?.headers ?? {}) } })
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

export interface Checkout { checkoutUrl: string; reference: string; amount: number; currency: string; provider: string }
export interface Verified { status: 'paid' | 'pending' | 'failed'; reference: string; amount: number; currency: string; provider: string; method?: string; serviceId?: string }

export const startCheckout = (serviceId: string, customer: { name: string; phone?: string; email?: string }, returnPath = '/care') =>
  call<Checkout>('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ serviceId, customer, returnUrl: appLink(returnPath) }) })

export const verifyCheckout = (reference: string, session?: string) =>
  call<Verified>(`/api/payments/verify?ref=${encodeURIComponent(reference)}${session ? `&session=${encodeURIComponent(session)}` : ''}`)

export type SmsTemplate = 'booked' | 'queued' | 'reminder' | 'ready' | 'reply' | 'cancelled' | 'summary' | 'test'
export interface SmsSent { ok: boolean; provider: string; id?: string; to?: string; error?: string }

export async function sendTemplateSms(to: string, template: SmsTemplate, params: Record<string, string> = {}): Promise<SmsSent> {
  try { return await call<SmsSent>('/api/sms/send', { method: 'POST', body: JSON.stringify({ to, template, params }) }) } catch (error) { return { ok: false, provider: 'api', error: error instanceof Error ? error.message : 'Failed' } }
}

/* ---------- Pending checkout (survives the trip to the payment page) ---------- */

const PENDING = 'careos-pending-checkout'
const DONE = 'careos-processed-payments'

export interface PendingCheckout<T> { kind: 'visit' | 'message'; reference: string; provider: string; amount: number; patientId: string; payload: T; at: string }

export function savePending<T>(value: PendingCheckout<T>) { try { sessionStorage.setItem(PENDING, JSON.stringify(value)) } catch { /* ignore */ } }
export function readPending<T>(): PendingCheckout<T> | null { try { const raw = sessionStorage.getItem(PENDING); return raw ? JSON.parse(raw) as PendingCheckout<T> : null } catch { return null } }
export function clearPending() { try { sessionStorage.removeItem(PENDING) } catch { /* ignore */ } }
export function alreadyProcessed(reference: string) { try { return (sessionStorage.getItem(DONE) ?? '').split(',').includes(reference) } catch { return false } }
export function markProcessed(reference: string) { try { sessionStorage.setItem(DONE, [...(sessionStorage.getItem(DONE) ?? '').split(',').filter(Boolean).slice(-20), reference].join(',')) } catch { /* ignore */ } }

/** The ?paid=… (&session=…, &cancelled=1) the payment provider sends the patient back with. */
export function returnParams() {
  const search = new URLSearchParams(window.location.search)
  const hashQuery = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const get = (key: string) => search.get(key) ?? hashQuery.get(key)
  return { paid: get('paid'), session: get('session'), cancelled: get('cancelled') === '1' }
}

export function clearReturnParams() {
  const url = new URL(window.location.href)
  ;['paid', 'session', 'cancelled'].forEach((key) => url.searchParams.delete(key))
  const [hashPath, hashQuery] = url.hash.split('?')
  if (hashQuery) { const query = new URLSearchParams(hashQuery); ['paid', 'session', 'cancelled'].forEach((key) => query.delete(key)); url.hash = query.toString() ? `${hashPath}?${query}` : hashPath }
  window.history.replaceState(window.history.state, '', url.toString())
}
