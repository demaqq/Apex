import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowDownUp, ChevronRight, ClipboardList, Download, Filter, Network, Plus, Search, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TriageModal } from '../components/ClinicalModals'
import { Avatar, Button, EmptyState, EsiBadge, PageHeader, Panel, StatusBadge } from '../components/ui'
import { departmentById } from '../data'
import { getEncounterType, patientCsv, statusLabels } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId } from '../types'

type RecordView = 'active' | 'critical' | 'inpatient' | 'outpatient' | 'discharged' | 'all'

export default function Patients() {
  const { state, profile, can, setSelectedPatientId } = useHospital()
  const [params, setParams] = useSearchParams()
  const requestedView = params.get('view')
  const initialView: RecordView = ['active', 'critical', 'inpatient', 'outpatient', 'discharged', 'all'].includes(requestedView ?? '') ? requestedView as RecordView : 'active'
  const canEmergencyTriage = can('triage') && profile?.department === 'emergency'
  const initialDepartment = ['administrator', 'coordinator'].includes(profile?.id ?? '') ? 'all' : profile?.department ?? 'all'
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(initialDepartment)
  const [acuity, setAcuity] = useState('all')
  const [status, setStatus] = useState('all')
  const [view, setView] = useState<RecordView>(initialView)
  const [sort, setSort] = useState('acuity')
  const [triageOpen, setTriageOpen] = useState(false)

  useEffect(() => {
    if (['active', 'critical', 'inpatient', 'outpatient', 'discharged', 'all'].includes(requestedView ?? '')) setView(requestedView as RecordView)
  }, [requestedView])

  const patients = useMemo(() => state.patients.filter((patient) => {
    if (view === 'active' && patient.status === 'discharged') return false
    if (view === 'critical' && patient.esi > 2) return false
    if (['inpatient', 'outpatient'].includes(view) && (patient.status === 'discharged' || getEncounterType(patient) !== view)) return false
    if (view === 'discharged' && patient.status !== 'discharged') return false
    if (department !== 'all' && patient.department !== department) return false
    if (acuity !== 'all' && patient.esi !== Number(acuity)) return false
    if (status !== 'all' && patient.status !== status) return false
    if (query && !`${patient.name} ${patient.mrn} ${patient.complaint} ${patient.location} ${patient.assignedTo}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'newest' ? b.arrival.localeCompare(a.arrival) : sort === 'department' ? a.department.localeCompare(b.department) : a.esi - b.esi || a.arrival.localeCompare(b.arrival)), [state.patients, view, department, acuity, status, query, sort])

  const scopedPatients = useMemo(() => department === 'all' ? state.patients : state.patients.filter((patient) => patient.department === department), [state.patients, department])
  const changeView = (nextView: RecordView) => { setView(nextView); setParams({ view: nextView }) }
  const hasFilters = query || department !== 'all' || acuity !== 'all' || status !== 'all'
  const clearFilters = () => { setQuery(''); setDepartment('all'); setAcuity('all'); setStatus('all') }
  const exportList = () => {
    const names = Object.fromEntries(state.departments.map((item) => [item.id, item.name])) as Record<DepartmentId, string>
    patientCsv(patients, names)
  }

  return <motion.div className="patients-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader eyebrow={department === 'all' ? 'ONE SHARED EPISODE · EVERY DEPARTMENT' : `${departmentById(state.departments, department as DepartmentId).name.toUpperCase()} · SPECIALTY CLINICAL REVIEW`} title="Patient records" description="Review inpatient and outpatient encounters with specialty-scoped observations, diagnostics, referrals and discharge timelines." actions={<><Button variant="secondary" icon={Download} onClick={exportList} disabled={!patients.length}>Export view</Button>{canEmergencyTriage && <Button icon={Plus} onClick={() => setTriageOpen(true)}>New patient</Button>}</>} />

    <Panel className="records-panel">
      <div className="records-topline"><div className="view-tabs">{([['active', `Active ${scopedPatients.filter((patient) => patient.status !== 'discharged').length}`], ['inpatient', `Inpatient ${scopedPatients.filter((patient) => patient.status !== 'discharged' && getEncounterType(patient) === 'inpatient').length}`], ['outpatient', `Outpatient ${scopedPatients.filter((patient) => patient.status !== 'discharged' && getEncounterType(patient) === 'outpatient').length}`], ['critical', `High acuity ${scopedPatients.filter((patient) => patient.esi <= 2 && patient.status !== 'discharged').length}`], ['discharged', `Discharged ${scopedPatients.filter((patient) => patient.status === 'discharged').length}`], ['all', `All ${scopedPatients.length}`]] as const).map(([value, label]) => <button key={value} className={view === value ? 'active' : ''} onClick={() => changeView(value)}>{label}</button>)}</div><span className="record-sync"><span className="live-dot" />{department === 'all' ? 'Hospital-wide' : 'Specialty scope'} · Live</span></div>
      <div className="records-filters">
        <label className="records-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, MRN, complaint, clinician or location…" />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</label>
        <label><Filter size={15} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="all">All departments</option>{state.departments.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select></label>
        <label><Activity size={15} /><select value={acuity} onChange={(event) => setAcuity(event.target.value)}><option value="all">All ESI levels</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>ESI {level}</option>)}</select></label>
        <label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Any status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="records-meta"><span><b>{patients.length}</b> patient{patients.length === 1 ? '' : 's'} in this view{hasFilters && <button onClick={clearFilters}>Clear filters<X size={12} /></button>}</span><label><ArrowDownUp size={14} />Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="acuity">Clinical acuity</option><option value="newest">Most recent arrival</option><option value="name">Patient name</option><option value="department">Department</option></select></label></div>

      <div className="records-table-wrap"><table className="records-table"><thead><tr><th>Patient</th><th>Acuity</th><th>Clinical presentation</th><th>Department / location</th><th>Latest observations</th><th>Care connections</th><th>Status</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
        <AnimatePresence mode="popLayout" initial={false}>{patients.map((patient) => {
          const dept = departmentById(state.departments, patient.department)
          const orders = state.orders.filter((order) => order.patientId === patient.id)
          const referrals = state.referrals.filter((referral) => referral.patientId === patient.id)
          return <motion.tr layout key={patient.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPatientId(patient.id)}>
            <td><div className="table-patient"><Avatar name={patient.name} size="md" /><div><b>{patient.name}</b><span>{patient.mrn} · {patient.age}{patient.sex === 'Female' ? 'F' : patient.sex === 'Male' ? 'M' : 'NB'}</span><small>{patient.assignedTo}</small></div></div></td>
            <td><EsiBadge level={patient.esi} compact />{patient.esiOverride && <span className="override-indicator" title={patient.esiOverride}>Override</span>}</td>
            <td><p className="table-complaint">{patient.complaint}</p><div className="table-allergies">{!patient.allergies.includes('No known allergies') && <span>Allergy: {patient.allergies.join(', ')}</span>}{patient.riskFactors[0] && <small>{patient.riskFactors[0]}</small>}</div></td>
            <td><div className="table-department"><span style={{ color: dept.color }}>{dept.shortName}</span><b>{patient.location}</b></div></td>
            <td><div className="table-vitals"><span className={patient.vitals.hr >= 120 ? 'abnormal-text' : ''}>HR <b>{patient.vitals.hr}</b></span><span className={patient.vitals.spo2 < 94 ? 'abnormal-text' : ''}>SpO₂ <b>{patient.vitals.spo2}%</b></span><span>BP <b>{patient.vitals.bpSys}/{patient.vitals.bpDia}</b></span></div></td>
            <td><div className="connection-counts"><span className={orders.some((order) => order.status !== 'completed') ? 'active' : ''}><ClipboardList size={14} />{orders.filter((order) => order.status !== 'completed').length} open</span><span className={referrals.some((referral) => ['pending', 'accepted'].includes(referral.status)) ? 'active' : ''}><Network size={14} />{referrals.filter((referral) => ['pending', 'accepted'].includes(referral.status)).length} active</span></div></td>
            <td><StatusBadge status={patient.status} /><span className={`encounter-label ${getEncounterType(patient)}`}>{getEncounterType(patient)}</span></td>
            <td><button className="icon-button" aria-label={`Open ${patient.name}`}><ChevronRight size={17} /></button></td>
          </motion.tr>
        })}</AnimatePresence>
      </tbody></table></div>
      {patients.length === 0 && <EmptyState icon={UsersRound} title="No patient records found" text="No records match this combination of view and filters." action={<Button variant="secondary" size="sm" onClick={() => { clearFilters(); setView('all') }}>Show all records</Button>} />}
      <div className="records-footer"><span>Showing {patients.length} of {scopedPatients.length} records in this scope</span><span>Observations shown are the most recent recorded at triage or reassessment.</span></div>
    </Panel>
    {canEmergencyTriage && <TriageModal open={triageOpen} onClose={() => setTriageOpen(false)} onCreated={(id) => setSelectedPatientId(id)} />}
  </motion.div>
}