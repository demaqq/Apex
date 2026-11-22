import { sha256 } from './sha256'
import type { SecurityEvent, SecuritySettings } from '../types'

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
}

/**
 * Demo credential check. In this demo every account shares one access key; a production deployment replaces this
 * with per-user passwords or single sign-on and multi-factor authentication, verified on the server.
 */
export const verifyAccessKey = (input: string) => input.trim().toUpperCase() === 'NORTHSTAR'
