import { sha256 } from './sha256'
import type { SecurityEvent, SecuritySettings, UnlockMethod, UnlockSecret } from '../types'

export const DEFAULT_SECURITY: SecuritySettings = { idleMinutes: 10, sessionHours: 12, maxAttempts: 5, stepUpExports: true, stepUpBreakGlass: true }

/* ---------- Sign-in throttling (per account, on this device) ---------- */

const ATTEMPTS_KEY = 'northstar-careos-attempts'
type Attempts = Record<string, { fails: number; lockedUntil?: number }>
const readAttempts = (): Attempts => { try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? '{}') as Attempts } catch { return {} } }
const writeAttempts = (value: Attempts) => { try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(value)) } catch { /* private mode */ } }

/** Milliseconds this account is still locked out, or 0. */
export function lockedFor(account: string) {
  const until = readAttempts()[account]?.lockedUntil ?? 0
  return Math.max(0, until - Date.now())
}

/** Records a failed attempt. After `max` failures the account locks: 1 minute, doubling each time, up to 30 minutes. */
export function recordFailure(account: string, max: number) {
  const all = readAttempts()
  const entry = all[account] ?? { fails: 0 }
  entry.fails += 1
  let locked = 0
  if (entry.fails >= max) {
    const step = entry.fails - max
    locked = Math.min(30, 2 ** step) * 60_000
    entry.lockedUntil = Date.now() + locked
  }
  all[account] = entry
  writeAttempts(all)
  return { fails: entry.fails, remaining: Math.max(0, max - entry.fails), lockedMs: locked }
}

export function clearFailures(account: string) {
  const all = readAttempts()
  delete all[account]
  writeAttempts(all)
}

/* ---------- Session lifetime ---------- */

const STARTED_KEY = 'northstar-careos-session-started'
export const markSessionStart = () => { try { sessionStorage.setItem(STARTED_KEY, String(Date.now())); localStorage.setItem(STARTED_KEY, String(Date.now())) } catch { /* ignore */ } }
export const sessionStartedAt = () => { try { return Number(sessionStorage.getItem(STARTED_KEY) ?? localStorage.getItem(STARTED_KEY)) || 0 } catch { return 0 } }
export const clearSessionStart = () => { try { sessionStorage.removeItem(STARTED_KEY); localStorage.removeItem(STARTED_KEY) } catch { /* ignore */ } }

/* ---------- Tamper-evident security log ---------- */

const GENESIS = '0'.repeat(64)
const digest = (event: Omit<SecurityEvent, 'hash'>) => sha256([event.prev, event.id, event.at, event.type, event.actor, event.role ?? '', event.detail].join('|'))

/** Appends an event whose hash covers the previous one, so editing or deleting any entry breaks the chain. */
export function chainEvent(log: SecurityEvent[], input: Omit<SecurityEvent, 'id' | 'at' | 'prev' | 'hash'>): SecurityEvent {
  const prev = log[0]?.hash ?? GENESIS
  const base = { ...input, id: `SE-${(log.length + 1).toString().padStart(5, '0')}`, at: new Date().toISOString(), prev }
  return { ...base, hash: digest(base) }
}

/** Checks every link of the chain (log is newest first). Returns the first broken entry, if any. */
export function verifyChain(log: SecurityEvent[]): { ok: boolean; checked: number; brokenAt?: string } {
  const ordered = [...log].reverse()
  let prev = GENESIS
  for (const event of ordered) {
    const { hash, ...rest } = event
    if (event.prev !== prev || digest(rest) !== hash) return { ok: false, checked: ordered.length, brokenAt: event.id }
    prev = hash
  }
  return { ok: true, checked: ordered.length }
}

export const SECURITY_LABEL: Record<SecurityEvent['type'], string> = {
  'sign-in': 'Signed in',
  'sign-in-failed': 'Failed sign-in',
  'locked-out': 'Account locked',
  'sign-out': 'Signed out',
  'auto-lock': 'Screen locked (idle)',
  'unlock': 'Unlocked',
  'unlock-failed': 'Failed unlock',
  'session-expired': 'Session expired',
  'step-up': 'Re-authenticated',
  'step-up-failed': 'Failed re-authentication',
  'export': 'Data exported',
  'break-glass': 'Emergency access',
  'settings': 'Security settings changed',
  'unlock-set': 'Quick-unlock set',
  'unlock-reset': 'Quick-unlock reset by administrator',
  'unlock-signout': 'Signed out: wrong unlock',
}

/**
 * Demo credential check. In this demo every account shares one access key; a production deployment replaces this
 * with per-user passwords or single sign-on and multi-factor authentication, verified on the server.
 */
export const verifyAccessKey = (input: string) => input.trim().toUpperCase() === 'NORTHSTAR'

/* ---------- Personal quick-unlock secret ---------- */

export const UNLOCK_ATTEMPTS = 3
export const UNLOCK_HINT: Record<UnlockMethod, string> = {
  PIN: '4–6 digit PIN',
  'Phone digits': 'Last 4 digits of your phone number',
  Passphrase: 'Passphrase (at least 6 characters)',
}

/** Rejects secrets that are too short or too easy to guess. Returns a message, or null when acceptable. */
export function validateSecret(method: UnlockMethod, value: string): string | null {
  const text = value.trim()
  if (method === 'Passphrase') return text.length >= 6 ? null : 'Use at least 6 characters.'
  const length = method === 'PIN' ? [4, 6] : [4, 4]
  if (!/^\d+$/.test(text) || text.length < length[0] || text.length > length[1]) return method === 'PIN' ? 'Use 4 to 6 digits.' : 'Enter exactly the last 4 digits.'
  if (method === 'PIN') {
    if (/^(\d)\1+$/.test(text)) return 'Too easy to guess: avoid repeating one digit.'
    const digits = text.split('').map(Number)
    const steps = digits.slice(1).map((digit, index) => digit - digits[index])
    if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) return 'Too easy to guess: avoid sequences like 1234.'
    if (['1212', '2580', '0852', '1004', '2000', '1122', '6969'].includes(text)) return 'Too common: choose another PIN.'
  }
  return null
}

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
const normalise = (method: UnlockMethod, value: string) => method === 'Passphrase' ? value.trim().normalize('NFKC') : value.trim()

async function derive(method: UnlockMethod, value: string, salt: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalise(method, value)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150_000 }, material, 256)
  return hex(bits)
}

/** Hashes a new secret with a fresh random salt. */
export async function createSecret(method: UnlockMethod, value: string): Promise<UnlockSecret> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer)
  return { method, salt, hash: await derive(method, value, salt), setAt: new Date().toISOString() }
}

/** Constant-time comparison of the derived hash. */
export async function checkSecret(secret: UnlockSecret, value: string) {
  const attempt = await derive(secret.method, value, secret.salt)
  let diff = attempt.length ^ secret.hash.length
  for (let i = 0; i < Math.min(attempt.length, secret.hash.length); i++) diff |= attempt.charCodeAt(i) ^ secret.hash.charCodeAt(i)
  return diff === 0
}
