import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowRight, BedDouble, Building2, Check, ChevronRight, ClipboardCheck, Clock3, Download, Hospital, MapPin, Network, Phone, Search, Stethoscope, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CompleteReferralModal, TransferModal } from '../components/ClinicalModals'
import { Avatar, Button, DepartmentIcon, EmptyState, EsiBadge, Metric, PageHeader, Panel, StatusBadge } from '../components/ui'
import { departmentById } from '../data'
import { downloadCsv, relativeTime } from '../lib/format'
import { nested } from '../lib/access'
import { useHospital } from '../store/HospitalStore'
import type { Department, Patient, Referral } from '../types'

export default function Departments() {
  const { state, profile, can, setSelectedPatientId, updateReferral, notify } = useHospital()
  const [params, setParams] = useSearchParams()
  const initial = state.departments.some((department) => department.id === params.get('unit')) ? params.get('unit')! : profile?.department ?? 'emergency'
  const [selectedId, setSelectedId] = useState<Department['id']>(initial as Department['id'])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'inpatient' | 'diagnostic' | 'pressure'>('all')
  const [transferPatient, setTransferPatient] = useState<Patient | null>(null)
  const [completeReferral, setCompleteReferral] = useState<Referral | null>(null)
  const selected = departmentById(state.departments, selectedId)

  const departments = useMemo(() => nested(state.departments).filter((department) => {
    if (filter === 'inpatient' && ['radiology', 'laboratory', 'pharmacy'].includes(department.id)) return false
    if (filter === 'diagnostic' && !['radiology', 'laboratory', 'pharmacy'].includes(department.id)) return false
    if (filter === 'pressure' && department.occupied / department.capacity < 0.85) return false
    if (query && !`${department.name} ${department.lead} ${department.onCall} ${department.services.join(' ')}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [state.departments, filter, query])

  const patients = state.patients.filter((patient) => patient.department === selected.id && patient.status !== 'discharged')
  const incoming = state.referrals.filter((referral) => referral.to === selected.id && ['pending', 'accepted'].includes(referral.status))
  const outgoing = state.referrals.filter((referral) => referral.from === selected.id && ['pending', 'accepted'].includes(referral.status))
  const totalCapacity = state.departments.reduce((sum, department) => sum + department.capacity, 0)
  const totalOccupied = state.departments.reduce((sum, department) => sum + department.occupied, 0)
  const occupancy = Math.round(selected.occupied / selected.capacity * 100)
  const available = selected.capacity - selected.occupied

  const selectDepartment = (department: Department) => { setSelectedId(department.id); setParams({ unit: department.id }) }
  const exportCapacity = () => downloadCsv('northstar-live-capacity.csv', [['Department', 'Zone', 'Clinical lead', 'On call', 'Capacity', 'Occupied', 'Available', 'Occupancy', 'Average wait'], ...state.departments.map((department) => [department.name, department.zone, department.lead, department.onCall, department.capacity, department.occupied, department.capacity - department.occupied, `${Math.round(department.occupied / department.capacity * 100)}%`, `${department.averageWait} min`])])

  return <motion.div className="departments-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader eyebrow="HOSPITAL FLOW · LIVE UNIT CAPACITY" title="Departments & beds" description="See pressure, people and patient movement across every connected service." actions={<Button variant="secondary" icon={Download} onClick={exportCapacity}>Export capacity</Button>} />
    <div className="metrics-grid">
      <Metric label="Total staffed capacity" value={totalCapacity} detail={`Across ${state.departments.length} hospital services`} icon={Hospital} tone="blue" />
      <Metric label="Spaces available" value={totalCapacity - totalOccupied} detail={`${Math.round(totalOccupied / totalCapacity * 100)}% hospital occupancy`} icon={BedDouble} tone="teal" />
      <Metric label="Units at pressure" value={state.departments.filter((department) => department.occupied / department.capacity >= 0.85).length} detail="At or above 85% occupied" icon={Activity} tone="coral" />
      <Metric label="Open unit referrals" value={state.referrals.filter((referral) => ['pending', 'accepted'].includes(referral.status)).length} detail="Cross-department care decisions" icon={Network} tone="amber" />
    </div>

    <Panel className="department-directory">
      <div className="directory-toolbar"><div className="view-tabs">{([['all', 'All services'], ['inpatient', 'Inpatient units'], ['diagnostic', 'Diagnostic & support'], ['pressure', 'At pressure']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a service or clinician…" /></label></div>
      <div className="department-card-grid"><AnimatePresence mode="popLayout" initial={false}>{departments.map((department) => {
        const percent = Math.round(department.occupied / department.capacity * 100)
        return <motion.button layout key={department.id} className={`department-card ${selected.id === department.id ? 'selected' : ''}`} onClick={() => selectDepartment(department)} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          <div className="department-card-top"><span className="department-large-icon" style={{ color: department.color, background: `${department.color}12` }}><DepartmentIcon id={department.id} size={22} /></span><span className={`capacity-state ${percent >= 90 ? 'critical' : percent >= 85 ? 'warning' : ''}`}><i />{percent >= 90 ? 'Critical' : percent >= 85 ? 'Pressure' : 'Available'}</span></div>
          <h3>{department.name}</h3><p>{department.parent ? `Unit of ${state.departments.find((item) => item.id === department.parent)?.shortName} · ` : ''}{department.zone}</p>
          <div className="department-card-numbers"><strong>{department.capacity - department.occupied}</strong><span>available<small>of {department.capacity} spaces</small></span><b className={percent >= 90 ? 'danger-text' : ''}>{percent}%</b></div>
          <div className="department-capacity-track"><motion.i initial={{ width: 0 }} animate={{ width: `${percent}%` }} style={{ background: percent >= 90 ? '#c65757' : department.color }} /></div>
          <div className="department-card-foot"><span><Clock3 size={13} />{department.averageWait}m avg wait</span><ChevronRight size={16} /></div>
        </motion.button>
      })}</AnimatePresence></div>
      {departments.length === 0 && <EmptyState icon={Building2} title="No departments match" text="Try another service name or choose a different directory filter." />}
    </Panel>

    <div className="department-detail-grid">
      <Panel className="unit-overview-panel">
        <div className="unit-overview-head"><div><span className="department-large-icon" style={{ color: selected.color, background: `${selected.color}12` }}><DepartmentIcon id={selected.id} size={25} /></span><div><span className="eyebrow">SELECTED UNIT</span><h2>{selected.name}</h2><p><MapPin size={13} />{selected.zone}</p></div></div><StatusBadge status={occupancy >= 90 ? 'critical capacity' : occupancy >= 85 ? 'high occupancy' : 'accepting patients'} /></div>
        <p className="unit-description">{selected.description}</p>
        <div className="unit-occupancy-block"><div className="occupancy-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /><motion.circle cx="50" cy="50" r="40" initial={{ pathLength: 0 }} animate={{ pathLength: occupancy / 100 }} style={{ stroke: occupancy >= 90 ? '#c65757' : selected.color }} /></svg><div><strong>{occupancy}%</strong><span>occupied</span></div></div><div className="occupancy-numbers"><div><span>Current census</span><b>{selected.occupied}</b></div><div><span>Staffed capacity</span><b>{selected.capacity}</b></div><div><span>Immediately available</span><b className={available <= 2 ? 'danger-text' : 'success-text'}>{available}</b></div><div><span>Average response</span><b>{selected.averageWait}m <small>/ {selected.targetWait}m target</small></b></div></div></div>
        <div className="unit-team"><div><span><Stethoscope size={16} /></span><p><small>Clinical lead</small><b>{selected.lead}</b></p></div><div><span><UsersRound size={16} /></span><p><small>On call now</small><b>{selected.onCall}</b></p></div><button onClick={() => notify(`${selected.onCall} can be reached on extension ${selected.phone}`, 'info')}><Phone size={15} />{selected.phone}</button></div>
        <div className="unit-services"><span>CORE SERVICES</span><div>{selected.services.map((service) => <p key={service}><Check size={13} />{service}</p>)}</div></div>
      </Panel>

      <Panel className="unit-census-panel" title="Patients in shared census" action={<span className="panel-count">{patients.length} VISIBLE</span>}>
        <div className="panel-subhead">Active episodes currently assigned to this unit.<span>Live</span></div>
        <div className="unit-patient-list">{patients.map((patient) => <article key={patient.id}><button className="unit-patient-main" onClick={() => setSelectedPatientId(patient.id)}><Avatar name={patient.name} size="md" /><div><h3>{patient.name}<EsiBadge level={patient.esi} compact /></h3><p>{patient.mrn} · {patient.location}</p><span>{patient.complaint}</span></div><ChevronRight size={16} /></button><div className="unit-patient-foot"><StatusBadge status={patient.status} /><span>{patient.assignedTo}</span>{can('transfer') && <Button size="sm" variant="ghost" onClick={() => setTransferPatient(patient)}>Transfer<ArrowRight size={13} /></Button>}</div></article>)}{patients.length === 0 && <EmptyState icon={BedDouble} title="No census patients shown" text="This unit has capacity activity, but no matching patients in the active demonstration census." />}</div>
      </Panel>
    </div>

    <Panel className="unit-connections-panel" title="Open interdepartmental connections" action={<span className="panel-live"><span className="live-dot" />SHARED INBOX</span>}>
      <div className="connection-columns"><div><h3>Incoming to {selected.shortName}<span>{incoming.length}</span></h3>{incoming.map((referral) => {
        const patient = state.patients.find((item) => item.id === referral.patientId)
        return patient && <article key={referral.id}><div className="connection-card-top"><span className={`priority-label priority-${referral.priority}`}>{referral.priority}</span><StatusBadge status={referral.status} /></div><button onClick={() => setSelectedPatientId(patient.id)}><b>{patient.name}</b><span>{departmentById(state.departments, referral.from).shortName}<ArrowRight size={13} />{selected.shortName}</span></button><p>{referral.reason}</p><small>{relativeTime(referral.createdAt)} · {referral.createdBy}</small>{(profile?.department === selected.id || profile?.id === 'administrator') && <div className="card-action-row">{referral.status === 'pending' ? <Button size="sm" onClick={() => updateReferral(referral.id, 'accepted')}>Accept<Check size={13} /></Button> : <Button size="sm" onClick={() => setCompleteReferral(referral)}>Complete<ClipboardCheck size={13} /></Button>}</div>}</article>
      })}{!incoming.length && <p className="connection-empty">No incoming referrals awaiting action.</p>}</div>
      <div><h3>Outgoing from {selected.shortName}<span>{outgoing.length}</span></h3>{outgoing.map((referral) => {
        const patient = state.patients.find((item) => item.id === referral.patientId)
        return patient && <article key={referral.id}><div className="connection-card-top"><span className={`priority-label priority-${referral.priority}`}>{referral.priority}</span><StatusBadge status={referral.status} /></div><button onClick={() => setSelectedPatientId(patient.id)}><b>{patient.name}</b><span>{selected.shortName}<ArrowRight size={13} />{departmentById(state.departments, referral.to).shortName}</span></button><p>{referral.reason}</p><small>{relativeTime(referral.createdAt)} · Awaiting {departmentById(state.departments, referral.to).onCall}</small></article>
      })}{!outgoing.length && <p className="connection-empty">No outgoing referrals currently open.</p>}</div></div>
    </Panel>
    {transferPatient && <TransferModal patient={transferPatient} open={!!transferPatient} onClose={() => setTransferPatient(null)} />}
    {completeReferral && <CompleteReferralModal referral={completeReferral} open={!!completeReferral} onClose={() => setCompleteReferral(null)} />}
  </motion.div>
}