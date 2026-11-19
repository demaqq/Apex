import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ClipboardPlus, Hourglass, UserPlus, UsersRound } from 'lucide-react'
import { Button, Chip, EmptyState, EsiBadge, Metric, Modal, PageHeader, Panel, PersonCell } from '../components/ui'
import { calculateEsi, departmentById, esiLabels } from '../data'
import { formatTime, minutesSince } from '../lib/format'
import { useNow } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId, Patient, Vitals } from '../types'

const INSURERS = ['Self-pay', 'Medicare', 'Medicaid', 'BlueCross BlueShield', 'Aetna', 'Cigna', 'Private insurance']

export default function FrontDesk() {
  const { state, can, registerPatient, setSelectedPatientId } = useHospital()
  const now = useNow()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Patient['sex']>('Female')
  const [phone, setPhone] = useState('')
  const [insurance, setInsurance] = useState(INSURERS[0])
  const [complaint, setComplaint] = useState('')
  const [error, setError] = useState('')
  const [triaging, setTriaging] = useState<Patient | null>(null)
  const awaiting = state.patients.filter((patient) => patient.status === 'awaiting-triage').sort((a, b) => a.arrival.localeCompare(b.arrival))
  const today = state.patients.filter((patient) => minutesSince(patient.arrival, now) < 1440 && patient.timeline.some((event) => event.title === 'Registered at front desk'))
  const canTriage = can('triage')

  const submit = () => {
    const years = Number(age)
    if (name.trim().split(/\s+/).length < 2 || !age || years < 0 || years > 120 || complaint.trim().length < 3) { setError('Enter the full name, a valid age and the reason for the visit.'); return }
    registerPatient({ name, age: years, sex, phone, insurance, complaint })
    setName(''); setAge(''); setPhone(''); setComplaint(''); setInsurance(INSURERS[0]); setError('')
  }

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Front desk · Registration" title="Front desk" description="Register arrivals and send them to triage. Children under 12 are routed to paediatrics." />
      <div className="metrics-grid">
        <Metric label="Registered today" value={today.length} detail="At this front desk" icon={UserPlus} tone="teal" />
        <Metric label="Awaiting triage" value={awaiting.length} detail={awaiting[0] ? `Longest wait ${minutesSince(awaiting[0].arrival, now)} min` : 'Queue clear'} icon={Hourglass} tone="amber" />
        <Metric label="Patients on file" value={state.patients.length} detail={`${state.patients.filter((patient) => patient.status !== 'discharged').length} active episodes`} icon={UsersRound} tone="blue" />
        <Metric label="Waiting for doctor" value={state.patients.filter((patient) => patient.status === 'waiting').length} detail="Triaged, not yet seen" icon={ClipboardPlus} tone="coral" />
      </div>

      {can('register') && (
        <Panel title="Register a patient">
          <div className="form-grid form-grid-3" style={{ padding: '6px 18px 0' }}>
            <label className="form-field"><span>Full name <b>*</b></span><input value={name} onChange={(event) => { setName(event.target.value); setError('') }} /></label>
            <label className="form-field"><span>Age (years) <b>*</b></span><input type="number" min={0} max={120} value={age} onChange={(event) => setAge(event.target.value)} /></label>
            <label className="form-field"><span>Sex</span><select value={sex} onChange={(event) => setSex(event.target.value as Patient['sex'])}><option>Female</option><option>Male</option><option>Non-binary</option></select></label>
            <label className="form-field"><span>Phone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label className="form-field"><span>Insurance</span><select value={insurance} onChange={(event) => setInsurance(event.target.value)}>{INSURERS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="form-field"><span>Reason for visit <b>*</b></span><input value={complaint} onChange={(event) => setComplaint(event.target.value)} /></label>
          </div>
          {error && <div className="inline-error" role="alert" style={{ margin: '10px 18px 0' }}><AlertTriangle size={16} />{error}</div>}
          <div className="panel-actions" style={{ padding: '12px 18px 16px' }}><Button icon={UserPlus} onClick={submit}>Register and send to triage</Button></div>
        </Panel>
      )}

      <Panel title="Waiting for triage">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Reason</th><th>Route</th><th>Insurance</th><th className="num">Waiting</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {awaiting.map((patient) => (
                <tr key={patient.id}>
                  <td><PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.age} y ${patient.sex[0]}`} onClick={() => setSelectedPatientId(patient.id)} /></td>
                  <td className="wrap">{patient.complaint}</td>
                  <td>{departmentById(state.departments, patient.department).shortName}</td>
                  <td>{patient.insurance ?? 'Self-pay'}</td>
                  <td className="num mono">{minutesSince(patient.arrival, now)} min<small>since {formatTime(patient.arrival)}</small></td>
                  <td className="row-actions">{canTriage ? <Button size="sm" icon={ClipboardPlus} onClick={() => setTriaging(patient)}>Evaluate</Button> : <Chip tone="warning">Awaiting nurse</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {awaiting.length === 0 && <EmptyState icon={Hourglass} title="Nobody waiting" text="Registered patients appear here until they are triaged." />}
      </Panel>

      {triaging && <TriageEvaluationModal patient={triaging} onClose={() => setTriaging(null)} />}
    </motion.div>
  )
}

/** Selam-style triage evaluation for a registered patient. */
export function TriageEvaluationModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { state, completeTriage } = useHospital()
  const [history, setHistory] = useState('')
  const [obs, setObs] = useState({ hr: '', bpSys: '', bpDia: '', rr: '', temp: '', spo2: '', gcs: '15', pain: '0' })
  const [exam, setExam] = useState('')
  const [impression, setImpression] = useState(patient.complaint)
  const [allergies, setAllergies] = useState('')
  const [esi, setEsi] = useState<number>(0)
  const [department, setDepartment] = useState<DepartmentId>(patient.department)
  const [error, setError] = useState('')
  const vitals = Object.fromEntries(Object.entries(obs).map(([key, value]) => [key, Number(value)])) as unknown as Vitals
  const complete = ['hr', 'bpSys', 'bpDia', 'rr', 'temp', 'spo2'].every((key) => obs[key as keyof typeof obs])
  const suggestion = useMemo(() => complete ? calculateEsi(vitals, `${impression} ${history}`, 2, []) : null, [complete, vitals, impression, history])
  const units = state.departments.filter((item) => !['laboratory', 'radiology', 'pharmacy'].includes(item.id))

  const submit = () => {
    if (history.trim().length < 5 || !complete || !esi) { setError('Record the history, all six observations and an ESI level.'); return }
    completeTriage(patient.id, { vitals, esi: esi as Patient['esi'], history: `${history.trim()}${exam.trim() ? ` Examination: ${exam.trim()}` : ''}`, impression: impression.trim(), allergies: allergies.split(',').map((item) => item.trim()).filter(Boolean), department })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Triage evaluation · ${patient.name}`} subtitle={`${patient.mrn} · ${patient.age} y ${patient.sex} · ${patient.complaint}`} size="lg">
      <label className="form-field"><span>History <b>*</b> <small className="muted-text">onset, duration, associated symptoms, past history, medicines</small></span><textarea rows={3} value={history} onChange={(event) => setHistory(event.target.value)} /></label>
      <span className="detail-heading" style={{ display: 'block', marginTop: 14 }}>Observations</span>
      <div className="form-grid obs-form">
        {([['hr', 'Heart rate'], ['bpSys', 'Systolic BP'], ['bpDia', 'Diastolic BP'], ['rr', 'Resp. rate'], ['temp', 'Temp (°C)'], ['spo2', 'SpO₂ (%)'], ['gcs', 'GCS'], ['pain', 'Pain /10']] as Array<[keyof typeof obs, string]>).map(([key, label]) => <label key={key} className="form-field"><span>{label}</span><input type="number" step={key === 'temp' ? 0.1 : 1} value={obs[key]} onChange={(event) => setObs({ ...obs, [key]: event.target.value })} /></label>)}
      </div>
      <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
        <label className="form-field span-2"><span>Physical examination</span><textarea rows={2} value={exam} onChange={(event) => setExam(event.target.value)} /></label>
        <label className="form-field"><span>Working impression</span><input value={impression} onChange={(event) => setImpression(event.target.value)} /></label>
        <label className="form-field"><span>Allergies <small className="muted-text">comma separated</small></span><input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="Leave blank if none known" /></label>
        <label className="form-field"><span>Urgency (ESI) <b>*</b></span><select value={esi} onChange={(event) => setEsi(Number(event.target.value))}><option value={0}>Choose level…</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} – {esiLabels[level].name}</option>)}</select></label>
        <label className="form-field"><span>Send to</span><select value={department} onChange={(event) => setDepartment(event.target.value as DepartmentId)}>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {suggestion && <div className="rx-warnings" style={{ marginTop: 12 }}><span className="success"><EsiBadge level={suggestion.esi} /> Suggested from observations: {suggestion.reasons.join('; ')}. You remain accountable for the final level.</span></div>}
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={ClipboardPlus} onClick={submit}>Complete triage</Button></div>
    </Modal>
  )
}
