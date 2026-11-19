import { motion } from 'framer-motion'
import { Activity, ArrowRight, BedDouble, Building2, Check, Eye, EyeOff, FlaskConical, HeartPulse, LockKeyhole, ShieldCheck, Stethoscope, UserRoundCog, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { departmentSeed, roleProfiles } from '../data'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId, RoleId } from '../types'
import { Brand, Button, DepartmentIcon } from '../components/ui'

const roleIcons = {
  physician: Stethoscope,
  nurse: HeartPulse,
  consultant: UsersRound,
  diagnostics: FlaskConical,
  coordinator: BedDouble,
  administrator: UserRoundCog,
}

const clinicalDepartments: DepartmentId[] = ['emergency', 'pediatrics', 'surgery', 'obgyn', 'internal-medicine', 'ent', 'dermatology', 'cardiology', 'neurology', 'icu', 'ward']
const diagnosticDepartments: DepartmentId[] = ['radiology', 'laboratory']
const featuredClinicalDepartments: DepartmentId[] = ['pediatrics', 'surgery', 'obgyn', 'internal-medicine', 'ent', 'dermatology']

export default function Login() {
  const { currentRole, login } = useHospital()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<RoleId>('physician')
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId>('emergency')
  const [accessKey, setAccessKey] = useState('NORTHSTAR')
  const [remember, setRemember] = useState(true)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const profile = roleProfiles[selected]
  const canChooseDepartment = ['physician', 'nurse', 'diagnostics'].includes(selected)
  const departmentOptions = selected === 'diagnostics' ? diagnosticDepartments : clinicalDepartments
  const selectedUnit = departmentSeed.find((department) => department.id === selectedDepartment) ?? departmentSeed[0]
  const workspaceName = selectedDepartment === profile.department ? profile.workspace : selected === 'nurse' ? `${selectedUnit.shortName} nursing workspace` : selected === 'diagnostics' ? `${selectedUnit.shortName} worklist` : `${selectedUnit.shortName} clinical command`
  const workspaceTitle = selectedDepartment === profile.department ? profile.title : selected === 'physician' ? `${selectedUnit.shortName} Physician` : selected === 'nurse' ? `${selectedUnit.shortName} Nurse` : selected === 'diagnostics' ? `${selectedUnit.name} Specialist` : profile.title

  if (currentRole) return <Navigate to="/dashboard" replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (accessKey.trim().toUpperCase() !== 'NORTHSTAR') {
      setError('Use the demo access key NORTHSTAR to enter this workspace.')
      return
    }
    login(selected, remember, selectedDepartment)
    navigate('/dashboard')
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <img src="/images/hospital-exterior.jpg" alt="Contemporary hospital building" />
        <div className="login-visual-overlay" />
        <div className="login-visual-top"><Brand light /><span className="demo-label"><span />Operational demo</span></div>
        <motion.div className="login-story" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="eyebrow light">MULTI-PROFESSION CLINICAL OPERATIONS</div>
          <h1>Your specialty.<br />One shared record.</h1>
          <p>Purpose-built workspaces for physicians, nurses and hospital professionals — connecting specialty care, imaging, laboratory results and inpatient/outpatient records.</p>
          <div className="login-flow" aria-label="Connected care pathway">
            <div><span><Activity size={18} /></span><p><b>Assess</b><small>Specialty-led care</small></p></div>
            <i />
            <div><span><FlaskConical size={18} /></span><p><b>Diagnose</b><small>Imaging + laboratory</small></p></div>
            <i />
            <div><span><Check size={18} /></span><p><b>Review</b><small>Inpatient + outpatient</small></p></div>
          </div>
        </motion.div>
        <div className="login-visual-foot"><ShieldCheck size={16} /><span>Synthetic patient data · Safe to explore</span><span>Northstar University Hospital</span></div>
      </section>

      <section className="login-access">
        <div className="login-mobile-brand"><Brand /></div>
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="secure-kicker"><LockKeyhole size={14} />SECURE STAFF ACCESS</span>
            <h2>Clinical access, tailored to you.</h2>
            <p>Choose your profession and clinical specialty for a focused inpatient and outpatient workspace.</p>
          </div>

          <div className="access-section-kicker"><span>01</span>YOUR PROFESSION<small>Role-specific priorities and actions</small></div>
          <div className="role-grid" role="radiogroup" aria-label="Professional role">
            {(Object.keys(roleProfiles) as RoleId[]).map((roleId, index) => {
              const role = roleProfiles[roleId]
              const Icon = roleIcons[roleId]
              return (
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={selected === roleId}
                  key={roleId}
                  className={`role-option ${selected === roleId ? 'selected' : ''}`}
                  onClick={() => { setSelected(roleId); setSelectedDepartment(roleProfiles[roleId].department); setError('') }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }}
                >
                  <span className="role-option-icon" style={{ color: role.accent }}><Icon size={19} /></span>
                  <span><b>{role.shortTitle}</b><small>{role.name}</small></span>
                  <span className="role-radio">{selected === roleId && <span />}</span>
                </motion.button>
              )
            })}
          </div>

          <form onSubmit={submit} className="login-form">
            <div className="selected-role-summary">
              <span className="selected-avatar" style={{ background: profile.accent }}>{profile.initials}</span>
              <div><b>{workspaceName}</b><small>{workspaceTitle} · {profile.shift}</small></div>
            </div>
            {canChooseDepartment && <div className="department-select-block">
              <div className="department-select-heading"><span><Building2 size={16} /></span><div><b>02 · Clinical department</b><small>Your census, clinical actions and worklist will follow this specialty.</small></div></div>
              <div className={`specialty-quick-grid ${selected === 'diagnostics' ? 'diagnostic-options' : ''}`}>
                {departmentOptions.filter((departmentId) => selected === 'diagnostics' || featuredClinicalDepartments.includes(departmentId)).map((departmentId) => {
                  const department = departmentSeed.find((item) => item.id === departmentId)!
                  const active = selectedDepartment === departmentId
                  return <button type="button" key={departmentId} className={active ? 'active' : ''} style={{ '--specialty': department.color } as React.CSSProperties} onClick={() => setSelectedDepartment(departmentId)} aria-pressed={active}>
                    <span className="specialty-tile-icon"><DepartmentIcon id={departmentId} size={17} /></span>
                    <span className="specialty-tile-copy"><b>{department.shortName}</b>{selected === 'diagnostics' && <small>{departmentId === 'radiology' ? 'CT · MRI · Ultrasound' : 'Pathology · Biochemistry'}</small>}</span>
                    {active && <Check className="specialty-tile-check" size={12} />}
                  </button>
                })}
              </div>
              <label className="specialty-select"><span>{selected === 'diagnostics' ? 'Diagnostic service' : 'All specialties'}</span><select aria-label="Clinical department" value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value as DepartmentId)}>{departmentOptions.map((departmentId) => { const department = departmentSeed.find((item) => item.id === departmentId)!; return <option key={departmentId} value={departmentId}>{department.name}</option> })}</select><ArrowRight size={16} /></label>
              <p><Check size={12} />Inpatient and outpatient files · Specialty-specific clinical review</p>
            </div>}
            <label className="field-label" htmlFor="employee-id">Staff identity</label>
            <div className="input-with-icon"><ShieldCheck size={17} /><input id="employee-id" value={`${profile.employeeId} · ${profile.name}`} readOnly aria-label="Staff identity" /></div>
            <div className="key-label-row"><label className="field-label" htmlFor="access-key">Access key</label><span>Demo key: <b>NORTHSTAR</b></span></div>
            <div className="input-with-icon"><LockKeyhole size={17} /><input id="access-key" type={showKey ? 'text' : 'password'} value={accessKey} onChange={(event) => { setAccessKey(event.target.value); setError('') }} autoComplete="current-password" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide access key' : 'Show access key'}>{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {error && <motion.p className="form-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}
            <label className="checkbox-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span><Check size={12} /></span>Remember this device</label>
            <Button type="submit" size="lg" className="login-submit">Enter {workspaceName.toLowerCase()}<ArrowRight size={18} /></Button>
          </form>
          <p className="login-privacy"><LockKeyhole size={13} />Role-appropriate views and actions are applied throughout the workspace.</p>
        </div>
      </section>
    </main>
  )
}