import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BedDouble, CalendarCheck, CheckCircle2, DoorOpen, Home, Hourglass, QrCode, Send, Stethoscope, UserRound, UsersRound } from 'lucide-react'
import { EPrescribeModal } from '../components/EPrescription'
import { Button, Chip, DepartmentIcon, EmptyState, EsiBadge, Metric, Modal, PageHeader, Panel, PersonCell } from '../components/ui'
import { departmentById } from '../data'
import { formatTime, minutesSince } from '../lib/format'
import { useNow } from '../lib/hooks'
import { BILLING_TONE, opdDepartments } from '../lib/reception'
import { useHospital, type OpdOutcome } from '../store/HospitalStore'
import type { DepartmentId, Patient } from '../types'

const DOCTORS = ['physician', 'consultant', 'intern']

export default function OpdView() {
  const { state, profile, currentRole, opdCall, setSelectedPatientId } = useHospital()
  const now = useNow()
  const clinics = opdDepartments(state.departments)
  const inClinic = (patient: Patient, dept: string) => patient.visit?.type === 'OPD' && patient.visit.department === dept
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const waitingIn = (dept: string) => state.patients.filter((p) => inClinic(p, dept) && p.visit?.opd === 'Waiting' && p.status !== 'discharged').length
  const [dept, setDept] = useState<DepartmentId>(() => clinics.find((d) => d.id === profile?.department)?.id ?? clinics.slice().sort((a, b) => waitingIn(b.id) - waitingIn(a.id))[0]?.id ?? 'internal-medicine')
  const [finishing, setFinishing] = useState<Patient | null>(null)
  const department = departmentById(state.departments, dept)
  const rooms = Array.from({ length: state.settings.opdRooms?.[dept] ?? 3 }, (_, i) => `Room ${i + 1}`)
  const queue = state.patients.filter((p) => inClinic(p, dept) && p.status !== 'discharged' && (p.visit?.opd === 'Waiting' || p.visit?.opd === 'With doctor')).sort((a, b) => (a.esi - b.esi) || (a.visit!.checkedInAt.localeCompare(b.visit!.checkedInAt)))
  const waiting = queue.filter((p) => p.visit?.opd === 'Waiting')
  const withDoctor = queue.filter((p) => p.visit?.opd === 'With doctor')
  const atTriage = state.patients.filter((p) => p.visit?.type === 'OPD' && p.visit.department === dept && (p.status === 'awaiting-triage' || p.status === 'awaiting-payment'))
  const seen = state.patients.filter((p) => p.visit?.department === dept && p.visit.opd === 'Seen' && new Date(p.visit.checkedInAt).getTime() >= startOfDay.getTime())
  const isDoctor = DOCTORS.includes(currentRole ?? '')
  const canCall = isDoctor || currentRole === 'nurse'
  const freeRoom = rooms.find((room) => !withDoctor.some((p) => p.visit?.room === room))

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Outpatient department · every clinic" title={`${department.name} OPD`} description="Patients arrive here after reception and triage. Call the next patient into a free room, then finish the visit: home, follow-up, admit to the ward, or send to another clinic." />
      <div className="opd-tabs" role="tablist" aria-label="Clinics">
        {clinics.map((clinic) => { const n = waitingIn(clinic.id); return <button key={clinic.id} type="button" role="tab" aria-selected={clinic.id === dept} className={clinic.id === dept ? 'on' : ''} onClick={() => setDept(clinic.id)}><DepartmentIcon id={clinic.id} size={14} />{clinic.shortName}{n > 0 && <b>{n}</b>}</button> })}
      </div>
      <div className="metrics-grid">
        <Metric label="Waiting to be seen" value={waiting.length} detail={waiting[0] ? `Longest ${minutesSince(waiting[0].visit!.checkedInAt, now)} min since check-in` : 'Queue clear'} icon={Hourglass} tone="amber" />
        <Metric label="With a doctor" value={withDoctor.length} detail={`${rooms.length - withDoctor.length} of ${rooms.length} rooms free`} icon={Stethoscope} tone="teal" />
        <Metric label="At reception or triage" value={atTriage.length} detail="Coming to this clinic" icon={UsersRound} tone="blue" />
        <Metric label="Seen today" value={seen.length} detail={`${seen.filter((p) => p.visit?.outcome === 'Admitted').length} admitted`} icon={CheckCircle2} tone="coral" />
      </div>

      <Panel title="Consultation rooms">
        <div className="opd-rooms">
          {rooms.map((room) => {
            const occupant = withDoctor.find((p) => p.visit?.room === room)
            return (
              <article key={room} className={`opd-room ${occupant ? 'busy' : ''}`}>
                <header><DoorOpen size={16} /><b>{room}</b><Chip tone={occupant ? 'warning' : 'success'}>{occupant ? 'In use' : 'Free'}</Chip></header>
                {occupant ? <>
                  <PersonCell name={occupant.name} detail={`${occupant.visit!.queueNo} · ${occupant.assignedTo}`} onClick={() => setSelectedPatientId(occupant.id)} />
                  {isDoctor && <Button size="sm" icon={CheckCircle2} onClick={() => setFinishing(occupant)}>Finish visit</Button>}
                </> : <p className="muted-text">{waiting.length ? `Next: ${waiting[0].visit!.queueNo}` : 'No one waiting'}</p>}
              </article>
            )
          })}
        </div>
      </Panel>

      <Panel title="Queue">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>No.</th><th>Patient</th><th>Triage</th><th>Reason</th><th>Billing</th><th className="num">Waiting</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {queue.map((patient) => (
                <tr key={patient.id} className={patient.visit?.opd === 'With doctor' ? 'is-active-row' : ''}>
                  <td><b className="mono opd-token">{patient.visit!.queueNo}</b></td>
                  <td><PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.age} y ${patient.sex[0]}`} onClick={() => setSelectedPatientId(patient.id)} /></td>
                  <td><EsiBadge level={patient.esi} compact />{patient.vitals.hr > 0 && <small className="mono">HR {patient.vitals.hr} · BP {patient.vitals.bpSys}/{patient.vitals.bpDia} · T {patient.vitals.temp}</small>}</td>
                  <td className="wrap">{patient.complaint}</td>
                  <td><Chip tone={BILLING_TONE[patient.visit!.billing]}>{patient.visit!.billing === 'Covered' ? patient.visit!.payer : patient.visit!.billing}</Chip></td>
                  <td className="num mono">{minutesSince(patient.visit!.checkedInAt, now)} min<small>in {formatTime(patient.visit!.checkedInAt)}</small></td>
                  <td className="row-actions">
                    {patient.visit?.opd === 'With doctor' ? <><Chip tone="accent">{patient.visit.room}</Chip>{isDoctor && <Button size="sm" icon={CheckCircle2} onClick={() => setFinishing(patient)}>Finish</Button>}</>
                      : canCall && <Button size="sm" icon={DoorOpen} disabled={!freeRoom} title={freeRoom ? `Call into ${freeRoom}` : 'All rooms are in use'} onClick={() => { opdCall(patient.id, freeRoom!); if (isDoctor) setSelectedPatientId(patient.id) }}>{freeRoom ? `Call to ${freeRoom}` : 'Rooms full'}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {queue.length === 0 && <EmptyState icon={Hourglass} title="No one waiting" text={atTriage.length ? `${atTriage.length} patient${atTriage.length > 1 ? 's are' : ' is'} at reception or triage for this clinic.` : 'Patients appear here after reception and triage.'} />}
        {atTriage.length > 0 && queue.length > 0 && <p className="table-footnote">{atTriage.length} more at reception or triage: {atTriage.map((p) => `${p.visit!.queueNo} (${p.status === 'awaiting-payment' ? 'paying' : 'triage'})`).join(', ')}.</p>}
      </Panel>

      {seen.length > 0 && (
        <Panel title="Seen today">
          <div className="table-wrap"><table className="data-table compact">
            <thead><tr><th>No.</th><th>Patient</th><th>Outcome</th><th>Doctor</th></tr></thead>
            <tbody>{seen.map((p) => <tr key={p.id}><td className="mono">{p.visit!.queueNo}</td><td><PersonCell name={p.name} detail={p.mrn} onClick={() => setSelectedPatientId(p.id)} /></td><td><Chip tone={p.visit?.outcome === 'Admitted' ? 'warning' : 'success'}>{p.visit?.outcome ?? 'Seen'}</Chip></td><td>{p.assignedTo}</td></tr>)}</tbody>
          </table></div>
        </Panel>
      )}

      {finishing && <FinishVisitModal patient={finishing} onClose={() => setFinishing(null)} />}
    </motion.div>
  )
}

function FinishVisitModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { state, opdFinish } = useHospital()
  const clinics = opdDepartments(state.departments).filter((d) => d.id !== patient.visit?.department)
  const [kind, setKind] = useState<OpdOutcome['kind']>('Home')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
  const [refer, setRefer] = useState<DepartmentId>(clinics[0]?.id ?? 'internal-medicine')
  const [prescribing, setPrescribing] = useState(false)
  const [error, setError] = useState('')
  const options: Array<[OpdOutcome['kind'], string, typeof Home]> = [['Home', 'Send home', Home], ['Follow-up', 'Home with follow-up', CalendarCheck], ['Admit', 'Admit to ward', BedDouble], ['Refer', 'Send to another clinic', Send]]

  const submit = () => {
    if ((kind === 'Admit' || kind === 'Refer') && note.trim().length < 4) { setError(kind === 'Admit' ? 'Give the reason for admission.' : 'Say what you want the other clinic to look at.'); return }
    if (kind === 'Follow-up' && !date) { setError('Choose the follow-up date.'); return }
    opdFinish(patient.id, kind === 'Refer' ? { kind, department: refer, note: note.trim() } : { kind, note: note.trim(), date: kind === 'Follow-up' ? date : undefined })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Finish visit · ${patient.name}`} subtitle={`${patient.visit?.queueNo} · ${patient.complaint}`} size="md">
      <div className="outcome-grid" role="radiogroup" aria-label="Visit outcome">
        {options.map(([value, label, Icon]) => <button key={value} type="button" role="radio" aria-checked={kind === value} className={`outcome ${kind === value ? 'on' : ''}`} onClick={() => { setKind(value); setError('') }}><Icon size={18} />{label}</button>)}
      </div>
      {kind === 'Follow-up' && <label className="form-field"><span>Come back on</span><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></label>}
      {kind === 'Refer' && <label className="form-field"><span>Clinic</span><select value={refer} onChange={(e) => setRefer(e.target.value as DepartmentId)}>{clinics.map((d) => <option key={d.id} value={d.id}>{d.name} OPD</option>)}</select></label>}
      {kind === 'Admit' && <p className="record-hint"><BedDouble size={13} /> {patient.visit && patient.visit.billing !== 'Covered' && patient.visit.payer === 'Self-pay' ? 'The patient pays the admission deposit at reception, then goes to the ward.' : `Covered by ${patient.visit?.payer} — the patient goes straight to the ward.`}</p>}
      <label className="form-field"><span>{kind === 'Admit' ? 'Reason for admission' : kind === 'Refer' ? 'Question for the other clinic' : 'Summary and advice'}{(kind === 'Admit' || kind === 'Refer') && <b> *</b>}</span><textarea rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError('') }} placeholder={kind === 'Home' || kind === 'Follow-up' ? 'Diagnosis, treatment given, advice, when to come back sooner' : ''} /></label>
      {(kind === 'Home' || kind === 'Follow-up') && <div className="card-action-row"><Button size="sm" variant="secondary" icon={QrCode} onClick={() => setPrescribing(true)}>e-Prescribe take-home medicines</Button></div>}
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={kind === 'Admit' ? BedDouble : kind === 'Refer' ? Send : CheckCircle2} onClick={submit}>{kind === 'Admit' ? 'Admit' : kind === 'Refer' ? 'Send' : 'Finish visit'}</Button></div>
      <EPrescribeModal open={prescribing} onClose={() => setPrescribing(false)} patientId={patient.id} takeHomeDefault />
      <span className="sr-only"><UserRound size={1} /></span>
    </Modal>
  )
}
