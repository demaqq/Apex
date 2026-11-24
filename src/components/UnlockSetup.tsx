import { useState } from 'react'
import { KeyRound, Phone, Hash, Type } from 'lucide-react'
import { Button, Modal } from './ui'
import { createSecret, UNLOCK_HINT, validateSecret } from '../lib/security'
import { useHospital } from '../store/HospitalStore'
import type { UnlockMethod, UnlockSecret } from '../types'

export interface UnlockDraft { method: UnlockMethod; secret: string; confirm: string }
export const blankUnlock = (): UnlockDraft => ({ method: 'PIN', secret: '', confirm: '' })

/** What is wrong with a draft, or null when it can be saved. */
export function unlockProblem(draft: UnlockDraft) {
  if (!draft.secret) return 'Choose your quick-unlock secret.'
  const weak = validateSecret(draft.method, draft.secret)
  if (weak) return weak
  if (draft.secret.trim() !== draft.confirm.trim()) return 'The two entries do not match.'
  return null
}

const METHODS: Array<{ id: UnlockMethod; label: string; icon: typeof Hash }> = [
  { id: 'PIN', label: 'PIN', icon: Hash },
  { id: 'Phone digits', label: 'Last 4 of phone', icon: Phone },
  { id: 'Passphrase', label: 'Passphrase', icon: Type },
]

/** Method choice plus the secret entered twice. Digits-only methods use a numeric keypad on phones. */
export function UnlockFields({ value, onChange, showError }: { value: UnlockDraft; onChange: (draft: UnlockDraft) => void; showError?: boolean }) {
  const numeric = value.method !== 'Passphrase'
  const problem = unlockProblem(value)
  return (
    <div className="unlock-fields">
      <div className="form-field"><span>Unlock with</span><div className="segmented" role="radiogroup" aria-label="Unlock with">{METHODS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="radio" aria-checked={value.method === id} className={value.method === id ? 'on' : ''} onClick={() => onChange({ method: id, secret: '', confirm: '' })}><Icon size={13} /> {label}</button>)}</div></div>
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>{UNLOCK_HINT[value.method]}</span><input type="password" inputMode={numeric ? 'numeric' : 'text'} autoComplete="new-password" maxLength={numeric ? (value.method === 'PIN' ? 6 : 4) : 64} value={value.secret} onChange={(event) => onChange({ ...value, secret: numeric ? event.target.value.replace(/\D/g, '') : event.target.value })} aria-label="Quick-unlock secret" /></label>
        <label className="form-field"><span>Enter it again</span><input type="password" inputMode={numeric ? 'numeric' : 'text'} autoComplete="new-password" maxLength={numeric ? (value.method === 'PIN' ? 6 : 4) : 64} value={value.confirm} onChange={(event) => onChange({ ...value, confirm: numeric ? event.target.value.replace(/\D/g, '') : event.target.value })} aria-label="Confirm quick-unlock secret" /></label>
      </div>
      {showError && problem && value.secret && <p className="form-error" role="alert">{problem}</p>}
      <p className="record-hint">Used to unlock your screen after it locks. Three wrong tries sign you out. It is stored only as a one-way, salted hash — nobody, including administrators, can read it.</p>
    </div>
  )
}

/** Set or change your own quick-unlock secret. */
export function SetUnlockModal({ onClose, first }: { onClose: () => void; first?: boolean }) {
  const { meAsStaff, setUnlock } = useHospital()
  const me = meAsStaff()
  const [draft, setDraft] = useState(blankUnlock())
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  if (!me) return null
  const save = async () => {
    setTried(true)
    if (unlockProblem(draft)) return
    setSaving(true)
    const secret: UnlockSecret = await createSecret(draft.method, draft.secret)
    setUnlock(me.id, secret)
    setSaving(false)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={first ? 'Set up quick unlock' : 'Change quick unlock'} subtitle={me.name} size="sm">
      {first && <p className="record-hint">Your screen locks when you step away. Choose a PIN, the last digits of your phone, or a passphrase to get back in quickly.</p>}
      <UnlockFields value={draft} onChange={setDraft} showError={tried} />
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>{first ? 'Later' : 'Cancel'}</Button><Button icon={KeyRound} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></div>
    </Modal>
  )
}
