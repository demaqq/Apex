import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { KeyRound, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import { Button, Modal } from './ui'
import { checkSecret, clearFailures, DEFAULT_SECURITY, idleMinutesOf, lockedFor, recordFailure, UNLOCK_ATTEMPTS, UNLOCK_HINT, verifyAccessKey } from '../lib/security'
import { SetUnlockModal } from './UnlockSetup'
import { useHospital } from '../store/HospitalStore'

const LOCK_KEY = 'northstar-careos-locked'
/** 'careos-active' is sent by live features (e.g. a video consultation) so the screen does not lock mid-call. */
const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'careos-active'] as const

type StepUp = (reason: string, kind?: 'export' | 'break-glass') => Promise<boolean>
interface Guard { requireStepUp: StepUp; needsUnlockSetup: boolean; openUnlockSetup: () => void; dismissUnlockSetup: () => void }
const GuardContext = createContext<Guard>({ requireStepUp: async () => true, needsUnlockSetup: false, openUnlockSetup: () => {}, dismissUnlockSetup: () => {} })
/** Ask for the access key again before a sensitive action. Resolves false if cancelled or wrong. */
export const useStepUp = () => useContext(GuardContext).requireStepUp
/** Quick-unlock set-up: whether the signed-in person still needs one, and how to open the set-up. */
export const useQuickUnlock = () => useContext(GuardContext)
const PIN_FAILS_KEY = 'northstar-careos-unlock-fails'
const PROMPT_KEY = 'northstar-careos-unlock-later'
export const SIGNOUT_REASON_KEY = 'northstar-careos-signout-reason'

/** Idle screen lock and step-up re-authentication for the signed-in session. */
export function SecurityGuard({ children }: { children: ReactNode }) {
  const { state, currentRole, profile, logout, logSecurity, notify, meAsStaff } = useHospital()
  const me = currentRole ? meAsStaff() : undefined
  const secret = me?.unlock
  const [pinFails, setPinFails] = useState(() => { try { return Number(sessionStorage.getItem(PIN_FAILS_KEY)) || 0 } catch { return 0 } })
  const [checking, setChecking] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [later, setLater] = useState(() => { try { return sessionStorage.getItem(PROMPT_KEY) === '1' } catch { return false } })
  const saved = state.settings.security ?? DEFAULT_SECURITY
  const policy = { ...saved, idleMinutes: idleMinutesOf(saved) }
  const [locked, setLocked] = useState(() => { try { return sessionStorage.getItem(LOCK_KEY) === '1' } catch { return false } })
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const timer = useRef<number>(0)
  const [stepUp, setStepUp] = useState<{ reason: string; resolve: (ok: boolean) => void } | null>(null)
  const [stepKey, setStepKey] = useState('')
  const [stepError, setStepError] = useState('')

  const lock = useCallback(() => {
    setLocked(true)
    try { sessionStorage.setItem(LOCK_KEY, '1') } catch { /* ignore */ }
    logSecurity('auto-lock', `Screen locked after ${policy.idleMinutes} idle minutes`)
  }, [logSecurity, policy.idleMinutes])

  // Restart the idle timer on any activity.
  useEffect(() => {
    if (!currentRole || locked) return
    const reset = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(lock, policy.idleMinutes * 60_000) }
    reset()
    ACTIVITY.forEach((name) => window.addEventListener(name, reset, { passive: true }))
    return () => { window.clearTimeout(timer.current); ACTIVITY.forEach((name) => window.removeEventListener(name, reset)) }
  }, [currentRole, locked, lock, policy.idleMinutes])

  useEffect(() => { if (!currentRole) { setLocked(false); try { sessionStorage.removeItem(LOCK_KEY) } catch { /* ignore */ } } }, [currentRole])

  const finishUnlock = () => {
    setLocked(false); setKey(''); setError(''); setPinFails(0)
    try { sessionStorage.removeItem(LOCK_KEY); sessionStorage.removeItem(PIN_FAILS_KEY) } catch { /* ignore */ }
  }

  /** Personal secret: three wrong tries end the session. */
  const unlockWithSecret = async () => {
    if (!secret || checking || !key) return
    setChecking(true)
    const ok = await checkSecret(secret, key)
    setChecking(false)
    if (ok) { logSecurity('unlock', `Unlocked with ${secret.method === 'PIN' ? 'PIN' : secret.method === 'Phone digits' ? 'phone digits' : 'passphrase'}`); finishUnlock(); return }
    const fails = pinFails + 1
    setPinFails(fails)
    try { sessionStorage.setItem(PIN_FAILS_KEY, String(fails)) } catch { /* ignore */ }
    logSecurity('unlock-failed', `Wrong ${secret.method === 'PIN' ? 'PIN' : secret.method === 'Phone digits' ? 'phone digits' : 'passphrase'} on the lock screen (${fails} of ${UNLOCK_ATTEMPTS})`)
    setKey('')
    if (fails >= UNLOCK_ATTEMPTS) {
      logSecurity('unlock-signout', `Signed out after ${UNLOCK_ATTEMPTS} wrong unlock attempts`)
      try { sessionStorage.setItem(SIGNOUT_REASON_KEY, `You were signed out after ${UNLOCK_ATTEMPTS} wrong unlock attempts. Please sign in again.`) } catch { /* ignore */ }
      finishUnlock()
      logout()
      return
    }
    setError(`Wrong ${secret.method === 'PIN' ? 'PIN' : secret.method === 'Phone digits' ? 'digits' : 'passphrase'}. ${UNLOCK_ATTEMPTS - fails} ${UNLOCK_ATTEMPTS - fails === 1 ? 'try' : 'tries'} left before you are signed out.`)
  }

  const unlock = () => {
    if (!currentRole) return
    if (secret) { void unlockWithSecret(); return }
    const wait = lockedFor(currentRole)
    if (wait) { setError(`Too many failed attempts. Try again in ${Math.ceil(wait / 60_000)} min, or sign out.`); return }
    if (!verifyAccessKey(key)) {
      const result = recordFailure(currentRole, policy.maxAttempts)
      logSecurity('unlock-failed', `Wrong access key on the lock screen (${result.fails} failed)`)
      if (result.lockedMs) {
        logSecurity('locked-out', `Account locked for ${Math.round(result.lockedMs / 60_000)} min after repeated failures`)
        setLocked(false); try { sessionStorage.removeItem(LOCK_KEY) } catch { /* ignore */ }
        logout()
        return
      }
      setError(`Wrong access key. ${result.remaining} ${result.remaining === 1 ? 'try' : 'tries'} left before the account locks.`)
      setKey('')
      return
    }
    clearFailures(currentRole)
    logSecurity('unlock', 'Unlocked the screen with the access key')
    finishUnlock()
  }

  const requireStepUp = useCallback<StepUp>((reason, kind = 'export') => {
    const needed = kind === 'break-glass' ? policy.stepUpBreakGlass : policy.stepUpExports
    if (!needed) return Promise.resolve(true)
    return new Promise<boolean>((resolve) => { setStepKey(''); setStepError(''); setStepUp({ reason, resolve }) })
  }, [policy.stepUpBreakGlass, policy.stepUpExports])

  const confirmStepUp = () => {
    if (!stepUp || !currentRole) return
    if (!verifyAccessKey(stepKey)) {
      const result = recordFailure(currentRole, policy.maxAttempts)
      logSecurity('step-up-failed', `Wrong access key before: ${stepUp.reason}`)
      if (result.lockedMs) { logSecurity('locked-out', 'Account locked after repeated failures'); stepUp.resolve(false); setStepUp(null); logout(); notify('Account locked after repeated failures', 'warning'); return }
      setStepError(`Wrong access key. ${result.remaining} left before the account locks.`)
      return
    }
    clearFailures(currentRole)
    logSecurity('step-up', `Re-authenticated for: ${stepUp.reason}`)
    stepUp.resolve(true); setStepUp(null)
  }

  return (
    <GuardContext.Provider value={{ requireStepUp, needsUnlockSetup: Boolean(currentRole && me && !secret && !later), openUnlockSetup: () => setSetupOpen(true), dismissUnlockSetup: () => { setLater(true); try { sessionStorage.setItem(PROMPT_KEY, '1') } catch { /* ignore */ } } }}>
      {children}
      {currentRole && locked && (
        <div className="lock-screen" role="dialog" aria-modal="true" aria-label="Screen locked">
          <div className="lock-card">
            <span className="lock-icon"><LockKeyhole size={26} /></span>
            <h2>Screen locked</h2>
            <p>{profile?.name} · locked after {policy.idleMinutes} minutes without activity. Patient information is hidden.</p>
            {secret
              ? <label className="form-field"><span>{UNLOCK_HINT[secret.method]}</span><input type="password" autoFocus inputMode={secret.method === 'Passphrase' ? 'text' : 'numeric'} autoComplete="off" value={key} onChange={(event) => { setKey(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') unlock() }} aria-label="Unlock secret" />{!error && <small className="muted-text">{UNLOCK_ATTEMPTS - pinFails} {UNLOCK_ATTEMPTS - pinFails === 1 ? 'try' : 'tries'} before you are signed out</small>}</label>
              : <label className="form-field"><span>Access key</span><input type="password" autoFocus value={key} onChange={(event) => { setKey(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') unlock() }} aria-label="Access key" /></label>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="lock-actions"><Button variant="ghost" icon={LogOut} onClick={() => { setLocked(false); try { sessionStorage.removeItem(LOCK_KEY) } catch { /* ignore */ } logout() }}>Sign out</Button><Button icon={KeyRound} disabled={checking} onClick={unlock}>{checking ? 'Checking…' : 'Unlock'}</Button></div>
          </div>
        </div>
      )}
      {stepUp && (
        <Modal open onClose={() => { stepUp.resolve(false); setStepUp(null) }} title="Confirm it’s you" subtitle={stepUp.reason} size="sm">
          <p className="record-hint"><ShieldCheck size={14} /> Sensitive action: enter your access key again. This is recorded in the security log.</p>
          <label className="form-field"><span>Access key</span><input type="password" autoFocus value={stepKey} onChange={(event) => { setStepKey(event.target.value); setStepError('') }} onKeyDown={(event) => { if (event.key === 'Enter') confirmStepUp() }} aria-label="Confirm access key" /></label>
          {stepError && <p className="form-error" role="alert">{stepError}</p>}
          <div className="modal-footer"><Button variant="ghost" onClick={() => { stepUp.resolve(false); setStepUp(null) }}>Cancel</Button><Button icon={KeyRound} onClick={confirmStepUp}>Confirm</Button></div>
        </Modal>
      )}
      {setupOpen && <SetUnlockModal first={!secret} onClose={() => setSetupOpen(false)} />}
    </GuardContext.Provider>
  )
}
