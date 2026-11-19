import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BellRing, Check, HandHeart } from 'lucide-react'
import { Button, Chip, EmptyState, NewsChip, PageHeader, Panel } from '../components/ui'
import { departmentById } from '../data'
import { stagesFor, orderStage, patientAlerts, patientNews2 } from '../lib/clinical'
import { relativeTime } from '../lib/format'
import { useNow } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'

/** SBAR handover cards for every inpatient on the unit, plus handover records. */
export default function Handover() {
  const { state, profile, addHandover, acknowledgeHandover, escalatePatient, setSelectedPatientId } = useHospital()
  const now = useNow()
  const department = profile?.department ?? 'emergency'
  const allUnits = profile?.id === 'administrator'
  const patients = state.patients.filter((patient) => patient.status !== 'discharged' && (allUnits || patient.department === department) && ['admitted', 'observation', 'in-treatment', 'waiting'].includes(patient.status))
  const nurses = state.staff.filter((member) => /nurse/i.test(member.role) && member.name !== profile?.name && !member.suspended)
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '')
  const [to, setTo] = useState(nurses[0]?.name ?? 'Night charge nurse')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const records = state.handovers.filter((item) => allUnits || patients.some((patient) => patient.id === item.patientId))

  const save = () => {
    if (!patientId || note.trim().length < 10) { setError('Choose a patient and write a handover note covering condition, risks and tasks.'); return }
    addHandover(patientId, to, note); setNote(''); setError('')
  }

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow={`Nursing · ${allUnits ? 'All units' : departmentById(state.departments, department).name}`} title="Shift handover" description="Situation, background, assessment and outstanding tasks for every patient, in the SBAR format." />
      <div className="card-grid">
        {patients.map((patient) => {
          const score = patientNews2(patient)
          const open = state.orders.filter((order) => order.patientId === patient.id && order.status !== 'completed')
          const alerts = patientAlerts(patient, state.orders)
          const v = patient.vitals
          return (
            <article key={patient.id} className="work-card sbar-card">
              <header><button type="button" className="link-button" onClick={() => setSelectedPatientId(patient.id)}>{patient.name}</button><span className="mono muted-text">{patient.mrn}</span><Chip tone="neutral">{patient.location}</Chip><NewsChip patient={patient} />{patient.escalation && <Chip tone="warning">Escalated {relativeTime(patient.escalation.at, now)}</Chip>}</header>
              <p><b>S</b>{patient.complaint}.</p>
              <p><b>B</b>{patient.history.split('.')[0]}. {patient.allergies.some((allergy) => !/no known|not yet/i.test(allergy)) ? `Allergies: ${patient.allergies.join(', ')}.` : 'No known allergies.'}</p>
              <p><b>A</b>{v.hr ? `HR ${v.hr}, BP ${v.bpSys}/${v.bpDia}, RR ${v.rr}, SpO₂ ${v.spo2}%, T ${v.temp}°C.` : 'Observations not yet recorded.'}{alerts.length ? ` Risks: ${alerts.map((alert) => alert.text.split(':')[0]).join('; ')}.` : ''}</p>
              <p><b>R</b>{open.length ? open.map((order) => `${order.title} (${stagesFor(order)[orderStage(order)].toLowerCase()})`).join('; ') : 'Nothing pending.'}</p>
              {score && score.score >= 5 && !patient.escalation && <footer><span /><Button size="sm" variant="danger" icon={BellRing} onClick={() => escalatePatient(patient.id)}>Escalate to doctor</Button></footer>}
            </article>
          )
        })}
        {patients.length === 0 && <Panel><EmptyState icon={HandHeart} title="No patients on this unit" text="Inpatients on your unit appear here with an SBAR summary." /></Panel>}
      </div>

      <Panel title="Hand over a patient">
        <div className="form-grid form-grid-2" style={{ padding: '6px 18px 0' }}>
          <label className="form-field"><span>Patient</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.location}</option>)}</select></label>
          <label className="form-field"><span>Receiving nurse</span><select value={to} onChange={(event) => setTo(event.target.value)}>{nurses.map((member) => <option key={member.id}>{member.name}</option>)}<option>Night charge nurse</option></select></label>
          <label className="form-field span-2"><span>Handover note <b>*</b></span><textarea rows={3} value={note} onChange={(event) => { setNote(event.target.value); setError('') }} placeholder="Condition, risks and tasks for the next shift" /></label>
        </div>
        {error && <div className="inline-error" role="alert" style={{ margin: '10px 18px 0' }}><AlertTriangle size={16} />{error}</div>}
        <div className="panel-actions" style={{ padding: '12px 18px 16px' }}><Button icon={HandHeart} onClick={save}>Record handover</Button></div>
      </Panel>

      <Panel title="Recent handovers">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Time</th><th>Patient</th><th>From → to</th><th>Note</th><th aria-label="Status" /></tr></thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id}>
                  <td>{relativeTime(item.at, now)}</td>
                  <td>{state.patients.find((patient) => patient.id === item.patientId)?.name}</td>
                  <td>{item.from} → {item.to}</td>
                  <td className="wrap">{item.note}</td>
                  <td className="row-actions">{item.acknowledgedAt ? <Chip tone="success">Acknowledged {relativeTime(item.acknowledgedAt, now)}</Chip> : <Button size="sm" variant="secondary" icon={Check} onClick={() => acknowledgeHandover(item.id)}>Acknowledge</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {records.length === 0 && <p className="table-footnote">No handovers recorded yet.</p>}
      </Panel>
    </motion.div>
  )
}
