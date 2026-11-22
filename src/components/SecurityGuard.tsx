import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { KeyRound, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import { Button, Modal } from './ui'
import { clearFailures, DEFAULT_SECURITY, lockedFor, recordFailure, verifyAccessKey } from '../lib/security'
import { useHospital } from '../store/HospitalStore'

const LOCK_KEY = 'northstar-careos-locked'
const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'] as const

type StepUp = (reason: string, kind?: 'export' | 'break-glass') => Promise<boolean>
const StepUpContext = createContext<StepUp>(async () => true)
/** Ask for the access key again before a sensitive action. Resolves false if cancelled or wrong. */
export const useStepUp = () => useContext(StepUpContext)

/** Idle screen lock and step-up re-authentication for the signed-in session. */
export function SecurityGuard({ children }: { children: ReactNode }) {
  const { state, currentRole, profile, logout, logSecurity, notify } = useHospital()
  const policy = state.settings.security ?? DEFAULT_SECURITY
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

  const unlock = () => {
    if (!currentRole) return
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
    logSecurity('unlock', 'Unlocked the screen')
    setLocked(false); setKey(''); setError('')
    try { sessionStorage.removeItem(LOCK_KEY) } catch { /* ignore */ }
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
    <StepUpContext.Provider value={requireStepUp}>
      {children}
      {currentRole && locked && (
        <div className="lock-screen" role="dialog" aria-modal="true" aria-label="Screen locked">
          <div className="lock-card">
            <span className="lock-icon"><LockKeyhole size={26} /></span>
            <h2>Screen locked</h2>
            <p>{profile?.name} · locked after {policy.idleMinutes} minutes without activity. Patient information is hidden.</p>
            <label className="form-field"><span>Access key</span><input type="password" autoFocus value={key} onChange={(event) => { setKey(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') unlock() }} aria-label="Access key" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="lock-actions"><Button variant="ghost" icon={LogOut} onClick={() => { setLocked(false); try { sessionStorage.removeItem(LOCK_KEY) } catch { /* ignore */ } logout() }}>Sign out</Button><Button icon={KeyRound} onClick={unlock}>Unlock</Button></div>
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
    </StepUpContext.Provider>
  )
}
