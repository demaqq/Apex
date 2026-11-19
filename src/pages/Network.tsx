import { motion } from 'framer-motion'
import { Activity, ArrowRight, Check, ChevronRight, CircleDot, ClipboardCheck, Download, Filter, Network as NetworkIcon, Plus, Search, Send, ShieldCheck, TimerReset, UsersRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CompleteReferralModal, ReferralModal } from '../components/ClinicalModals'
import { Avatar, Button, DepartmentIcon, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { departmentById } from '../data'
import { downloadCsv, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId, Patient, Referral } from '../types'

const fixedPositions: Record<string, { x: number; y: number }> = {
  emergency: { x: 405, y: 300 }, cardiology: { x: 160, y: 130 }, neurology: { x: 410, y: 80 }, radiology: { x: 685, y: 120 },
  laboratory: { x: 825, y: 280 }, icu: { x: 145, y: 330 }, surgery: { x: 240, y: 505 }, ward: { x: 510, y: 520 },
  pharmacy: { x: 770, y: 495 }, pediatrics: { x: 670, y: 335 }, obgyn: { x: 65, y: 510 },
  'internal-medicine': { x: 410, y: 445 }, ent: { x: 875, y: 90 }, dermatology: { x: 885, y: 490 },
}

/** Departments added by an administrator get a spot along the bottom of the map. */
const positions = new Proxy(fixedPositions, {
  get: (target, key: string) => target[key] ?? { x: 90 + ((Array.from(key).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) * 97) % 780), y: 545 },
}) as Record<DepartmentId, { x: number; y: number }>

export default function Network() {
  const { state, profile, can, setSelectedPatientId, updateReferral, notify } = useHospital()
  const [selectedDept, setSelectedDept] = useState<DepartmentId>(profile?.department ?? 'emergency')
  const [linkFilter, setLinkFilter] = useState(false)
  const [status, setStatus] = useState('open')
  const [query, setQuery] = useState('')
  const [complete, setComplete] = useState<Referral | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [referralPatient, setReferralPatient] = useState<Patient | null>(null)

  const selected = departmentById(state.departments, selectedDept)
  const activeConnections = state.referrals.filter((referral) => ['pending', 'accepted'].includes(referral.status))
  const visibleConnections = linkFilter ? activeConnections.filter((referral) => referral.from === selectedDept || referral.to === selectedDept) : activeConnections
  const referrals = useMemo(() => state.referrals.filter((referral) => {
    if (status === 'open' && !['pending', 'accepted'].includes(referral.status)) return false
    if (status === 'pending' && referral.status !== 'pending') return false
    if (status === 'completed' && referral.status !== 'completed') return false
    if (linkFilter && referral.from !== selectedDept && referral.to !== selectedDept) return false
    const patient = state.patients.find((item) => item.id === referral.patientId)
    if (query && !`${referral.id} ${referral.reason} ${patient?.name} ${patient?.mrn} ${referral.from} ${referral.to}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [state.referrals, status, linkFilter, selectedDept, query, state.patients])

  const selectedReferrals = state.referrals.filter((referral) => (referral.from === selectedDept || referral.to === selectedDept) && ['pending', 'accepted'].includes(referral.status)).slice(0, 4)
  const closedRate = Math.round(state.referrals.filter((referral) => referral.status === 'completed').length / Math.max(1, state.referrals.length) * 100)
  const pickerPatients = state.patients.filter((patient) => patient.status !== 'discharged' && (profile?.id === 'administrator' || patient.department === profile?.department) && `${patient.name} ${patient.mrn} ${patient.complaint}`.toLowerCase().includes(pickerQuery.toLowerCase()))

  const exportNetwork = () => {
    downloadCsv('northstar-referral-network.csv', [['Referral', 'Patient', 'MRN', 'From', 'To', 'Clinical question', 'Priority', 'Status', 'Created by', 'Last update', 'Recommendation'], ...state.referrals.map((referral) => {
      const patient = state.patients.find((item) => item.id === referral.patientId)
      return [referral.id, patient?.name ?? '', patient?.mrn ?? '', departmentById(state.departments, referral.from).name, departmentById(state.departments, referral.to).name, referral.reason, referral.priority, referral.status, referral.createdBy, referral.updatedAt, referral.recommendation ?? '']
    })])
    notify('Referral network exported', 'info')
  }

  return <motion.div className="network-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader eyebrow="CLOSED-LOOP CARE · 14 CONNECTED DEPARTMENTS" title="Interdepartmental care network" description="Follow every clinical question from request to recommendation — without losing the patient context." actions={<><Button variant="secondary" icon={Download} onClick={exportNetwork}>Export referrals</Button>{can('refer') && <Button icon={Plus} onClick={() => setPickerOpen(true)}>New referral</Button>}</>} />

    <div className="network-summary-strip"><div><span><NetworkIcon size={18} /></span><p><b>{activeConnections.length}</b><small>Active connections</small></p></div><div><span><TimerReset size={18} /></span><p><b>{state.referrals.filter((referral) => referral.status === 'pending').length}</b><small>Awaiting response</small></p></div><div><span><ClipboardCheck size={18} /></span><p><b>{closedRate}%</b><small>Closed-loop completion</small></p></div><div><span><UsersRound size={18} /></span><p><b>{new Set(activeConnections.map((referral) => referral.patientId)).size}</b><small>Patients in active handoffs</small></p></div><div className="network-summary-note"><ShieldCheck size={17} /><p>Every action is attributed and written to the shared episode.</p></div></div>

    <div className="network-layout">
      <Panel className="network-map-panel" title="Live hospital pathways" action={<div className="network-map-actions">{linkFilter && <button onClick={() => setLinkFilter(false)}>Show all<X size={13} /></button>}<span className="panel-live"><span className="live-dot" />LIVE</span></div>}>
        <div className="panel-subhead">Select a department to isolate its active connections.<span>{visibleConnections.length} pathways shown</span></div>
        <div className="network-map">
          <svg viewBox="0 0 960 600" preserveAspectRatio="none" aria-hidden="true">
            <defs><marker id="network-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
            {visibleConnections.map((referral, index) => {
              const from = positions[referral.from]
              const to = positions[referral.to]
              const curve = Math.max(30, Math.abs(to.x - from.x) * 0.12) * (index % 2 ? -1 : 1)
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2 - curve
              return <g key={referral.id} className={`network-link ${referral.priority}`}><path d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`} /><circle r="3"><animateMotion dur={`${4 + index * 0.4}s`} repeatCount="indefinite" path={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`} /></circle></g>
            })}
          </svg>
          {state.departments.map((department) => {
            const point = positions[department.id]
            const count = activeConnections.filter((referral) => referral.from === department.id || referral.to === department.id).length
            const isConnected = !linkFilter || department.id === selectedDept || visibleConnections.some((referral) => referral.from === department.id || referral.to === department.id)
            return <button key={department.id} className={`network-node ${selectedDept === department.id ? 'selected' : ''} ${!isConnected ? 'dimmed' : ''}`} style={{ left: `${point.x / 9.6}%`, top: `${point.y / 6}%`, '--dept': department.color } as React.CSSProperties} onClick={() => { setSelectedDept(department.id); setLinkFilter(true) }}><span className="network-node-icon"><DepartmentIcon id={department.id} size={21} />{count > 0 && <b>{count}</b>}</span><strong>{department.shortName}</strong><small>{department.capacity - department.occupied} spaces</small></button>
          })}
          <div className="network-map-legend"><span><i className="emergent" />Emergent</span><span><i className="urgent" />Urgent</span><span><i className="routine" />Routine</span></div>
        </div>
      </Panel>

      <Panel className="network-inspector" title="Connection inspector" action={<button className="icon-button" onClick={() => { setLinkFilter(false); setSelectedDept('emergency') }} title="Reset network view"><CircleDot size={16} /></button>}>
        <div className="inspector-department"><span style={{ color: selected.color, background: `${selected.color}12` }}><DepartmentIcon id={selected.id} size={24} /></span><div><h3>{selected.name}</h3><p>{selected.onCall} · {selected.phone}</p></div></div>
        <div className="inspector-stats"><div><b>{activeConnections.filter((referral) => referral.to === selected.id).length}</b><span>Incoming</span></div><div><b>{activeConnections.filter((referral) => referral.from === selected.id).length}</b><span>Outgoing</span></div><div><b>{selected.averageWait}m</b><span>Avg response</span></div></div>
        <div className="inspector-list">{selectedReferrals.map((referral) => {
          const patient = state.patients.find((item) => item.id === referral.patientId)
          if (!patient) return null
          return <button key={referral.id} onClick={() => setSelectedPatientId(patient.id)}><div><span className={`priority-label priority-${referral.priority}`}>{referral.priority}</span><StatusBadge status={referral.status} /></div><b>{patient.name}</b><p>{departmentById(state.departments, referral.from).shortName}<ArrowRight size={12} />{departmentById(state.departments, referral.to).shortName}</p><span>{referral.reason}</span><small>{relativeTime(referral.updatedAt)}</small></button>
        })}{selectedReferrals.length === 0 && <div className="inspector-clear"><Check size={20} /><p>No active connections for this department.</p><button onClick={() => setLinkFilter(false)}>Return to full network</button></div>}</div>
        {linkFilter && <Button variant="secondary" size="sm" className="inspector-show-all" onClick={() => setLinkFilter(false)}>Show all departments</Button>}
      </Panel>
    </div>

    <Panel className="referral-command" title="Referral command center" action={<span className="panel-count">{referrals.length} SHOWN</span>}>
      <div className="referral-toolbar"><div className="view-tabs">{([['open', 'All open'], ['pending', 'Awaiting response'], ['completed', 'Completed'], ['all', 'Full history']] as const).map(([value, label]) => <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{label}</button>)}</div><div className="board-filters"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search referrals…" /></label>{linkFilter && <button className="active-filter" onClick={() => setLinkFilter(false)}><Filter size={13} />{selected.shortName}<X size={13} /></button>}</div></div>
      <div className="referral-table-wrap"><table className="referral-table"><thead><tr><th>Patient / referral</th><th>Care pathway</th><th>Clinical question</th><th>Priority</th><th>Last activity</th><th>Status</th><th>Action</th></tr></thead><tbody>{referrals.map((referral) => {
        const patient = state.patients.find((item) => item.id === referral.patientId)
        if (!patient) return null
        const owns = profile?.department === referral.to || profile?.id === 'administrator'
        return <tr key={referral.id}><td><button className="referral-patient" onClick={() => setSelectedPatientId(patient.id)}><Avatar name={patient.name} size="sm" /><span><b>{patient.name}</b><small>{referral.id} · {patient.mrn}</small></span><ChevronRight size={14} /></button></td><td><div className="table-route"><span style={{ color: departmentById(state.departments, referral.from).color }}><DepartmentIcon id={referral.from} size={15} />{departmentById(state.departments, referral.from).shortName}</span><ArrowRight size={13} /><span style={{ color: departmentById(state.departments, referral.to).color }}><DepartmentIcon id={referral.to} size={15} />{departmentById(state.departments, referral.to).shortName}</span></div></td><td><p className="referral-table-reason">{referral.reason}</p>{referral.recommendation && <span className="has-recommendation"><Check size={12} />Recommendation released</span>}</td><td><span className={`priority-label priority-${referral.priority}`}>{referral.priority}</span></td><td><span className="referral-age">{relativeTime(referral.updatedAt)}<small>{referral.createdBy}</small></span></td><td><StatusBadge status={referral.status} /></td><td>{owns && referral.status === 'pending' ? <Button size="sm" onClick={() => updateReferral(referral.id, 'accepted')}>Accept<Check size={13} /></Button> : owns && referral.status === 'accepted' ? <Button size="sm" onClick={() => setComplete(referral)}>Complete<Send size={13} /></Button> : <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(patient.id)}>View chart</Button>}</td></tr>
      })}</tbody></table></div>
      {referrals.length === 0 && <EmptyState icon={NetworkIcon} title="No referrals in this view" text="Try another status or clear the department filter to see the full network." action={<Button size="sm" variant="secondary" onClick={() => { setStatus('all'); setLinkFilter(false); setQuery('') }}>Show full history</Button>} />}
      <div className="records-footer"><span><Activity size={13} />Referral status updates are immediately visible to both teams.</span><span>{state.referrals.filter((referral) => referral.status === 'completed').length} completed · {state.referrals.filter((referral) => referral.status === 'declined').length} returned</span></div>
    </Panel>

    {complete && <CompleteReferralModal referral={complete} open={!!complete} onClose={() => setComplete(null)} />}
    <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Start an interdepartmental referral" subtitle="First, choose the patient whose episode you want to share." size="sm">
      <label className="command-search"><Search size={18} /><input autoFocus value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder="Find patient by name or MRN…" /></label>
      <div className="patient-picker">{pickerPatients.map((patient) => <button key={patient.id} onClick={() => { setReferralPatient(patient); setPickerOpen(false) }}><Avatar name={patient.name} size="md" /><div><b>{patient.name}<small>{patient.mrn}</small></b><p>{patient.complaint}</p><span>{departmentById(state.departments, patient.department).shortName} · {patient.location}</span></div><ChevronRight size={16} /></button>)}</div>
    </Modal>
    {referralPatient && <ReferralModal patient={referralPatient} open={!!referralPatient} onClose={() => setReferralPatient(null)} />}
  </motion.div>
}