import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BellOff, Download, History, Megaphone, ShieldCheck, Siren, UsersRound } from 'lucide-react'
import { Button, DepartmentIcon, EmptyState, FilterSelect, Metric, Modal, PageHeader, Panel, SearchField, Tabs } from '../components/ui'
import { departmentById } from '../data'
import { downloadCsv, formatDateTime, relativeTime, today } from '../lib/format'
import { matches, useNow, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { EmergencyCode } from '../types'

type View = 'codes' | 'audit'

export default function AuditView() {
  const { state, can, activateCode, standDownCode, setSelectedPatientId } = useHospital()
  const patients = usePatients()
  const now = useNow()
  const activeCodes = state.codes.filter((code) => code.active)
  const [view, setView] = useState<View>(activeCodes.length ? 'codes' : 'audit')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [activating, setActivating] = useState<EmergencyCode | null>(null)
  const canCall = can('triage') || can('manage') || can('transfer')

  const lastHour = state.activities.filter((item) => now - new Date(item.at).getTime() < 3_600_000)
  const departments = [...new Set(state.activities.map((item) => item.department))]
  const entries = state.activities.filter((item) =>
    (department === 'all' || item.department === department) &&
    matches(query, item.actor, item.action, patients.get(item.patientId ?? '')?.mrn))

  const exportLog = () => downloadCsv(`audit-log-${today()}.csv`, [
    ['Time', 'User', 'Action', 'Department', 'Patient MRN'],
    ...state.activities.map((item) => [item.at, item.actor, item.action, departmentById(state.departments, item.department).name, patients.get(item.patientId ?? '')?.mrn]),
  ])

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Safety · Compliance"
        title="Emergency codes & audit"
        description="Call and stand down emergency codes, and review every recorded action in the workspace."
        actions={<Button variant="secondary" icon={Download} onClick={exportLog}>Export audit log</Button>}
      />

      <div className="metrics-grid">
        <Metric label="Active codes" value={activeCodes.length} detail={activeCodes.length ? activeCodes.map((code) => code.label).join(', ') : 'No emergencies in progress'} icon={Siren} tone="coral" />
        <Metric label="Actions in the last hour" value={lastHour.length} detail="Across all departments" icon={History} tone="blue" />
        <Metric label="Active users" value={new Set(lastHour.map((item) => item.actor)).size} detail="Recorded an action this hour" icon={UsersRound} tone="amber" />
        <Metric label="Audit entries" value={state.activities.length} detail="Kept on this device" icon={ShieldCheck} tone="teal" />
      </div>

      <Tabs<View> label="Safety views" value={view} onChange={setView} options={[{ value: 'codes', label: 'Emergency codes', count: activeCodes.length }, { value: 'audit', label: 'Audit trail' }]} />

      {view === 'codes' && (
        <div className="card-grid codes-grid">
          {state.codes.map((code) => (
            <article key={code.id} className={`code-card code-${code.tone} ${code.active ? 'is-active' : ''}`}>
              <header><span className="code-badge">{code.label}</span>{code.active ? <span className="live-badge"><span className="live-dot" />Active</span> : <span className="muted-text">Standby</span>}</header>
              <p className="code-description">{code.description}</p>
              {code.active
                ? <p className="code-meta"><b>{code.location}</b><span>Called by {code.activatedBy} · {code.activatedAt && relativeTime(code.activatedAt, now)}</span></p>
                : <p className="code-meta"><span>Pages: {code.responders}</span></p>}
              {canCall && (code.active
                ? <Button size="sm" variant="secondary" icon={BellOff} onClick={() => standDownCode(code.id)}>Stand down</Button>
                : <Button size="sm" variant="danger" icon={Megaphone} onClick={() => setActivating(code)}>Call {code.label}</Button>)}
            </article>
          ))}
        </div>
      )}

      {view === 'audit' && (
        <Panel>
          <div className="table-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Search user, action or MRN…" />
            <FilterSelect label="All departments" value={department} onChange={setDepartment} options={departments.map((id) => ({ value: id, label: departmentById(state.departments, id).name }))} />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Department</th><th>Patient</th></tr></thead>
              <tbody>
                {entries.map((item) => {
                  const patient = item.patientId ? patients.get(item.patientId) : undefined
                  return (
                    <tr key={item.id}>
                      <td><b>{formatDateTime(item.at)}</b><small>{relativeTime(item.at, now)}</small></td>
                      <td>{item.actor}</td>
                      <td className="wrap">{item.action}</td>
                      <td><span className="inline-icon"><DepartmentIcon id={item.department} size={14} />{departmentById(state.departments, item.department).shortName}</span></td>
                      <td>{patient ? <button type="button" className="link-button" onClick={() => setSelectedPatientId(patient.id)}>{patient.mrn}</button> : <span className="muted-text">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && <EmptyState icon={History} title="No entries match" text="Try another search term or clear the department filter." />}
          <p className="table-footnote">Showing {entries.length} of {state.activities.length} entries. The most recent 200 actions are kept.</p>
        </Panel>
      )}

      {activating && <ActivateCodeModal code={activating} onClose={() => setActivating(null)} onConfirm={(location) => { activateCode(activating.id, location); setActivating(null) }} />}
    </motion.div>
  )
}

function ActivateCodeModal({ code, onClose, onConfirm }: { code: EmergencyCode; onClose: () => void; onConfirm: (location: string) => void }) {
  const [location, setLocation] = useState('')
  return (
    <Modal open onClose={onClose} title={`Call ${code.label}?`} subtitle={code.description} size="sm">
      <div className="confirm-copy warning"><span><AlertTriangle size={22} /></span><p>This pages {code.responders.toLowerCase()} immediately. Give the exact location so the team can find the patient.</p></div>
      <label className="form-field"><span>Location <b>*</b></span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Ward 5S · Bed 12" onKeyDown={(event) => { if (event.key === 'Enter' && location.trim()) onConfirm(location.trim()) }} /></label>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" icon={Megaphone} disabled={!location.trim()} onClick={() => onConfirm(location.trim())}>Call {code.label}</Button></div>
    </Modal>
  )
}
