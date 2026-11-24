import { useState, type CSSProperties, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brand, Button, DepartmentIcon, Modal } from '../components/ui'
import { roleProfiles } from '../data'
import { ROLE_HOME, useHospital } from '../store/HospitalStore'
import { isOn, moduleForRole } from '../lib/modules'
import { DEFAULT_GRADE, gradeById, GRADES, gradesFor, RESIDENT_YEARS } from '../lib/grades'
import { PROFESSION_OPTIONS, ROLE_LEVELS } from '../lib/teaching'
import { createSecret, DEFAULT_SECURITY, lockedFor, recordFailure, verifyAccessKey } from '../lib/security'
import { blankUnlock, UnlockFields, unlockProblem } from '../components/UnlockSetup'
import { SIGNOUT_REASON_KEY } from '../components/SecurityGuard'
import type { DepartmentId, Grade, RoleId, UnlockSecret } from '../types'

const ROLE_ORDER: RoleId[] = ['physician', 'consultant', 'intern', 'nurse', 'laboratory', 'diagnostics', 'radiographer', 'pharmacist', 'receptionist', 'theatre', 'allied', 'coordinator', 'billing', 'administrator', 'provider']

/** A repeating ECG trace; the bright segment runs along it via CSS. */
const ECG = 'M0 60 H78 L90 60 L98 26 L106 94 L114 42 L122 60 H198 L210 60 L218 26 L226 94 L234 42 L242 60 H318 L330 60 L338 26 L346 94 L354 42 L362 60 H438 L450 60 L458 26 L466 94 L474 42 L482 60 H600'

export default function Login() {
  const { state, currentRole, login, signInBlock, requestAccess, logSecurity } = useHospital()
  const [requesting, setRequesting] = useState(false)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<RoleId>('physician')
  const [department, setDepartment] = useState<DepartmentId>('emergency')
  const [grade, setGrade] = useState<Grade | undefined>(DEFAULT_GRADE.physician)
  const [year, setYear] = useState(1)
  const [level, setLevel] = useState<string | undefined>()
  const [accessKey, setAccessKey] = useState('NORTHSTAR')
  const [remember, setRemember] = useState(true)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const [signedOut] = useState(() => { try { const reason = sessionStorage.getItem(SIGNOUT_REASON_KEY); sessionStorage.removeItem(SIGNOUT_REASON_KEY); return reason } catch { return null } })
  const profile = roleProfiles[selected]
  const canChooseDepartment = ['physician', 'nurse', 'consultant', 'intern'].includes(selected)
  const live = state.departments.filter((item) => item.active !== false)
  const options = live.map((item) => item.id).filter((id) => !['radiology', 'laboratory', 'pharmacy'].includes(id))

  if (currentRole) return <Navigate to={ROLE_HOME[currentRole]} replace />

  const defaultLevel = (role: RoleId) => { const levels = ROLE_LEVELS[role]?.levels; if (!levels) return undefined; const own = state.staff.find((member) => member.roleId === role)?.level; return own && levels.includes(own) ? own : levels[levels.length - 1] }
  const choose = (role: RoleId) => { setSelected(role); setDepartment(roleProfiles[role].department); setGrade(DEFAULT_GRADE[role]); setLevel(defaultLevel(role)); setError('') }
  const levels = ROLE_LEVELS[selected]?.levels ?? []
  const chosenLevel = level && levels.includes(level) ? level : defaultLevel(selected)
  const grades = gradesFor(selected)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const wait = lockedFor(selected)
    if (wait) { setError(`This account is locked after repeated failed sign-ins. Try again in ${Math.ceil(wait / 60_000)} min.`); return }
    if (!verifyAccessKey(accessKey)) {
      const result = recordFailure(selected, state.settings.security?.maxAttempts ?? DEFAULT_SECURITY.maxAttempts)
      logSecurity('sign-in-failed', `Wrong access key (${result.fails} failed)`, roleProfiles[selected].name, selected)
      if (result.lockedMs) {
        logSecurity('locked-out', `Account locked for ${Math.round(result.lockedMs / 60_000)} min after ${result.fails} failed sign-ins`, roleProfiles[selected].name, selected)
        setError(`Too many failed attempts. This account is locked for ${Math.round(result.lockedMs / 60_000)} min.`)
      } else setError(`Wrong access key (demo key: NORTHSTAR). ${result.remaining} ${result.remaining === 1 ? 'try' : 'tries'} left before the account locks.`)
      return
    }
    const blocked = signInBlock(selected)
    if (blocked) { setError(blocked); return }
    login(selected, remember, canChooseDepartment ? department : undefined, grade, year, chosenLevel)
    navigate(ROLE_HOME[selected])
  }

  const inpatients = state.patients.filter((patient) => ['admitted', 'observation'].includes(patient.status)).length

  return (
    <main className="login-page">
      <section className="login-story-panel">
        <Brand name={state.settings.name} tagline={`${state.settings.type} · ${state.settings.tagline}`} />
        <div>
          <svg viewBox="0 0 600 120" className="ecg" aria-hidden="true">
            <path d={ECG} fill="none" className="ecg-base" strokeWidth="2" />
            <path d={ECG} fill="none" className="ecg-trace" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>One hospital.<br />Every profession.<br /><span>One live record.</span></motion.h1>
          <p>Wards, laboratory, imaging, pharmacy, theatres and administration share a single patient record. Your workspace follows your professional role.</p>
          <div className="login-kpis">
            <div><b>{inpatients}</b>inpatients</div>
            <div><b>{state.departments.length}</b>departments</div>
            <div><b>{ROLE_ORDER.length}</b>role workspaces</div>
          </div>
        </div>
        <small>Synthetic demonstration data only · {state.settings.name}{state.settings.city ? `, ${state.settings.city}` : ''}</small>
      </section>

      <section className="login-access-panel">
        <form className="login-card" onSubmit={submit}>
          <span className="login-kicker"><LockKeyhole size={13} />Secure staff access</span>
          <h2>Sign in</h2>
          <p className="login-lede">Tap a demo account to sign in as that professional.</p>

          <div className="role-tiles" role="radiogroup" aria-label="Demo account">
            {ROLE_ORDER.map((roleId, index) => {
              const role = roleProfiles[roleId]
              return (
                <motion.button type="button" role="radio" aria-checked={selected === roleId} key={roleId} className={selected === roleId ? 'selected' : ''} onClick={() => choose(roleId)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} style={{ '--role': role.accent } as CSSProperties}>
                  <b>{role.name}</b>
                  <span>{role.title}</span>
                  {moduleForRole(roleId) && !isOn(state.settings, moduleForRole(roleId)!.id) && <small className="role-tile-off">Not in this facility’s plan</small>}
                  {selected === roleId && <Check size={14} className="role-tile-check" />}
                </motion.button>
              )
            })}
          </div>

          {canChooseDepartment && (
            <label className="form-field">
              <span>Department</span>
              <div className="department-picker">
                <DepartmentIcon id={department} size={16} />
                <select value={department} onChange={(event) => setDepartment(event.target.value as DepartmentId)}>
                  {options.filter((id) => !state.departments.find((item) => item.id === id)?.parent || !options.includes(state.departments.find((item) => item.id === id)!.parent!)).map((id) => {
                    const units = options.filter((unit) => state.departments.find((item) => item.id === unit)?.parent === id)
                    return [<option key={id} value={id}>{state.departments.find((item) => item.id === id)?.name}</option>, ...units.map((unit) => <option key={unit} value={unit}>{'\u00a0\u00a0\u00a0↳ '}{state.departments.find((item) => item.id === unit)?.name}</option>)]
                  })}
                </select>
              </div>
              {['physician', 'nurse', 'consultant', 'intern'].includes(selected) && <small className="muted-text">You’ll see patients in this department’s wards and OPD, plus consults and comorbidity links.</small>}
            </label>
          )}

          {grades.length > 1 && (
            <div className="grade-picker">
              <label className="form-field">
                <span>Grade</span>
                <select value={grade} onChange={(event) => setGrade(event.target.value as Grade)} aria-label="Grade">{grades.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select>
              </label>
              {grade === 'Resident' && <label className="form-field"><span>Year</span><select value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Residency year">{RESIDENT_YEARS.map((value) => <option key={value} value={value}>R{value}</option>)}</select></label>}
              <small className="muted-text">{gradeById(grade)?.description}</small>
            </div>
          )}
          {levels.length > 1 && (
            <div className="grade-picker">
              <label className="form-field">
                <span>Level</span>
                <select value={chosenLevel} onChange={(event) => setLevel(event.target.value)} aria-label="Level">{levels.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <small className="muted-text">Your level on the {ROLE_LEVELS[selected]!.profession.toLowerCase()} ladder: it sets your title, who supervises you and who you can assess.</small>
            </div>
          )}

          <label className="form-field">
            <span>Access key <small className="muted-text">· demo key <b className="mono">NORTHSTAR</b></small></span>
            <div className="key-field">
              <input type={showKey ? 'text' : 'password'} value={accessKey} onChange={(event) => { setAccessKey(event.target.value); setError('') }} autoComplete="current-password" />
              <button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide access key' : 'Show access key'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
          {signedOut && !error && <p className="form-notice" role="status">{signedOut}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <label className="remember-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Remember this device</label>
          <Button type="submit" size="lg" className="login-submit">Sign in as {profile.name}<ArrowRight size={18} /></Button>
          <p className="login-lede">New to {state.settings.name}? <button type="button" className="link-button" onClick={() => setRequesting(true)}>Request access</button> — an administrator approves it and sets your access.</p>
        </form>
        {requesting && <RequestAccessModal onClose={() => setRequesting(false)} onSubmit={(input) => { requestAccess(input); setRequesting(false) }} />}
      </section>
    </main>
  )
}

export interface AccessRequest { name: string; roleId: RoleId; department: DepartmentId; specialty: string; email: string; grade?: Grade; residentYear?: number; level?: string; unlock?: UnlockSecret }

function RequestAccessModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: AccessRequest) => void }) {
  const { state } = useHospital()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profession, setProfession] = useState(PROFESSION_OPTIONS[0].id)
  const [grade, setGrade] = useState<Grade>('Intern')
  const [year, setYear] = useState(1)
  const [level, setLevel] = useState('')
  const [department, setDepartment] = useState<DepartmentId>(state.departments[0]?.id ?? 'emergency')
  const [specialty, setSpecialty] = useState('')
  const [unlock, setUnlock] = useState(blankUnlock())
  const [tried, setTried] = useState(false)
  const [sending, setSending] = useState(false)
  const option = PROFESSION_OPTIONS.find((item) => item.id === profession)!
  const levelValue = option.levels?.includes(level) ? level : option.levels?.[0] ?? ''
  const roleId: RoleId = option.doctor ? gradeById(grade)!.role : option.role!
  const valid = name.trim().split(/\s+/).length >= 2 && /.+@.+\..+/.test(email)
  const submit = async () => {
    setTried(true)
    if (unlockProblem(unlock)) return
    setSending(true)
    const secret = await createSecret(unlock.method, unlock.secret)
    setSending(false)
    send(secret)
  }
  const send = (secret: UnlockSecret) => onSubmit({ name, roleId, department, specialty, email, unlock: secret, ...(option.doctor ? { grade, ...(grade === 'Resident' ? { residentYear: year } : {}) } : levelValue ? { level: levelValue } : {}) })
  return (
    <Modal open onClose={onClose} title="Request access" subtitle={`An administrator at ${state.settings.name} will review your request`} size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Full name <b>*</b></span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="form-field"><span>Work email <b>*</b></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="form-field"><span>Profession</span><select value={profession} onChange={(event) => { setProfession(event.target.value); setLevel('') }}>{PROFESSION_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        {option.doctor
          ? <label className="form-field"><span>Grade</span><select value={grade} onChange={(event) => setGrade(event.target.value as Grade)}>{GRADES.map((item) => <option key={item.id}>{item.id}</option>)}</select></label>
          : option.levels ? <label className="form-field"><span>Level</span><select value={levelValue} onChange={(event) => setLevel(event.target.value)}>{option.levels.map((item) => <option key={item}>{item}</option>)}</select></label> : <span />}
        {option.doctor && grade === 'Resident' && <label className="form-field"><span>Residency year</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{RESIDENT_YEARS.map((value) => <option key={value} value={value}>R{value}</option>)}</select></label>}
        <label className="form-field"><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{state.departments.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field span-2"><span>Specialty, unit or licence number</span><input value={specialty} onChange={(event) => setSpecialty(event.target.value)} /></label>
      </div>
      {option.doctor && <p className="record-hint">{gradeById(grade)?.description}</p>}
      <span className="detail-heading">Quick unlock</span>
      <UnlockFields value={unlock} onChange={setUnlock} showError={tried} />
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!valid || sending} onClick={submit}>{sending ? 'Sending…' : 'Send request'}</Button></div>
    </Modal>
  )
}
