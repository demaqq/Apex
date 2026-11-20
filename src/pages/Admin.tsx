import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Building2, Check, Hospital, KeyRound, LayoutGrid, Network, Plus, Printer, RotateCcw, Save, ShieldAlert, ShieldCheck, Trash2, UserCheck, UserPlus, X } from 'lucide-react'
import { Button, Chip, DepartmentIcon, Modal, PageHeader, Panel, PersonCell, Tabs } from '../components/ui'
import { departmentById, roleProfiles } from '../data'
import { ALL_NAV, CORE_MODULES } from '../lib/nav'
import { ROLE_PERMISSIONS, useHospital } from '../store/HospitalStore'
import { DEFAULT_FEES, opdDepartments } from '../lib/reception'
import { nested } from '../lib/access'
import { CatalogueEditor } from '../components/CatalogueEditor'
import { activePositions, dutyWarnings, POSITIONS, positionById, positionPrivileges, SENSITIVE } from '../lib/positions'
import type { Department, DepartmentId, ExternalProvider, FacilitySettings, ReceptionFees, InvestigationItem, Permission, PositionId, RoleId, StaffMember } from '../types'

type View = 'facility' | 'users' | 'departments' | 'investigations' | 'providers' | 'modules'

const PERMISSION_LABELS: Record<Permission, string> = {
  'clinical-notes': 'Write history, examination, plans and assessments', triage: 'Triage patients', register: 'Register patients', vitals: 'Record observations', notes: 'Write clinical notes', prescribe: 'Prescribe and order',
  refer: 'Refer to specialists', transfer: 'Transfer and admit', discharge: 'Discharge patients', cosign: 'Co-sign trainee notes', results: 'Report lab and imaging results',
  administer: 'Give medicines', dispense: 'Verify and dispense medicines', beds: 'Manage beds', theatre: 'Run theatre lists', anaesthesia: 'Anaesthesia records',
  services: 'Physio, nutrition and blood bank', billing: 'Billing and payments', manage: 'Facility administration',
  'stock-receive': 'Receive stock deliveries', 'stock-adjust': 'Write off and adjust stock', 'formulary-edit': 'Edit medicines and prices', 'controlled-drugs': 'Release controlled medicines', 'records-export': 'Export patient lists', 'lab-catalogue': 'Edit the laboratory test catalogue', 'imaging-catalogue': 'Edit the imaging study catalogue',
}
const PERMISSION_GROUPS: Array<[string, Permission[]]> = [
  ['Clinical', ['triage', 'register', 'vitals', 'notes', 'clinical-notes', 'prescribe', 'refer', 'transfer', 'discharge', 'cosign']],
  ['Services', ['results', 'administer', 'dispense', 'beds', 'theatre', 'anaesthesia', 'services']],
  ['Office', ['billing', 'manage']],
  ['Sensitive — grant with care', SENSITIVE],
]
const CURRENCIES: FacilitySettings['currency'][] = ['ETB', 'USD', 'EUR', 'GBP', 'KES']
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Admin() {
  const { state, can } = useHospital()
  const [view, setView] = useState<View>('facility')
  if (!can('manage')) return <Panel><p className="table-footnote">Only administrators can change facility settings.</p></Panel>
  const pending = state.staff.filter((member) => member.status === 'Pending approval').length

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Administration" title={`Set up ${state.settings.name}`} description="Customise the system for your hospital or clinic: profile, people and access, departments, laboratory and imaging catalogues, partner facilities and modules. Every change is recorded in the audit log." />
      <Tabs<View> label="Administration" value={view} onChange={setView} options={[
        { value: 'facility', label: 'Facility' },
        { value: 'users', label: 'Users & access', count: pending || undefined },
        { value: 'departments', label: 'Departments', count: state.departments.filter((item) => item.active !== false).length },
        { value: 'investigations', label: 'Investigations', count: state.investigations.length },
        { value: 'providers', label: 'Partner facilities', count: state.providers.filter((item) => item.active).length || undefined },
        { value: 'modules', label: 'Modules' },
      ]} />
      {view === 'facility' && <FacilityTab />}
      {view === 'users' && <UsersTab />}
      {view === 'departments' && <DepartmentsTab />}
      {view === 'investigations' && <InvestigationsTab />}
      {view === 'providers' && <ProvidersTab />}
      {view === 'modules' && <ModulesTab />}
    </motion.div>
  )
}

/* ---------------- Facility ---------------- */

function FacilityTab() {
  const { state, updateSettings } = useHospital()
  const [form, setForm] = useState(state.settings)
  const set = <K extends keyof FacilitySettings>(key: K, value: FacilitySettings[K]) => setForm({ ...form, [key]: value })
  const dirty = JSON.stringify(form) !== JSON.stringify(state.settings)
  return (
    <Panel title="Facility profile" action={<Hospital size={17} className="muted-icon" />}>
      <div className="form-grid form-grid-3 admin-form">
        <label className="form-field"><span>Facility name <b>*</b></span><input value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label className="form-field"><span>Type</span><select value={form.type} onChange={(event) => set('type', event.target.value as FacilitySettings['type'])}>{['Hospital', 'Clinic', 'Health centre'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="form-field"><span>Currency</span><select value={form.currency} onChange={(event) => set('currency', event.target.value as FacilitySettings['currency'])}>{CURRENCIES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="form-field"><span>City</span><input value={form.city} onChange={(event) => set('city', event.target.value)} /></label>
        <label className="form-field"><span>Country</span><input value={form.country} onChange={(event) => set('country', event.target.value)} /></label>
        <label className="form-field"><span>Tagline</span><input value={form.tagline} onChange={(event) => set('tagline', event.target.value)} /></label>
        <label className="form-field"><span>Phone</span><input value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="+251 …" /></label>
        <label className="form-field"><span>Email</span><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></label>
      </div>
      <p className="table-footnote admin-note">The name appears in the sidebar, page titles and printed summaries. Prices across billing and pharmacy are shown in the chosen currency.</p>
      <span className="detail-heading admin-sub">Reception fees</span>
      <div className="form-grid form-grid-3 admin-form">
        {([['cardNew', 'New patient card'], ['cardReturn', 'Returning patient card'], ['opd', 'OPD consultation'], ['specialistOpd', 'Specialist OPD consultation'], ['emergency', 'Emergency assessment'], ['admissionDeposit', 'Admission deposit']] as Array<[keyof ReceptionFees, string]>).map(([key, label]) => (
          <label key={key} className="form-field"><span>{label} <small className="muted-text">{form.currency}</small></span><input type="number" min={0} step="0.5" value={(form.fees ?? DEFAULT_FEES)[key]} onChange={(event) => set('fees', { ...(form.fees ?? DEFAULT_FEES), [key]: Math.max(0, Number(event.target.value)) })} /></label>
        ))}
      </div>
      <span className="detail-heading admin-sub">OPD consultation rooms</span>
      <div className="form-grid form-grid-4 admin-form">
        {opdDepartments(state.departments).map((dept) => (
          <label key={dept.id} className="form-field"><span>{dept.name}</span><input type="number" min={1} max={20} value={form.opdRooms?.[dept.id] ?? 3} onChange={(event) => set('opdRooms', { ...(form.opdRooms ?? {}), [dept.id]: Math.min(20, Math.max(1, Math.floor(Number(event.target.value) || 1))) })} /></label>
        ))}
      </div>
      <div className="panel-actions admin-actions"><Button variant="ghost" icon={RotateCcw} disabled={!dirty} onClick={() => setForm(state.settings)}>Undo changes</Button><Button icon={Save} disabled={!dirty || !form.name.trim()} onClick={() => updateSettings({ ...form, name: form.name.trim() })}>Save profile</Button></div>
    </Panel>
  )
}

/* ---------------- Users & access ---------------- */

function UsersTab() {
  const { state, approveStaff, setStaffSuspended, setStaffPermissions, createStaff } = useHospital()
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [adding, setAdding] = useState(false)
  const pending = state.staff.filter((member) => member.status === 'Pending approval')
  const accounts = state.staff.filter((member) => member.status !== 'Pending approval')
  const accessLabel = (member: StaffMember) => {
    if (member.suspended) return <Chip tone="danger">Suspended</Chip>
    if (!member.roleId) return <Chip tone="neutral">Directory only</Chip>
    return <>
      {member.permissions ? <Chip tone="warning">Custom · {member.permissions.length} permissions</Chip> : <Chip tone="success">Standard {roleProfiles[member.roleId].shortTitle.toLowerCase()}</Chip>}
      {activePositions(member).map((p) => <Chip key={p.id} tone="accent">{positionById(p.id)?.title}{p.until ? ` · until ${p.until}` : ''}</Chip>)}
    </>
  }

  return <>
    <Panel title="Access requests" action={<Chip tone={pending.length ? 'warning' : 'neutral'}>{pending.length} waiting</Chip>}>
      {pending.length === 0 && <p className="table-footnote admin-note">No one is waiting. New staff request access from the sign-in screen, or you can add them below.</p>}
      <div className="card-grid admin-cards">
        {pending.map((member) => (
          <article key={member.id} className="work-card priority-urgent">
            <header><PersonCell name={member.name} detail={member.email} /></header>
            <p className="work-card-reason">Requests <b>{member.roleId ? roleProfiles[member.roleId].title : member.role}</b> in {departmentById(state.departments, member.department).name}. {member.specialty}.</p>
            <footer><small>Licence: {member.license}</small><div><Button size="sm" variant="ghost" icon={X} onClick={() => setStaffSuspended(member.id, true)}>Decline</Button><Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setEditing(member)}>Set access</Button><Button size="sm" icon={UserCheck} onClick={() => approveStaff(member.id)}>Approve</Button></div></footer>
          </article>
        ))}
      </div>
    </Panel>

    <PositionsPanel />

    <Panel title="Accounts and access levels" action={<Button size="sm" icon={UserPlus} onClick={() => setAdding(true)}>Add user</Button>}>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Workspace</th><th>Department</th><th>Access</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {accounts.map((member) => (
              <tr key={member.id}>
                <td><PersonCell name={member.name} detail={member.email} /></td>
                <td>{member.roleId ? roleProfiles[member.roleId].title : member.role}</td>
                <td><span className="inline-icon"><DepartmentIcon id={member.department} size={14} />{departmentById(state.departments, member.department).shortName}</span></td>
                <td>{accessLabel(member)}</td>
                <td className="row-actions">
                  {member.roleId && member.roleId !== 'administrator' && <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setEditing(member)}>Access</Button>}
                  {member.roleId !== 'administrator' && <Button size="sm" variant={member.suspended ? 'primary' : 'ghost'} onClick={() => setStaffSuspended(member.id, !member.suspended)}>{member.suspended ? 'Reactivate' : 'Suspend'}</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-footnote">Suspended and unapproved accounts cannot sign in. Administrators never have access to patient records.</p>
    </Panel>

    {editing && <AccessModal member={editing} onClose={() => setEditing(null)} onSave={(list) => { setStaffPermissions(editing.id, list); setEditing(null) }} />}
    {adding && <AddUserModal onClose={() => setAdding(false)} onSave={(input) => { createStaff(input); setAdding(false) }} />}
  </>
}

/* ---------------- Sensitive positions ---------------- */

function PositionsPanel() {
  const { state, removePosition } = useHospital()
  const [assigning, setAssigning] = useState<PositionId | null>(null)
  const eligible = state.staff.filter((member) => member.roleId && member.roleId !== 'administrator' && member.status !== 'Pending approval' && !member.suspended)
  return (
    <Panel title="Sensitive roles and privileges" action={<ShieldAlert size={17} className="muted-icon" />}>
      <p className="table-footnote admin-note">These posts carry privileges that move stock, release controlled medicines or export patient data. Only the administrator can give or take them, every change goes into the audit log, and acting cover can end on a set date.</p>
      <div className="position-grid">
        {POSITIONS.map((position) => {
          const holders = state.staff.filter((member) => activePositions(member).some((p) => p.id === position.id))
          return (
            <article key={position.id} className="position-card">
              <header><b>{position.title}</b><Button size="sm" variant="secondary" icon={UserPlus} onClick={() => setAssigning(position.id)}>Assign</Button></header>
              <p>{position.description}</p>
              <div className="position-privs">{position.privileges.map((perm) => <span key={perm} className={SENSITIVE.includes(perm) ? 'sensitive' : ''}>{PERMISSION_LABELS[perm]}</span>)}</div>
              <ul className="position-holders">
                {holders.length === 0 && <li className="muted-text">No one assigned</li>}
                {holders.map((member) => {
                  const assignment = activePositions(member).find((p) => p.id === position.id)!
                  return <li key={member.id}><PersonCell name={member.name} detail={`${member.role}${assignment.until ? ` · acting until ${assignment.until}` : ''}`} /><Button size="sm" variant="ghost" icon={X} aria-label={`Remove ${member.name} from ${position.title}`} onClick={() => removePosition(member.id, position.id)}>Remove</Button></li>
                })}
              </ul>
            </article>
          )
        })}
      </div>
      {assigning && <AssignPositionModal position={assigning} people={eligible} onClose={() => setAssigning(null)} />}
    </Panel>
  )
}

function AssignPositionModal({ position, people, onClose }: { position: PositionId; people: StaffMember[]; onClose: () => void }) {
  const { assignPosition } = useHospital()
  const def = positionById(position)!
  const [staffId, setStaffId] = useState('')
  const [temporary, setTemporary] = useState(false)
  const [until, setUntil] = useState('')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const member = people.find((item) => item.id === staffId)
  const resulting = member ? [...new Set([...(member.permissions ?? (member.roleId ? ROLE_PERMISSIONS[member.roleId] : [])), ...positionPrivileges(member), ...def.privileges])] : []
  const warnings = dutyWarnings(resulting)
  const valid = member && confirm && (!temporary || (until && new Date(until).getTime() > Date.now()))
  return (
    <Modal open onClose={onClose} title={`Assign ${def.title}`} subtitle={def.description} size="md">
      <div className="position-privs">{def.privileges.map((perm) => <span key={perm} className={SENSITIVE.includes(perm) ? 'sensitive' : ''}>{PERMISSION_LABELS[perm]}</span>)}</div>
      <div className="form-grid form-grid-2">
        <label className="form-field span-2"><span>Person <b>*</b></span><select value={staffId} onChange={(event) => setStaffId(event.target.value)}><option value="">Choose a staff member…</option>{people.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label>
        <label className="remember-row span-2"><input type="checkbox" checked={temporary} onChange={(event) => setTemporary(event.target.checked)} />Acting cover — ends automatically</label>
        {temporary && <label className="form-field"><span>Ends on <b>*</b></span><input type="date" value={until} onChange={(event) => setUntil(event.target.value)} /></label>}
        <label className="form-field span-2"><span>Reason or reference</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Appointment letter HR-2026-114, annual leave cover" /></label>
      </div>
      {member && member.roleId === 'nurse' && def.privileges.includes('controlled-drugs') && <div className="inline-error"><AlertTriangle size={16} />Nurses usually give controlled medicines on the ward; releasing them from the pharmacy is normally a pharmacist’s duty.</div>}
      {warnings.map((warning) => <p key={warning} className="record-alerts"><span className="warning"><AlertTriangle size={14} />{warning}</span></p>)}
      <label className="remember-row confirm-row"><input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />I confirm {member ? member.name : 'this person'} is authorised for these privileges.</label>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={ShieldCheck} disabled={!valid} onClick={() => { assignPosition(staffId, position, temporary ? until : undefined, note.trim() || undefined); onClose() }}>Assign</Button></div>
    </Modal>
  )
}

function AccessModal({ member, onClose, onSave }: { member: StaffMember; onClose: () => void; onSave: (permissions: Permission[]) => void }) {
  const defaults = member.roleId ? ROLE_PERMISSIONS[member.roleId] : []
  const [list, setList] = useState<Permission[]>(member.permissions ?? defaults)
  const toggle = (permission: Permission) => setList((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission])
  return (
    <Modal open onClose={onClose} title={`Access for ${member.name}`} subtitle={`${member.roleId ? roleProfiles[member.roleId].title : member.role} · start from the role’s standard access, then adjust`} size="md">
      {PERMISSION_GROUPS.map(([group, permissions]) => (
        <div key={group} className={`perm-group ${group.startsWith('Sensitive') ? 'sensitive' : ''}`}>
          <span className="detail-heading">{group}</span>
          <div className="perm-grid">{permissions.filter((permission) => permission !== 'manage').map((permission) => (
            <label key={permission} className={`perm ${list.includes(permission) ? 'on' : ''}`}><input type="checkbox" checked={list.includes(permission)} onChange={() => toggle(permission)} />{PERMISSION_LABELS[permission]}{defaults.includes(permission) && <small>standard</small>}</label>
          ))}</div>
        </div>
      ))}
      {activePositions(member).length > 0 && <p className="table-footnote">Also holds: {activePositions(member).map((p) => positionById(p.id)?.title).join(', ')} — those privileges are added on top.</p>}
      {dutyWarnings([...list, ...positionPrivileges(member)]).map((warning) => <p key={warning} className="record-alerts"><span className="warning"><AlertTriangle size={14} />{warning}</span></p>)}
      <div className="modal-footer"><Button variant="ghost" icon={RotateCcw} onClick={() => setList(defaults)}>Reset to standard</Button><div className="footer-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Check} onClick={() => onSave(list)}>Save access</Button></div></div>
    </Modal>
  )
}

function AddUserModal({ onClose, onSave }: { onClose: () => void; onSave: (input: Omit<StaffMember, 'id' | 'onDuty' | 'pager' | 'email' | 'phone' | 'license'>) => void }) {
  const { state } = useHospital()
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState<RoleId>('nurse')
  const [department, setDepartment] = useState<DepartmentId>(state.departments[0]?.id ?? 'emergency')
  const [specialty, setSpecialty] = useState('')
  const valid = name.trim().split(/\s+/).length >= 2
  return (
    <Modal open onClose={onClose} title="Add a user" subtitle="Accounts you add are approved straight away" size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Full name <b>*</b></span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="form-field"><span>Workspace</span><select value={roleId} onChange={(event) => setRoleId(event.target.value as RoleId)}>{(Object.keys(roleProfiles) as RoleId[]).filter((id) => id !== 'administrator').map((id) => <option key={id} value={id}>{roleProfiles[id].title}</option>)}</select></label>
        <label className="form-field"><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{state.departments.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Specialty or unit</span><input value={specialty} onChange={(event) => setSpecialty(event.target.value)} /></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={UserPlus} disabled={!valid} onClick={() => onSave({ name: name.trim(), roleId, role: roleProfiles[roleId].title, department, specialty: specialty.trim() || roleProfiles[roleId].title, shift: 'Day · 07:00–15:00', status: 'Active' })}>Add user</Button></div>
    </Modal>
  )
}

/* ---------------- Departments ---------------- */

const blankDepartment = (): Department => ({ id: '', name: '', shortName: '', lead: '', onCall: '', phone: '', capacity: 10, occupied: 0, targetWait: 30, averageWait: 0, color: '#2dd4bf', description: '', services: [], zone: '', active: true })

function DepartmentsTab() {
  const { state, saveDepartment, removeDepartment } = useHospital()
  const [editing, setEditing] = useState<Department | null>(null)
  const [confirm, setConfirm] = useState<Department | null>(null)
  const patientsIn = (id: string) => state.patients.filter((patient) => patient.department === id && patient.status !== 'discharged').length
  return <>
    <Panel title="Departments and units" action={<Button size="sm" icon={Plus} onClick={() => setEditing(blankDepartment())}>Add department</Button>}>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Department</th><th>Units</th><th className="num">Beds</th><th className="num">Active patients</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {nested(state.departments).map((item) => (
              <tr key={item.id} className={item.active === false ? 'muted-row' : ''}>
                <td className={item.parent ? 'unit-row' : ''}><span className="inline-icon">{item.parent && <span className="unit-branch">↳</span>}<DepartmentIcon id={item.id} size={15} /><b>{item.name}</b></span><small>{[item.parent && `unit of ${state.departments.find((d) => d.id === item.parent)?.name}`, item.zone, item.lead && `lead ${item.lead}`].filter(Boolean).join(' · ')}</small></td>
                <td className="wrap">{item.services.map((service) => <Chip key={service} tone="neutral">{service}</Chip>)}</td>
                <td className="num">{item.capacity}</td>
                <td className="num">{patientsIn(item.id)}</td>
                <td>{item.active === false ? <Chip tone="neutral">Inactive</Chip> : <Chip tone="success">Active</Chip>}</td>
                <td className="row-actions">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(item)}>Edit</Button>
                  {item.active === false ? <Button size="sm" onClick={() => saveDepartment({ ...item, active: true })}>Reactivate</Button> : <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirm(item)}>Remove</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-footnote">A department with patients, staff or wards is deactivated rather than deleted, so records stay intact.</p>
    </Panel>
    {editing && <DepartmentModal department={editing} onClose={() => setEditing(null)} onSave={(department) => { saveDepartment(department); setEditing(null) }} />}
    {confirm && (
      <Modal open onClose={() => setConfirm(null)} title={`Remove ${confirm.name}?`} subtitle="It disappears from menus, orders and sign-in choices" size="sm">
        <div className="confirm-copy warning"><span><AlertTriangle size={22} /></span><p>{patientsIn(confirm.id) ? `${patientsIn(confirm.id)} patients are still active here, so it will be deactivated instead.` : 'If staff or wards still belong to it, it will be deactivated instead of deleted.'}</p></div>
        <div className="modal-footer"><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={() => { removeDepartment(confirm.id); setConfirm(null) }}>Remove</Button></div>
      </Modal>
    )}
  </>
}

function DepartmentModal({ department, onClose, onSave }: { department: Department; onClose: () => void; onSave: (department: Department) => void }) {
  const { state } = useHospital()
  const isNew = !department.id
  const [form, setForm] = useState(department)
  const [units, setUnits] = useState(department.services.join(', '))
  const set = <K extends keyof Department>(key: K, value: Department[K]) => setForm({ ...form, [key]: value })
  const id = isNew ? slug(form.name) : form.id
  const clash = isNew && state.departments.some((item) => item.id === id)
  const valid = form.name.trim().length > 2 && !clash && form.capacity > 0
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add a department' : `Edit ${department.name}`} subtitle="Departments organise staff, beds, referrals and orders" size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Name <b>*</b></span><input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Ophthalmology" /></label>
        <label className="form-field"><span>Short name</span><input value={form.shortName} onChange={(event) => set('shortName', event.target.value)} placeholder="e.g. Eye" /></label>
        <label className="form-field"><span>Clinical lead</span><input value={form.lead} onChange={(event) => set('lead', event.target.value)} /></label>
        <label className="form-field"><span>Location</span><input value={form.zone} onChange={(event) => set('zone', event.target.value)} placeholder="e.g. Level 2 · East" /></label>
        <label className="form-field"><span>Beds or spaces</span><input type="number" min={1} value={form.capacity} onChange={(event) => set('capacity', Number(event.target.value))} /></label>
        <label className="form-field"><span>Extension</span><input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></label>
        <label className="form-field span-2"><span>Units <small className="muted-text">comma separated</small></span><input value={units} onChange={(event) => setUnits(event.target.value)} placeholder="Outpatient clinic, Procedure room" /></label>
        <label className="form-field"><span>Colour</span><input type="color" value={form.color} onChange={(event) => set('color', event.target.value)} /></label>
        <label className="form-field"><span>Part of <small className="muted-text">for a unit inside a department</small></span><select value={form.parent ?? ''} onChange={(event) => set('parent', (event.target.value || undefined) as DepartmentId | undefined)}><option value="">— A department on its own —</option>{state.departments.filter((item) => item.id !== form.id && !item.parent && item.active !== false && !['laboratory', 'radiology', 'pharmacy'].includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {form.parent && <p className="table-footnote">Staff signed in to {state.departments.find((item) => item.id === form.parent)?.name} will also see this unit’s patients.</p>}
      {clash && <div className="inline-error" role="alert"><AlertTriangle size={16} />A department with this name already exists.</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Save} disabled={!valid} onClick={() => onSave({ ...form, id, name: form.name.trim(), shortName: form.shortName.trim() || form.name.trim(), description: form.description || form.name.trim(), services: units.split(',').map((unit) => unit.trim()).filter(Boolean) })}>{isNew ? 'Add department' : 'Save'}</Button></div>
    </Modal>
  )
}

/* ---------------- Investigations ---------------- */

function InvestigationsTab() {
  const [kind, setKind] = useState<InvestigationItem['kind']>('Laboratory')
  return <>
    <Tabs<InvestigationItem['kind']> label="Catalogue" value={kind} onChange={setKind} options={[{ value: 'Laboratory', label: 'Laboratory tests' }, { value: 'Imaging', label: 'Imaging studies' }]} />
    <CatalogueEditor key={kind} kind={kind} />
    <p className="table-footnote">The laboratory head and the head of imaging can also edit their own catalogue. Assign those posts under Users &amp; access.</p>
  </>
}

/* ---------------- Referral partners ---------------- */

function ProvidersTab() {
  const { state, saveProvider, removeProvider } = useHospital()
  const [editing, setEditing] = useState<ExternalProvider | null>(null)
  return <>
    <Panel title="Partner hospitals and diagnostic centres" action={<Button size="sm" icon={Plus} onClick={() => setEditing({ id: '', name: '', type: 'Diagnostic centre', connection: 'printout', services: ['Laboratory'], notes: '', phone: '', address: '', active: true })}>Add partner</Button>}>
      <div className="integration-note"><Printer size={18} /><div><b>Today: printed requests</b><span>A test or study not available here goes out on a printed request form the patient takes to any laboratory or imaging centre. The result is entered when it comes back.</span></div><Chip tone="success">Active</Chip></div>
      <div className="integration-note planned"><Network size={18} /><div><b>Planned: electronic exchange</b><span>Partner hospitals and diagnostic centres will receive requests and return results directly into the patient record. Add partners now; requests to them are printed until their connection goes live.</span></div><Chip tone="neutral">Coming</Chip></div>
      {state.providers.length === 0
        ? <p className="table-footnote admin-note">No partners added yet.</p>
        : <div className="card-grid admin-cards">
          {state.providers.map((provider) => (
            <article key={provider.id} className={`work-card ${provider.active ? '' : 'muted-row'}`}>
              <header><b>{provider.name}</b>{provider.active ? <Chip tone="success">Active</Chip> : <Chip tone="neutral">Inactive</Chip>}</header>
              <p className="work-card-reason">{provider.type && <Chip tone="neutral">{provider.type}</Chip>}{provider.services.map((service) => <Chip key={service} tone={service === 'Imaging' ? 'warning' : 'accent'}>{service}</Chip>)} {provider.notes}</p>
              <p className="record-hint">{provider.address || 'Address not set'} · {provider.phone || 'Phone not set'} · {provider.connection === 'electronic' ? 'Electronic exchange (pending)' : 'Printed requests'}</p>
              <footer><small>{state.orders.filter((order) => order.externalProviderId === provider.id).length} requests sent</small><div><Button size="sm" variant="secondary" onClick={() => setEditing(provider)}>Edit</Button>{provider.active ? <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeProvider(provider.id)}>Remove</Button> : <Button size="sm" onClick={() => saveProvider({ ...provider, active: true })}>Reactivate</Button>}</div></footer>
            </article>
          ))}
        </div>}
    </Panel>
    {editing && <ProviderModal provider={editing} onClose={() => setEditing(null)} onSave={(provider) => { saveProvider(provider); setEditing(null) }} />}
  </>
}

const PROVIDER_TYPES: NonNullable<ExternalProvider['type']>[] = ['Hospital', 'Diagnostic centre', 'Laboratory', 'Imaging centre']

function ProviderModal({ provider, onClose, onSave }: { provider: ExternalProvider; onClose: () => void; onSave: (provider: ExternalProvider) => void }) {
  const [form, setForm] = useState<ExternalProvider>({ type: 'Diagnostic centre', connection: 'printout', ...provider })
  const toggle = (service: 'Laboratory' | 'Imaging') => setForm({ ...form, services: form.services.includes(service) ? form.services.filter((item) => item !== service) : [...form.services, service] })
  const valid = form.name.trim().length > 2 && form.services.length > 0
  return (
    <Modal open onClose={onClose} title={provider.id ? `Edit ${provider.name}` : 'Add a partner'} subtitle="Hospital or diagnostic centre that performs tests not available here" size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field span-2"><span>Name <b>*</b></span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="form-field"><span>Type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ExternalProvider['type'] })}>{PROVIDER_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <div className="form-field"><span>Services</span><div className="segmented">{(['Laboratory', 'Imaging'] as const).map((service) => <button key={service} type="button" className={form.services.includes(service) ? 'on' : ''} onClick={() => toggle(service)}>{service}</button>)}</div></div>
        <label className="form-field"><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+251 …" /></label>
        <label className="form-field"><span>Address</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Sub-city, street" /></label>
        <div className="form-field span-2"><span>How requests reach them</span><div className="segmented"><button type="button" className={form.connection !== 'electronic' ? 'on' : ''} onClick={() => setForm({ ...form, connection: 'printout' })}>Printed request</button><button type="button" disabled title="Electronic exchange is planned">Electronic (coming)</button></div></div>
        <label className="form-field span-2"><span>Notes</span><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Opening hours, sample pickup, turnaround" /></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Save} disabled={!valid} onClick={() => onSave({ ...form, id: form.id || slug(form.name), name: form.name.trim() })}>Save partner</Button></div>
    </Modal>
  )
}

/* ---------------- Modules ---------------- */

function ModulesTab() {
  const { state, updateSettings } = useHospital()
  const disabled = state.settings.disabledModules
  const toggle = (path: string) => updateSettings({ disabledModules: disabled.includes(path) ? disabled.filter((item) => item !== path) : [...disabled, path] })
  return (
    <Panel title="Modules" action={<LayoutGrid size={17} className="muted-icon" />}>
      <p className="table-footnote admin-note">Switch off anything your facility doesn’t use — for example a clinic without theatres or inpatient beds. Switched-off modules disappear for everyone.</p>
      <div className="module-grid">
        {ALL_NAV.filter((item) => !CORE_MODULES.includes(item.to)).map((item) => {
          const Icon = item.icon
          const on = !disabled.includes(item.to)
          return (
            <label key={item.to} className={`module-tile ${on ? 'on' : ''}`}>
              <span className="module-icon"><Icon size={18} /></span>
              <span><b>{item.label}</b><small>{item.page}</small></span>
              <span className="switch"><input type="checkbox" checked={on} onChange={() => toggle(item.to)} aria-label={`${item.label} ${on ? 'on' : 'off'}`} /><span /></span>
            </label>
          )
        })}
      </div>
      <p className="table-footnote"><Building2 size={13} /> Overview, roster and pagers, codes and audit, and administration are always on.</p>
    </Panel>
  )
}
