import { motion } from 'framer-motion'
import { Activity, AlertTriangle, ArrowRight, BedDouble, BellRing, Check, ChevronRight, ClipboardCheck, Clock3, Download, FileCheck2, FlaskConical, HeartPulse, Hospital, ListFilter, Network, Plus, ScanLine, Send, Siren, Stethoscope, TimerReset, TrendingUp, UserRoundCheck, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompleteReferralModal, ResultModal, TriageModal } from '../components/ClinicalModals'
import { Avatar, Button, DepartmentIcon, EmptyState, EsiBadge, Metric, PageHeader, Panel, StatusBadge, TextLink } from '../components/ui'
import { departmentById, esiLabels } from '../data'
import { downloadCsv, formatWait, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ClinicalOrder, Patient, Referral, RoleId } from '../types'

const enter = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } }

function useMinuteClock() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])
  return now
}

function PatientQueue({ patients, title, description, mode = 'clinical', now }: { patients: Patient[]; title: string; description: string; mode?: 'clinical' | 'triage'; now: number }) {
  const { state, setSelectedPatientId } = useHospital()
  return <Panel className="queue-panel" title={title} action={<span className="panel-live"><span className="live-dot" />LIVE</span>}>
    <div className="panel-subhead">{description}<span>{patients.length} patients</span></div>
    <div className="patient-queue">
      {patients.slice(0, 6).map((patient) => <button key={patient.id} className="queue-patient" onClick={() => setSelectedPatientId(patient.id)}>
        <div className="queue-acuity"><EsiBadge level={patient.esi} compact /><span>{formatWait(patient.arrival, now)}</span></div>
        <Avatar name={patient.name} size="md" />
        <div className="queue-patient-main"><div><h3>{patient.name}</h3><span>{patient.age}{patient.sex === 'Female' ? 'F' : patient.sex === 'Male' ? 'M' : 'NB'} · {patient.mrn}</span></div><p>{patient.complaint}</p><small>{patient.location} · {patient.assignedTo}</small></div>
        {mode === 'triage' ? <div className="queue-vitals"><span className={patient.vitals.hr >= 120 ? 'abnormal-text' : ''}>HR <b>{patient.vitals.hr}</b></span><span className={patient.vitals.spo2 < 94 ? 'abnormal-text' : ''}>SpO₂ <b>{patient.vitals.spo2}%</b></span><span>RR <b>{patient.vitals.rr}</b></span></div> : <div className="queue-status"><StatusBadge status={patient.status} /><span>{departmentById(state.departments, patient.department).shortName}</span></div>}
        <ChevronRight className="queue-chevron" size={17} />
      </button>)}
      {patients.length === 0 && <EmptyState icon={UserRoundCheck} title="Queue clear" text="No patients currently match this clinical view." />}
    </div>
  </Panel>
}

function ActivityFeed({ limit = 5 }: { limit?: number }) {
  const { state, setSelectedPatientId } = useHospital()
  return <Panel title="Live hospital activity" action={<span className="panel-live"><span className="live-dot" />SYNCED</span>}><div className="activity-feed">{state.activities.slice(0, limit).map((activity) => <button key={activity.id} onClick={() => activity.patientId && setSelectedPatientId(activity.patientId)}><span className="activity-department" style={{ color: departmentById(state.departments, activity.department).color }}><DepartmentIcon id={activity.department} size={17} /></span><div><p><b>{activity.actor}</b> {activity.action}</p><span>{relativeTime(activity.at)} · {departmentById(state.departments, activity.department).shortName}</span></div></button>)}</div></Panel>
}

function DepartmentPressure({ limit = 5 }: { limit?: number }) {
  const { state } = useHospital()
  const navigate = useNavigate()
  const departments = [...state.departments].sort((a, b) => b.occupied / b.capacity - a.occupied / a.capacity).slice(0, limit)
  return <Panel title="Department pressure" action={<button className="panel-action" onClick={() => navigate('/departments')}>All departments<ArrowRight size={14} /></button>}><div className="pressure-list">{departments.map((department) => {
    const percent = Math.round(department.occupied / department.capacity * 100)
    return <button key={department.id} onClick={() => navigate(`/departments?unit=${department.id}`)}><span className="pressure-icon" style={{ color: department.color, background: `${department.color}12` }}><DepartmentIcon id={department.id} size={18} /></span><div><p><b>{department.shortName}</b><span>{department.occupied}/{department.capacity}</span></p><div className="pressure-track"><motion.i initial={{ width: 0 }} animate={{ width: `${percent}%` }} style={{ background: percent >= 90 ? '#c65757' : department.color }} /></div></div><strong className={percent >= 90 ? 'danger-text' : ''}>{percent}%</strong></button>
  })}</div></Panel>
}

function ReferralInbox({ compact = false }: { compact?: boolean }) {
  const { state, profile, setSelectedPatientId, updateReferral } = useHospital()
  const [complete, setComplete] = useState<Referral | null>(null)
  const referrals = state.referrals.filter((referral) => referral.to === profile?.department && ['pending', 'accepted'].includes(referral.status)).sort((a, b) => (a.priority === 'emergent' ? -1 : 1) - (b.priority === 'emergent' ? -1 : 1))
  return <>
    <Panel className="consult-inbox" title="Specialist consultation inbox" action={<span className="panel-count">{referrals.filter((item) => item.status === 'pending').length} NEW</span>}>
      <div className="panel-subhead">Structured requests with complete episode context.<span>{referrals.length} active</span></div>
      <div className="consult-list">{referrals.slice(0, compact ? 4 : undefined).map((referral) => {
        const patient = state.patients.find((item) => item.id === referral.patientId)
        if (!patient) return null
        return <article key={referral.id} className={`consult-card ${referral.priority === 'emergent' ? 'emergent' : ''}`}>
          <div className="consult-card-top"><span className={`priority-label priority-${referral.priority}`}>{referral.priority}</span><span>{relativeTime(referral.createdAt)}</span><StatusBadge status={referral.status} /></div>
          <button className="consult-patient" onClick={() => setSelectedPatientId(patient.id)}><Avatar name={patient.name} size="md" /><div><h3>{patient.name}<EsiBadge level={patient.esi} compact /></h3><p>{patient.age} years · {patient.mrn} · {patient.location}</p></div><ChevronRight size={16} /></button>
          <p className="consult-question">{referral.reason}</p>
          <div className="consult-route"><span>{departmentById(state.departments, referral.from).shortName}</span><ArrowRight size={14} /><span>{departmentById(state.departments, referral.to).shortName}</span><small>{referral.createdBy}</small></div>
          <div className="card-action-row">{referral.status === 'pending' ? <><Button size="sm" onClick={() => updateReferral(referral.id, 'accepted')}>Accept referral<Check size={14} /></Button><Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(patient.id)}>Review chart</Button></> : <><Button size="sm" onClick={() => setComplete(referral)}>Complete consultation<FileCheck2 size={14} /></Button><Button size="sm" variant="ghost" onClick={() => setSelectedPatientId(patient.id)}>Review chart</Button></>}</div>
        </article>
      })}{referrals.length === 0 && <EmptyState icon={ClipboardCheck} title="Consultation inbox clear" text="New interdepartmental referrals will appear here with their complete clinical context." />}</div>
    </Panel>
    {complete && <CompleteReferralModal referral={complete} open={!!complete} onClose={() => setComplete(null)} />}
  </>
}

function DiagnosticWorklist({ limit }: { limit?: number }) {
  const { state, profile, setSelectedPatientId, updateOrder } = useHospital()
  const [reporting, setReporting] = useState<ClinicalOrder | null>(null)
  const orders = state.orders.filter((order) => order.department === profile?.department && order.status !== 'completed').sort((a, b) => (a.priority === 'emergent' ? -1 : 1) - (b.priority === 'emergent' ? -1 : 1))
  return <>
    <Panel className="diagnostic-worklist" title="Diagnostic worklist" action={<span className="panel-live"><span className="live-dot" />{orders.length} ACTIVE</span>}>
      <div className="worklist-head"><span>Patient / examination</span><span>Ordered</span><span>Status</span><span>Action</span></div>
      <div className="worklist-rows">{orders.slice(0, limit).map((order) => {
        const patient = state.patients.find((item) => item.id === order.patientId)
        if (!patient) return null
        return <div key={order.id} className="worklist-row"><button className="worklist-patient" onClick={() => setSelectedPatientId(patient.id)}><Avatar name={patient.name} size="md" /><div><h3>{order.title}</h3><p>{patient.name} · {patient.mrn}</p><small>{order.id} · {patient.location}</small></div></button><div className="worklist-ordered"><span className={`priority-label priority-${order.priority}`}>{order.priority}</span><small>{relativeTime(order.createdAt)}</small></div><StatusBadge status={order.status} /><div>{order.status === 'ordered' ? <Button size="sm" variant="secondary" onClick={() => updateOrder(order.id, 'in-progress')}>Start<ArrowRight size={14} /></Button> : <Button size="sm" onClick={() => setReporting(order)}>Report<FileCheck2 size={14} /></Button>}</div></div>
      })}{orders.length === 0 && <EmptyState icon={FileCheck2} title="Worklist complete" text="All current studies have been reported and returned to the clinical record." />}</div>
    </Panel>
    {reporting && <ResultModal order={reporting} open={!!reporting} onClose={() => setReporting(null)} />}
  </>
}

function AcuityMix({ patients }: { patients: Patient[] }) {
  const counts = [1, 2, 3, 4, 5].map((level) => patients.filter((patient) => patient.esi === level).length)
  const max = Math.max(...counts, 1)
  return <Panel title="Current acuity mix" action={<Activity size={17} className="muted-icon" />}><div className="acuity-chart">{counts.map((count, index) => <div key={index}><span><b>ESI {index + 1}</b><small>{esiLabels[index + 1].name}</small></span><div><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(count / max * 100, count ? 8 : 0)}%` }} style={{ background: esiLabels[index + 1].color }} /></div><strong>{count}</strong></div>)}</div><div className="acuity-foot"><span>Total assessed</span><b>{patients.length} patients</b></div></Panel>
}

function DecisionPanel({ patients }: { patients: Patient[] }) {
  const { state, setSelectedPatientId } = useHospital()
  const patientIds = new Set(patients.map((patient) => patient.id))
  const urgentOrders = state.orders.filter((order) => patientIds.has(order.patientId) && order.status !== 'completed' && order.priority !== 'routine').slice(0, 4)
  return <Panel title="Diagnostic decision points" action={<FlaskConical size={17} className="muted-icon" />}><div className="decision-list">{urgentOrders.map((order) => {
    const patient = state.patients.find((item) => item.id === order.patientId)
    return patient && <button key={order.id} onClick={() => setSelectedPatientId(patient.id)}><span className={order.status === 'in-progress' ? 'active' : ''}><ScanLine size={16} /></span><div><b>{order.title}</b><p>{patient.name} · {order.status}</p></div><small>{relativeTime(order.createdAt)}</small></button>
  })}</div><div className="decision-insight"><TrendingUp size={17} /><p><b>Lab turnaround is 8m faster</b><span>than the previous shift average.</span></p></div></Panel>
}

function CapacityBoard() {
  const { state } = useHospital()
  const navigate = useNavigate()
  return <Panel title="Live capacity by unit" action={<Button size="sm" variant="secondary" onClick={() => navigate('/departments')}>Bed board<ArrowRight size={14} /></Button>}><div className="capacity-board">{state.departments.filter((department) => !['laboratory', 'pharmacy', 'radiology'].includes(department.id)).map((department) => {
    const available = department.capacity - department.occupied
    const percent = Math.round(department.occupied / department.capacity * 100)
    return <button key={department.id} onClick={() => navigate(`/departments?unit=${department.id}`)} className={available <= 2 ? 'tight' : ''}><div><span style={{ color: department.color }}><DepartmentIcon id={department.id} size={19} /></span><StatusBadge status={available <= 2 ? 'limited' : available <= 5 ? 'tight' : 'available'} /></div><h3>{department.shortName}</h3><p><strong>{available}</strong><span>spaces available</span></p><div className="capacity-track"><motion.i initial={{ width: 0 }} animate={{ width: `${percent}%` }} style={{ background: department.color }} /></div><small>{department.occupied} of {department.capacity} occupied · {department.zone}</small></button>
  })}</div></Panel>
}

function FlowRequestPanel() {
  const { state, setSelectedPatientId } = useHospital()
  const requests = state.referrals.filter((referral) => ['ward', 'icu', 'cardiology', 'neurology', 'surgery'].includes(referral.to) && referral.status !== 'completed').slice(0, 5)
  return <Panel title="Potential bed movements" action={<BedDouble size={17} className="muted-icon" />}><div className="flow-request-list">{requests.map((referral) => {
    const patient = state.patients.find((item) => item.id === referral.patientId)
    return patient && <button key={referral.id} onClick={() => setSelectedPatientId(patient.id)}><div className="flow-route"><span>{departmentById(state.departments, referral.from).shortName}</span><ArrowRight size={14} /><b>{departmentById(state.departments, referral.to).shortName}</b></div><p>{patient.name} · {referral.reason}</p><small>{referral.status} · {relativeTime(referral.updatedAt)}</small></button>
  })}</div></Panel>
}

function AdminFlowChart() {
  const { state } = useHospital()
  const occupancy = Math.round(state.departments.reduce((sum, department) => sum + department.occupied, 0) / state.departments.reduce((sum, department) => sum + department.capacity, 0) * 100)
  const values = [68, 70, 69, 73, 76, 74, 78, 81, 79, 83, 82, occupancy]
  const points = values.map((value, index) => `${index * 46 + 10},${145 - (value - 60) * 3.5}`).join(' ')
  return <Panel title="Hospital occupancy — this shift" action={<span className="chart-current"><span />Current {occupancy}%</span>}><div className="admin-chart"><div className="chart-y-labels"><span>90%</span><span>75%</span><span>60%</span></div><svg viewBox="0 0 530 165" preserveAspectRatio="none" aria-label="Occupancy increased through the shift"><line x1="0" y1="40" x2="530" y2="40" /><line x1="0" y1="92" x2="530" y2="92" /><line x1="0" y1="145" x2="530" y2="145" /><motion.polyline points={points} fill="none" stroke="#147d73" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />{values.map((value, index) => <circle key={index} cx={index * 46 + 10} cy={145 - (value - 60) * 3.5} r={index === values.length - 1 ? 5 : 2.5} fill={index === values.length - 1 ? '#147d73' : '#a8c7c2'} />)}</svg><div className="chart-x-labels"><span>06:00</span><span>08:00</span><span>10:00</span><span>12:00</span><span>Now</span></div></div><div className="chart-summary"><div><span>Shift high</span><b>{Math.max(...values)}%</b></div><div><span>Available capacity</span><b>{state.departments.reduce((sum, department) => sum + department.capacity - department.occupied, 0)} spaces</b></div><div><span>Pressure threshold</span><b className="danger-text">ICU · 94%</b></div></div></Panel>
}

export default function Dashboard() {
  const { state, profile, can } = useHospital()
  const navigate = useNavigate()
  const now = useMinuteClock()
  const [triageOpen, setTriageOpen] = useState(false)
  const role = (profile?.id ?? 'physician') as RoleId
  const activePatients = state.patients.filter((patient) => patient.status !== 'discharged')
  const emergency = activePatients.filter((patient) => patient.department === 'emergency')
  const homeDepartment = profile?.department ?? 'emergency'
  const unitDepartment = departmentById(state.departments, homeDepartment)
  const unitPatients = activePatients.filter((patient) => patient.department === homeDepartment)
  const unitHighAcuity = unitPatients.filter((patient) => patient.esi <= 2)
  const unitPatientIds = new Set(unitPatients.map((patient) => patient.id))
  const unitOrders = state.orders.filter((order) => unitPatientIds.has(order.patientId))
  const unitReferrals = state.referrals.filter((referral) => referral.from === homeDepartment || referral.to === homeDepartment)
  const highAcuity = activePatients.filter((patient) => patient.esi <= 2)
  const occupancy = Math.round(state.departments.reduce((sum, department) => sum + department.occupied, 0) / state.departments.reduce((sum, department) => sum + department.capacity, 0) * 100)
  const departmentOrders = state.orders.filter((order) => order.department === profile?.department)
  const departmentReferrals = state.referrals.filter((referral) => referral.to === profile?.department)

  const roleMetrics: Record<RoleId, Array<{ label: string; value: string | number; detail: string; icon: typeof Activity; tone?: string; progress?: number }>> = {
    physician: [
      { label: 'High-acuity patients', value: unitHighAcuity.length, detail: `${unitPatients.length} active in ${unitDepartment.shortName}`, icon: Siren, tone: 'coral' },
      { label: 'Open diagnostics', value: unitOrders.filter((order) => order.status !== 'completed').length, detail: `${unitOrders.filter((order) => order.status === 'in-progress').length} studies in progress`, icon: FlaskConical, tone: 'blue' },
      { label: 'Consults awaiting', value: unitReferrals.filter((referral) => referral.status === 'pending').length, detail: `${unitReferrals.filter((referral) => referral.priority === 'emergent' && referral.status === 'pending').length} emergent decisions`, icon: Network, tone: 'amber' },
      { label: `${unitDepartment.shortName} capacity`, value: unitDepartment.capacity - unitDepartment.occupied, detail: `${Math.round(unitDepartment.occupied / unitDepartment.capacity * 100)}% unit occupancy`, icon: BedDouble, tone: 'teal' },
    ],
    nurse: [
      { label: 'Waiting for clinician', value: unitPatients.filter((patient) => patient.status === 'waiting').length, detail: `Live ${unitDepartment.shortName} queue`, icon: UsersRound, tone: 'amber' },
      { label: 'High-risk patients', value: unitHighAcuity.length, detail: 'ESI 1–2 under close observation', icon: Siren, tone: 'coral' },
      { label: 'Reassessment due', value: unitPatients.filter((patient) => patient.status === 'waiting' && (now - new Date(patient.arrival).getTime()) > 30 * 60_000).length, detail: 'Waiting longer than 30 minutes', icon: TimerReset, tone: 'blue' },
      { label: homeDepartment === 'emergency' ? 'Assessed this shift' : 'Active unit census', value: homeDepartment === 'emergency' ? state.patients.filter((patient) => patient.timeline.some((event) => event.type === 'triage')).length : unitPatients.length, detail: homeDepartment === 'emergency' ? 'Complete triage records' : 'Inpatient & outpatient episodes', icon: ClipboardCheck, tone: 'teal' },
    ],
    consultant: [
      { label: 'New referrals', value: departmentReferrals.filter((referral) => referral.status === 'pending').length, detail: `For ${departmentById(state.departments, profile?.department ?? 'cardiology').name}`, icon: BellRing, tone: 'coral' },
      { label: 'Accepted reviews', value: departmentReferrals.filter((referral) => referral.status === 'accepted').length, detail: 'Recommendations still due', icon: Stethoscope, tone: 'blue' },
      { label: 'Completed', value: departmentReferrals.filter((referral) => referral.status === 'completed').length, detail: 'Closed-loop consultations', icon: ClipboardCheck, tone: 'teal' },
      { label: 'Unit capacity', value: `${Math.round((state.departments.find((department) => department.id === profile?.department)?.occupied ?? 0) / (state.departments.find((department) => department.id === profile?.department)?.capacity ?? 1) * 100)}%`, detail: `${departmentById(state.departments, profile?.department ?? 'cardiology').occupied} occupied beds`, icon: BedDouble, tone: 'amber' },
    ],
    diagnostics: [
      { label: 'Active worklist', value: departmentOrders.filter((order) => order.status !== 'completed').length, detail: `${departmentOrders.filter((order) => order.status === 'ordered').length} not yet started`, icon: ScanLine, tone: 'blue' },
      { label: 'Urgent & emergent', value: departmentOrders.filter((order) => order.status !== 'completed' && order.priority !== 'routine').length, detail: 'Prioritised to the top', icon: Siren, tone: 'coral' },
      { label: 'In progress', value: departmentOrders.filter((order) => order.status === 'in-progress').length, detail: 'Studies being performed', icon: Activity, tone: 'amber' },
      { label: 'Reported', value: departmentOrders.filter((order) => order.status === 'completed').length, detail: 'Results released to charts', icon: FileCheck2, tone: 'teal' },
    ],
    coordinator: [
      { label: 'Hospital occupancy', value: `${occupancy}%`, detail: 'Across all staffed units', icon: Hospital, tone: 'blue', progress: occupancy },
      { label: 'Spaces available', value: state.departments.reduce((sum, department) => sum + department.capacity - department.occupied, 0), detail: 'Including service capacity', icon: BedDouble, tone: 'teal' },
      { label: 'Potential movements', value: state.referrals.filter((referral) => referral.status !== 'completed' && ['ward', 'icu', 'cardiology'].includes(referral.to)).length, detail: 'Linked to active referrals', icon: Network, tone: 'amber' },
      { label: 'Units above 90%', value: state.departments.filter((department) => department.occupied / department.capacity >= 0.9).length, detail: 'Require proactive flow review', icon: AlertTriangle, tone: 'coral' },
    ],
    administrator: [
      { label: 'Hospital occupancy', value: `${occupancy}%`, detail: `${state.departments.reduce((sum, department) => sum + department.occupied, 0)} of ${state.departments.reduce((sum, department) => sum + department.capacity, 0)} spaces`, icon: Hospital, tone: 'blue', progress: occupancy },
      { label: 'Active episodes', value: activePatients.length, detail: `${highAcuity.length} high-acuity patients`, icon: UsersRound, tone: 'teal' },
      { label: 'Open referrals', value: state.referrals.filter((referral) => ['pending', 'accepted'].includes(referral.status)).length, detail: `${state.referrals.filter((referral) => referral.priority === 'emergent' && referral.status !== 'completed').length} emergent pathways`, icon: Network, tone: 'amber' },
      { label: 'Departments at pressure', value: state.departments.filter((department) => department.occupied / department.capacity >= 0.85).length, detail: 'Occupancy at or above 85%', icon: AlertTriangle, tone: 'coral' },
    ],
  }

  const queuePatients = role === 'nurse' || role === 'physician'
    ? unitPatients.sort((a, b) => a.esi - b.esi || a.arrival.localeCompare(b.arrival))
    : activePatients.sort((a, b) => a.esi - b.esi)

  const exportOperations = () => {
    downloadCsv(`northstar-operations-${new Date().toISOString().slice(0, 10)}.csv`, [['Department', 'Lead', 'Capacity', 'Occupied', 'Available', 'Occupancy %', 'Average wait (min)'], ...state.departments.map((department) => [department.name, department.lead, department.capacity, department.occupied, department.capacity - department.occupied, Math.round(department.occupied / department.capacity * 100), department.averageWait])])
  }

  const actions = <>
    {(role === 'nurse' || role === 'physician') && (homeDepartment === 'emergency' ? <Button icon={Plus} onClick={() => setTriageOpen(true)}>New triage</Button> : <><Button variant="secondary" icon={UsersRound} onClick={() => navigate('/patients?view=outpatient')}>Outpatient review</Button><Button icon={BedDouble} onClick={() => navigate('/patients?view=inpatient')}>Inpatient review</Button></>)}
    {role === 'consultant' && <Button icon={Network} onClick={() => navigate('/network')}>Open care network</Button>}
    {role === 'coordinator' && <Button icon={BedDouble} onClick={() => navigate('/departments')}>Manage capacity</Button>}
    {role === 'administrator' && <Button icon={Download} onClick={exportOperations}>Export snapshot</Button>}
    {role === 'diagnostics' && <Button variant="secondary" icon={ListFilter} onClick={() => document.querySelector('.diagnostic-worklist')?.scrollIntoView({ behavior: 'smooth' })}>Focus worklist</Button>}
  </>

  return <motion.div className="dashboard-page" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.055 } } }}>
    <motion.div variants={enter}><PageHeader eyebrow={`${profile?.shift} SHIFT · ${departmentById(state.departments, profile?.department ?? 'emergency').name.toUpperCase()}`} title={profile?.headline ?? ''} description={profile?.description ?? ''} actions={actions} /></motion.div>
    <motion.div className="metrics-grid" variants={enter}>{roleMetrics[role].map((metric) => <Metric key={metric.label} {...metric} />)}</motion.div>

    {role === 'consultant' ? <motion.div className="dashboard-grid consultant-grid" variants={enter}><ReferralInbox /><div className="dashboard-side"><DepartmentPressure limit={4} /><ActivityFeed limit={5} /></div></motion.div>
      : role === 'diagnostics' ? <motion.div className="dashboard-grid diagnostics-grid" variants={enter}><DiagnosticWorklist /><div className="dashboard-side"><Panel title={homeDepartment === 'laboratory' ? 'Laboratory turnaround' : 'Reporting turnaround'} action={<Clock3 size={17} className="muted-icon" />}><div className="turnaround-hero"><span>Average this shift</span><strong>{homeDepartment === 'laboratory' ? '52' : '38'}<small>min</small></strong><p><TrendingUp size={14} />{homeDepartment === 'laboratory' ? '8' : '12'}% faster than last shift</p></div><div className="turnaround-rows">{(homeDepartment === 'laboratory' ? [['Troponin', '34 min', '58%'], ['FBC', '41 min', '69%'], ['Blood gas', '18 min', '38%']] : [['CT', '24 min', '62%'], ['MRI', '52 min', '86%'], ['Plain film', '31 min', '72%']]).map(([label, time, width]) => <div key={label}><span>{label}</span><b>{time}</b><i><motion.em initial={{ width: 0 }} animate={{ width }} /></i></div>)}</div></Panel><ActivityFeed limit={4} /></div></motion.div>
        : role === 'coordinator' ? <motion.div variants={enter}><CapacityBoard /><div className="dashboard-grid coordinator-lower"><FlowRequestPanel /><ActivityFeed limit={5} /></div></motion.div>
          : role === 'administrator' ? <motion.div variants={enter}><div className="dashboard-grid admin-grid"><AdminFlowChart /><DepartmentPressure limit={5} /></div><div className="dashboard-grid coordinator-lower"><PatientQueue patients={queuePatients} title="High-acuity hospital census" description="Cross-department clinical risk, ordered by ESI." now={now} /><ActivityFeed limit={5} /></div></motion.div>
            : <motion.div className="dashboard-grid" variants={enter}><PatientQueue patients={queuePatients} title={role === 'nurse' ? `${unitDepartment.shortName} nursing queue` : `${unitDepartment.shortName} clinical queue`} description={role === 'nurse' ? 'Full unit, ordered by acuity and longest waiting time.' : 'Your specialty census, ordered by clinical acuity.'} mode={role === 'nurse' ? 'triage' : 'clinical'} now={now} /><div className="dashboard-side">{role === 'nurse' ? <AcuityMix patients={unitPatients} /> : <DecisionPanel patients={unitPatients} />}<ActivityFeed limit={4} /></div></motion.div>}

    {['physician', 'nurse'].includes(role) && <motion.div className="dashboard-bottom-grid" variants={enter}><DepartmentPressure limit={5} /><Panel title="Connected care at a glance" action={<button className="panel-action" onClick={() => navigate('/network')}>Explore network<ArrowRight size={14} /></button>}><div className="care-glance"><div><span><Network size={20} /></span><p><b>{state.referrals.filter((referral) => referral.status === 'pending').length}</b><small>Awaiting specialist response</small></p></div><div><span><FlaskConical size={20} /></span><p><b>{state.orders.filter((order) => order.status === 'in-progress').length}</b><small>Diagnostics in progress</small></p></div><div><span><BedDouble size={20} /></span><p><b>{state.departments.reduce((sum, department) => sum + department.capacity - department.occupied, 0)}</b><small>Spaces across the hospital</small></p></div></div><div className="care-glance-note"><HeartPulse size={16} /><span>One episode record keeps clinical context intact at every handoff.</span></div></Panel></motion.div>}
    {can('triage') && homeDepartment === 'emergency' && <TriageModal open={triageOpen} onClose={() => setTriageOpen(false)} />}
  </motion.div>
}