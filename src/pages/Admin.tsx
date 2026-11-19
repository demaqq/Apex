import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Building2, Pencil, Plus, ShieldCheck, UserPlus, X } from 'lucide-react'
import { Button, Chip, DepartmentIcon, PageHeader, Panel, PersonCell, Tabs } from '../components/ui'
import { departmentById, roleProfiles } from '../data'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId, RoleId, StaffMember } from '../types'

type View = 'accounts' | 'departments'
const SHIFTS: StaffMember['shift'][] = ['Day · 07:00–15:00', 'Evening · 15:00–23:00', 'Night · 23:00–07:00']

/** Staff accounts and departments/units administration (administrator only). */
export default function Admin() {
  const { state, can, createStaff, setStaffSuspended, setDepartmentServices } = useHospital()
  const [view, setView] = useState<View>('accounts')
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState<RoleId>('nurse')
  const [department, setDepartment] = useState<DepartmentId>('emergency')
  const [specialty, setSpecialty] = useState('')
  const [shift, setShift] = useState<StaffMember['shift']>(SHIFTS[0])
  const [error, setError] = useState('')
  const [unitDraft, setUnitDraft] = useState<Record<string, string>>({})

  if (!can('manage')) return <Panel><p className="table-footnote">Only administrators can manage staff accounts.</p></Panel>

  const create = () => {
    if (name.trim().split(/\s+/).length < 2 || specialty.trim().length < 3) { setError('Enter the full name and specialty or unit.'); return }
    createStaff({ name: name.trim(), roleId, role: roleProfiles[roleId].title, department, specialty: specialty.trim(), shift })
    setName(''); setSpecialty(''); setError('')
  }

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Administration" title="Staff accounts" description="Create accounts, suspend access and maintain each department’s units. Every change is written to the audit log." />
      <Tabs<View> label="Administration" value={view} onChange={setView} options={[{ value: 'accounts', label: 'Accounts', count: state.staff.length }, { value: 'departments', label: 'Departments and units', count: state.departments.length }]} />

      {view === 'accounts' && <>
        <Panel>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Licence</th><th>Status</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {state.staff.map((member) => (
                  <tr key={member.id}>
                    <td><PersonCell name={member.name} detail={member.email} /></td>
                    <td>{member.role}{member.roleId && <small>{roleProfiles[member.roleId].shortTitle} workspace</small>}</td>
                    <td><span className="inline-icon"><DepartmentIcon id={member.department} size={14} />{departmentById(state.departments, member.department).shortName}</span><small>{member.specialty}</small></td>
                    <td>{member.license === 'Not yet verified' ? <Chip tone="warning">Not yet verified</Chip> : <span className="mono">{member.license}</span>}</td>
                    <td>{member.suspended ? <Chip tone="danger">Suspended</Chip> : <Chip tone="success">Active</Chip>}</td>
                    <td className="row-actions"><Button size="sm" variant={member.suspended ? 'primary' : 'ghost'} onClick={() => setStaffSuspended(member.id, !member.suspended)}>{member.suspended ? 'Reactivate' : 'Suspend'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Create account">
          <div className="form-grid form-grid-3" style={{ padding: '6px 18px 0' }}>
            <label className="form-field"><span>Full name <b>*</b></span><input value={name} onChange={(event) => { setName(event.target.value); setError('') }} /></label>
            <label className="form-field"><span>Workspace role</span><select value={roleId} onChange={(event) => setRoleId(event.target.value as RoleId)}>{(Object.keys(roleProfiles) as RoleId[]).map((id) => <option key={id} value={id}>{roleProfiles[id].title}</option>)}</select></label>
            <label className="form-field"><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value as DepartmentId)}>{state.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="form-field"><span>Specialty or unit <b>*</b></span><input value={specialty} onChange={(event) => setSpecialty(event.target.value)} /></label>
            <label className="form-field"><span>Shift</span><select value={shift} onChange={(event) => setShift(event.target.value as StaffMember['shift'])}>{SHIFTS.map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          {error && <div className="inline-error" role="alert" style={{ margin: '10px 18px 0' }}><AlertTriangle size={16} />{error}</div>}
          <p className="table-footnote" style={{ border: 0, background: 'none' }}><ShieldCheck size={13} /> New accounts start off duty with licence “Not yet verified” until credentials are checked.</p>
          <div className="panel-actions" style={{ padding: '0 18px 16px' }}><Button icon={UserPlus} onClick={create}>Create account</Button></div>
        </Panel>
      </>}

      {view === 'departments' && (
        <Panel>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Department</th><th>Units</th><th className="num">Active patients</th><th>Add a unit</th></tr></thead>
              <tbody>
                {state.departments.map((item) => (
                  <tr key={item.id}>
                    <td><span className="inline-icon"><DepartmentIcon id={item.id} size={15} /><b>{item.name}</b></span><small>{item.zone} · lead {item.lead}</small></td>
                    <td className="wrap">{item.services.map((service) => <span key={service} className="chip unit-chip">{service}<button type="button" aria-label={`Remove ${service}`} onClick={() => setDepartmentServices(item.id, item.services.filter((value) => value !== service))}><X size={11} /></button></span>)}</td>
                    <td className="num">{state.patients.filter((patient) => patient.department === item.id && patient.status !== 'discharged').length}</td>
                    <td><div className="ddx-add" style={{ marginTop: 0 }}><input aria-label={`New unit for ${item.name}`} placeholder="Unit name" value={unitDraft[item.id] ?? ''} onChange={(event) => setUnitDraft({ ...unitDraft, [item.id]: event.target.value })} /><Button size="sm" variant="secondary" icon={Plus} disabled={!(unitDraft[item.id] ?? '').trim()} onClick={() => { setDepartmentServices(item.id, [...item.services, unitDraft[item.id].trim()]); setUnitDraft({ ...unitDraft, [item.id]: '' }) }}>Add</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-footnote"><Building2 size={13} /> Units appear on each department’s page. <Pencil size={13} /> Remove a unit with its ×.</p>
        </Panel>
      )}
    </motion.div>
  )
}
