import { useState, type CSSProperties, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brand, Button, DepartmentIcon, Modal } from '../components/ui'
import { roleProfiles } from '../data'
import { ROLE_HOME, useHospital } from '../store/HospitalStore'
import type { DepartmentId, RoleId } from '../types'

const diagnosticDepartments: DepartmentId[] = ['radiology', 'laboratory']
const ROLE_ORDER: RoleId[] = ['physician', 'consultant', 'intern', 'nurse', 'diagnostics', 'pharmacist', 'receptionist', 'theatre', 'allied', 'coordinator', 'billing', 'administrator']

/** A repeating ECG trace; the bright segment runs along it via CSS. */
const ECG = 'M0 60 H78 L90 60 L98 26 L106 94 L114 42 L122 60 H198 L210 60 L218 26 L226 94 L234 42 L242 60 H318 L330 60 L338 26 L346 94 L354 42 L362 60 H438 L450 60 L458 26 L466 94 L474 42 L482 60 H600'

export default function Login() {
  const { state, currentRole, login, signInBlock, requestAccess } = useHospital()
  const [requesting, setRequesting] = useState(false)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<RoleId>('physician')
  const [department, setDepartment] = useState<DepartmentId>('emergency')
  const [accessKey, setAccessKey] = useState('NORTHSTAR')
  const [remember, setRemember] = useState(true)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const profile = roleProfiles[selected]
  const canChooseDepartment = ['physician', 'nurse', 'consultant', 'intern', 'diagnostics'].includes(selected)
  const live = state.departments.filter((item) => item.active !== false)
  const options = selected === 'diagnostics' ? diagnosticDepartments.filter((id) => live.some((item) => item.id === id)) : live.map((item) => item.id).filter((id) => !['radiology', 'laboratory', 'pharmacy'].includes(id))

  if (currentRole) return <Navigate to={ROLE_HOME[currentRole]} replace />

  const choose = (role: RoleId) => { setSelected(role); setDepartment(roleProfiles[role].department); setError('') }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (accessKey.trim().toUpperCase() !== 'NORTHSTAR') { setError('Use the demo access key NORTHSTAR to sign in.'); return }
    const blocked = signInBlock(selected)
    if (blocked) { setError(blocked); return }
    login(selected, remember, canChooseDepartment ? department : undefined)
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
                  {selected === roleId && <Check size={14} className="role-tile-check" />}
                </motion.button>
              )
            })}
          </div>

          {canChooseDepartment && (
            <label className="form-field">
              <span>{selected === 'diagnostics' ? 'Diagnostic service' : 'Department'}</span>
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

          <label className="form-field">
            <span>Access key <small className="muted-text">· demo key <b className="mono">NORTHSTAR</b></small></span>
            <div className="key-field">
              <input type={showKey ? 'text' : 'password'} value={accessKey} onChange={(event) => { setAccessKey(event.target.value); setError('') }} autoComplete="current-password" />
              <button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide access key' : 'Show access key'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
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

function RequestAccessModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: { name: string; roleId: RoleId; department: DepartmentId; specialty: string; email: string }) => void }) {
  const { state } = useHospital()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState<RoleId>('nurse')
  const [department, setDepartment] = useState<DepartmentId>(state.departments[0]?.id ?? 'emergency')
  const [specialty, setSpecialty] = useState('')
  const valid = name.trim().split(/\s+/).length >= 2 && /.+@.+\..+/.test(email)
  return (
    <Modal open onClose={onClose} title="Request access" subtitle={`An administrator at ${state.settings.name} will review your request`} size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Full name <b>*</b></span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="form-field"><span>Work email <b>*</b></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="form-field"><span>Profession</span><select value={roleId} onChange={(event) => setRoleId(event.target.value as RoleId)}>{ROLE_ORDER.filter((id) => id !== 'administrator').map((id) => <option key={id} value={id}>{roleProfiles[id].title}</option>)}</select></label>
        <label className="form-field"><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{state.departments.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field span-2"><span>Specialty, unit or licence number</span><input value={specialty} onChange={(event) => setSpecialty(event.target.value)} /></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => onSubmit({ name, roleId, department, specialty, email })}>Send request</Button></div>
    </Modal>
  )
}
