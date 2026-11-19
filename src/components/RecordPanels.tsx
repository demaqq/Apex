import { useState } from 'react'
import { AlertTriangle, BellRing, FileCheck2, HeartPulse, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { EXAM_SYSTEMS, ICD10, newsResponse, newsTone, observationFlags, patientAlerts, patientNews2 } from '../lib/clinical'
import { formatDate, formatDateTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import { specialtyFor } from '../lib/specialty'
import type { Consciousness, DischargeSummary, Evaluation, ObservationContext, Patient, Vitals } from '../types'
import { OBSERVATION_CONTEXTS } from '../types'
import { Button, Chip } from './ui'

/* ---------------- Alerts ---------------- */

export function AlertsBox({ patient }: { patient: Patient }) {
  const { state } = useHospital()
  const alerts = patientAlerts(patient, state.orders)
  if (!alerts.length) return null
  return (
    <section className="record-alerts" aria-label="Clinical alerts">
      {alerts.map((alert, index) => <p key={index} className={alert.tone}><AlertTriangle size={14} />{alert.text}</p>)}
    </section>
  )
}

/* ---------------- Observations and NEWS2 ---------------- */

const empty = { hr: '', rr: '', spo2: '', bpSys: '', bpDia: '', temp: '', gcs: '15', pain: '0' }

export function ObservationsPanel({ patient }: { patient: Patient }) {
  const { can, profile, recordObservations, escalatePatient } = useHospital()
  const defaultContext: ObservationContext = patient.status === 'awaiting-triage' ? 'Triage' : ['physician', 'consultant', 'intern'].includes(profile?.id ?? '') ? 'Ward round' : patient.encounterType === 'outpatient' ? 'Clinic' : 'Bedside'
  const [context, setContext] = useState<ObservationContext>(defaultContext)
  const [form, setForm] = useState<Record<keyof Vitals, string>>(empty)
  const [onOxygen, setOnOxygen] = useState(false)
  const [consciousness, setConsciousness] = useState<Consciousness>('Alert')
  const [error, setError] = useState('')
  const score = patientNews2(patient)
  const history = patient.observations ?? []
  const child = patient.age < 12

  const save = () => {
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])) as unknown as Vitals
    const missing = (['hr', 'rr', 'spo2', 'bpSys', 'bpDia', 'temp'] as const).filter((key) => !form[key])
    if (missing.length) { setError('Enter heart rate, respiratory rate, SpO₂, blood pressure and temperature.'); return }
    if (values.spo2 > 100 || values.spo2 < 50 || values.hr < 20 || values.hr > 250 || values.temp < 30 || values.temp > 43) { setError('One of the values is outside a plausible range. Check and re-enter.'); return }
    recordObservations(patient.id, values, onOxygen, consciousness, context)
    setForm(empty); setOnOxygen(false); setConsciousness('Alert'); setError('')
  }

  return (
    <>
      {score && patient.vitals.hr > 0 && (
        <section className={`news-card tone-${newsTone(score.score)}`}>
          <div><span>NEWS2</span><strong>{score.score}</strong><small>{score.band} risk</small></div>
          <p>{newsResponse(score)}{score.detail.length ? <small>Scoring: {score.detail.join(' · ')}</small> : null}</p>
          {(score.score >= 5 || score.redFlag) && !patient.escalation && can('vitals') && <Button size="sm" variant="danger" icon={BellRing} onClick={() => escalatePatient(patient.id)}>Escalate to doctor</Button>}
          {patient.escalation && <Chip tone="warning">Escalated {formatDateTime(patient.escalation.at)}</Chip>}
        </section>
      )}
      {child && <p className="record-hint">Paediatric limits applied: heart rate above 150 or respiratory rate above 30 is flagged. NEWS2 is not used under 16.{patient.weightKg ? ` Weight ${patient.weightKg} kg — calculate doses per kg.` : ''}</p>}

      <section className="drawer-section">
        <div className="section-label"><HeartPulse size={15} />Observation log<span>{history.length} sets</span></div>
        <div className="table-wrap">
          <table className="data-table compact">
            <thead><tr><th>Time</th><th>Taken at</th><th className="num">HR</th><th className="num">BP</th><th className="num">RR</th><th className="num">SpO₂</th><th className="num">Temp</th><th>Level</th><th className="num">NEWS2</th></tr></thead>
            <tbody>
              {history.map((set) => {
                const flags = observationFlags(set, patient.age).join(' ')
                const value = patient.age >= 16 ? patientNews2({ ...patient, vitals: set, observations: [set] })?.score : undefined
                const bad = (text: string) => flags.includes(text) ? 'danger-text' : ''
                return (
                  <tr key={set.at}>
                    <td><b>{formatDateTime(set.at)}</b><small>{set.by}</small></td>
                    <td>{set.context ?? 'Bedside'}</td>
                    <td className={`num ${bad('HR')}`}>{set.hr}</td>
                    <td className={`num ${bad('BP')}`}>{set.bpSys}/{set.bpDia}</td>
                    <td className={`num ${bad('RR')}`}>{set.rr}</td>
                    <td className={`num ${bad('SpO₂')}`}>{set.spo2}%{set.onOxygen ? ' O₂' : ''}</td>
                    <td className={`num ${bad('T ')}`}>{set.temp}</td>
                    <td>{set.consciousness}</td>
                    <td className="num">{value !== undefined ? <Chip tone={newsTone(value)}>{value}</Chip> : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {history.length === 0 && <p className="record-hint">No observation sets recorded on this episode.</p>}
      </section>

      {can('vitals') && patient.status !== 'discharged' && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Record observations</div>
          <div className="segmented small obs-context" role="radiogroup" aria-label="Where these observations were taken">
            {OBSERVATION_CONTEXTS.map((item) => <button key={item} type="button" role="radio" aria-checked={context === item} className={context === item ? 'on' : ''} onClick={() => setContext(item)}>{item}</button>)}
          </div>
          <div className="form-grid obs-form">
            {([['hr', 'Heart rate', '/min'], ['rr', 'Resp. rate', '/min'], ['spo2', 'SpO₂', '%'], ['bpSys', 'Systolic BP', 'mmHg'], ['bpDia', 'Diastolic BP', 'mmHg'], ['temp', 'Temperature', '°C'], ['gcs', 'GCS', '/15'], ['pain', 'Pain', '/10']] as Array<[keyof Vitals, string, string]>).map(([key, label, unit]) => (
              <label key={key} className="form-field"><span>{label} <small className="muted-text">{unit}</small></span><input type="number" step={key === 'temp' ? 0.1 : 1} value={form[key]} onChange={(event) => { setForm({ ...form, [key]: event.target.value }); setError('') }} /></label>
            ))}
            <label className="form-field"><span>Level of consciousness</span><select value={consciousness} onChange={(event) => setConsciousness(event.target.value as Consciousness)}>{(['Alert', 'New confusion', 'Voice', 'Pain', 'Unresponsive'] as Consciousness[]).map((level) => <option key={level}>{level}</option>)}</select></label>
            <label className="remember-row obs-oxygen"><input type="checkbox" checked={onOxygen} onChange={(event) => setOnOxygen(event.target.checked)} />On supplemental oxygen</label>
          </div>
          {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
          <div className="panel-actions"><Button icon={HeartPulse} onClick={save}>Save observations</Button></div>
        </section>
      )}
    </>
  )
}

/* ---------------- Clinical evaluation ---------------- */

export function EvaluationPanel({ patient }: { patient: Patient }) {
  const { saveEvaluation, can } = useHospital()
  const [hpi, setHpi] = useState('')
  const [history, setHistory] = useState({ medical: '', medication: '', family: '', social: '' })
  const [exam, setExam] = useState(EXAM_SYSTEMS.map((system) => ({ system, normal: false, findings: '' })))
  const [ddx, setDdx] = useState<Evaluation['differentials']>([])
  const [condition, setCondition] = useState('')
  const [plan, setPlan] = useState('')
  const [error, setError] = useState('')
  const editable = can('prescribe') || can('refer')

  const addDdx = () => {
    if (!condition.trim()) return
    const code = ICD10.find(([, name]) => name.toLowerCase() === condition.trim().toLowerCase())?.[0]
    setDdx([...ddx, { condition: condition.trim(), icd10: code, working: ddx.length === 0 }]); setCondition('')
  }
  const submit = () => {
    if (hpi.trim().length < 10 || !ddx.length || plan.trim().length < 5) { setError('Write the history, add at least one differential diagnosis and a plan.'); return }
    saveEvaluation(patient.id, { hpi: hpi.trim(), history, exam: exam.filter((item) => item.normal || item.findings.trim()), differentials: ddx, plan: plan.trim() })
    setHpi(''); setHistory({ medical: '', medication: '', family: '', social: '' }); setExam(EXAM_SYSTEMS.map((system) => ({ system, normal: false, findings: '' }))); setDdx([]); setPlan(''); setError('')
  }

  return (
    <>
      {(patient.evaluations ?? []).map((evaluation) => (
        <section key={evaluation.id} className="drawer-section evaluation-view">
          <div className="section-label"><Stethoscope size={15} />Evaluation · {formatDateTime(evaluation.at)}<span>{evaluation.by}</span></div>
          <p><b>History:</b> {evaluation.hpi}</p>
          {evaluation.exam.length > 0 && <p><b>Examination:</b> {evaluation.exam.map((item) => `${item.system}: ${item.normal ? 'normal' : item.findings}`).join('; ')}</p>}
          <p><b>Differentials:</b> {evaluation.differentials.map((item) => <Chip key={item.condition} tone={item.working ? 'accent' : 'neutral'}>{item.working ? 'Working · ' : ''}{item.condition}{item.icd10 ? ` · ${item.icd10}` : ''}</Chip>)}</p>
          <p><b>Plan:</b> {evaluation.plan}</p>
        </section>
      ))}
      {editable && patient.status !== 'discharged' && (
        <section className="drawer-section">
          <div className="section-label"><Stethoscope size={15} />New clinical evaluation</div>
          <p className="record-hint">Current observations: HR {patient.vitals.hr}, BP {patient.vitals.bpSys}/{patient.vitals.bpDia}, RR {patient.vitals.rr}, SpO₂ {patient.vitals.spo2}%, T {patient.vitals.temp}°C. Allergies: {patient.allergies.join(', ')}.</p>
          <label className="form-field"><span>History of presenting illness <b>*</b></span><textarea rows={3} value={hpi} onChange={(event) => setHpi(event.target.value)} /></label>
          <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
            {(['medical', 'medication', 'family', 'social'] as const).map((key) => <label key={key} className="form-field"><span>{key[0].toUpperCase() + key.slice(1)} history</span><input value={history[key]} onChange={(event) => setHistory({ ...history, [key]: event.target.value })} /></label>)}
          </div>
          <div className="exam-grid">
            <span className="detail-heading">Examination by system</span>
            {exam.map((item, index) => (
              <div key={item.system} className="exam-row">
                <label className="remember-row"><input type="checkbox" checked={item.normal} onChange={(event) => setExam(exam.map((row, i) => i === index ? { ...row, normal: event.target.checked } : row))} />{item.system} normal</label>
                {!item.normal && <input aria-label={`${item.system} findings`} placeholder="Findings" value={item.findings} onChange={(event) => setExam(exam.map((row, i) => i === index ? { ...row, findings: event.target.value } : row))} />}
              </div>
            ))}
          </div>
          <span className="detail-heading">Differential diagnosis <b className="danger-text">*</b></span>
          {ddx.map((item, index) => (
            <div key={item.condition} className="ddx-row">
              <label className="remember-row"><input type="radio" name="working" checked={item.working} onChange={() => setDdx(ddx.map((row, i) => ({ ...row, working: i === index })))} />{item.condition}{item.icd10 && <span className="mono muted-text"> {item.icd10}</span>}</label>
              <button type="button" className="icon-button" aria-label={`Remove ${item.condition}`} onClick={() => setDdx(ddx.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
            </div>
          ))}
          <div className="ddx-add">
            <input list="icd10-list" value={condition} onChange={(event) => setCondition(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addDdx() } }} placeholder="Condition (type to search ICD-10)" aria-label="Differential diagnosis" />
            <datalist id="icd10-list">{ICD10.map(([code, name]) => <option key={code} value={name}>{code}</option>)}</datalist>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addDdx}>Add</Button>
          </div>
          <label className="form-field" style={{ marginTop: 12 }}><span>Plan <b>*</b></span><textarea rows={3} value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Investigations, treatment, monitoring and follow-up" /></label>
          {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
          <div className="panel-actions"><Button icon={FileCheck2} onClick={submit}>Save evaluation</Button></div>
        </section>
      )}
    </>
  )
}

/* ---------------- Discharge ---------------- */

export function DischargePanel({ patient }: { patient: Patient }) {
  const { state, profile, can, dischargeWithSummary, generateInvoice, scheduleAppointment } = useHospital()
  const medicines = state.prescriptions.filter((rx) => rx.patientId === patient.id && rx.status !== 'Cancelled').flatMap((rx) => rx.items.map((item) => `${state.formulary.find((med) => med.id === item.medicationId)?.name ?? 'Medicine'} ${item.dosage} ${item.frequency}`))
  const hasInvoice = state.invoices.some((invoice) => invoice.patientId === patient.id)
  const [diagnosis, setDiagnosis] = useState(patient.complaint)
  const [condition, setCondition] = useState<DischargeSummary['condition'] | ''>('')
  const [course, setCourse] = useState('')
  const [decisions, setDecisions] = useState(medicines.map((name) => ({ name, decision: 'Continue' as DischargeSummary['medicines'][number]['decision'], note: '' })))
  const [newMedicines, setNewMedicines] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [followUpDate, setFollowUpDate] = useState(new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
  const [instructions, setInstructions] = useState('')
  const [bookFollowUp, setBookFollowUp] = useState(true)
  const [autoInvoice, setAutoInvoice] = useState(!hasInvoice)
  const [error, setError] = useState('')

  if (patient.discharge) {
    const summary = patient.discharge
    return (
      <section className="drawer-section evaluation-view">
        <div className="section-label"><FileCheck2 size={15} />Discharge summary<span>{formatDate(summary.at)}</span></div>
        <p><b>Final diagnosis:</b> {summary.diagnosis}</p>
        <p><b>Condition at discharge:</b> {summary.condition}</p>
        <p><b>Hospital course:</b> {summary.course}</p>
        <p><b>Medicines:</b> {summary.medicines.length ? summary.medicines.map((med) => <Chip key={med.name} tone={med.decision === 'Stop' ? 'warning' : 'success'}>{med.decision} · {med.name}{med.note ? ` (${med.note})` : ''}</Chip>) : 'No inpatient medicines.'}</p>
        {summary.newMedicines && <p><b>New medicines to take home:</b> {summary.newMedicines}</p>}
        <p><b>Follow-up:</b> {summary.followUp} on {formatDate(summary.followUpDate)}. {summary.instructions}</p>
        <p className="record-hint">Signed by {summary.by}</p>
        {!hasInvoice && (can('billing') || can('discharge')) && (
          <div className="panel-actions"><Button size="sm" variant="secondary" onClick={() => generateInvoice(patient.id)}>Generate episode invoice</Button></div>
        )}
      </section>
    )
  }
  if (!can('discharge') || patient.status === 'discharged') return <p className="record-hint">The discharge summary is completed by the treating doctor.</p>

  const submit = () => {
    if (!condition || course.trim().length < 10 || !followUp.trim()) { setError('Choose the condition at discharge, describe the hospital course and give follow-up arrangements.'); return }
    dischargeWithSummary(patient.id, { diagnosis: diagnosis.trim(), condition, course: course.trim(), medicines: decisions, newMedicines: newMedicines.trim(), followUp: followUp.trim(), followUpDate, instructions: instructions.trim() })
    if (bookFollowUp && followUpDate) {
      const startsAt = new Date(`${followUpDate}T09:30:00`).toISOString()
      scheduleAppointment({
        patientId: patient.id,
        department: patient.department,
        clinician: profile?.name ?? patient.assignedTo,
        startsAt,
        durationMinutes: 30,
        mode: 'In person',
        reason: `Post-discharge follow-up: ${followUp.trim()} (${diagnosis.trim() || patient.complaint})`,
      })
    }
    if (autoInvoice && !hasInvoice) generateInvoice(patient.id)
  }

  return (
    <section className="drawer-section">
      <div className="section-label"><FileCheck2 size={15} />Discharge summary</div>
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Final diagnosis</span><input value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></label>
        <label className="form-field"><span>Condition at discharge <b>*</b></span><select value={condition} onChange={(event) => setCondition(event.target.value as DischargeSummary['condition'])}><option value="">Choose…</option>{['Recovered', 'Improved', 'Stable', 'Unchanged'].map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label className="form-field" style={{ marginTop: 12 }}><span>Hospital course <b>*</b></span><textarea rows={3} value={course} onChange={(event) => setCourse(event.target.value)} /></label>
      <span className="detail-heading">Medication reconciliation</span>
      {decisions.length === 0 && <p className="record-hint">No inpatient medicines to reconcile.</p>}
      {decisions.map((med, index) => (
        <div key={med.name + index} className="med-rec-row">
          <span>{med.name}</span>
          <select aria-label={`Decision for ${med.name}`} value={med.decision} onChange={(event) => setDecisions(decisions.map((row, i) => i === index ? { ...row, decision: event.target.value as typeof med.decision } : row))}>{['Continue', 'Change', 'Stop'].map((value) => <option key={value}>{value}</option>)}</select>
          <input aria-label={`Note for ${med.name}`} placeholder="New dose or reason" value={med.note} onChange={(event) => setDecisions(decisions.map((row, i) => i === index ? { ...row, note: event.target.value } : row))} />
        </div>
      ))}
      <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
        <label className="form-field span-2"><span>New medicines to take home</span><input value={newMedicines} onChange={(event) => setNewMedicines(event.target.value)} /></label>
        <label className="form-field"><span>Follow-up with <b>*</b></span><input value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="e.g. Cardiology clinic" /></label>
        <label className="form-field"><span>Follow-up date</span><input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></label>
        <label className="form-field span-2"><span>Instructions for the patient</span><input value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Warning signs, activity, diet" /></label>
      </div>
      <div className="discharge-handoff-options">
        <label className="remember-row"><input type="checkbox" checked={bookFollowUp} onChange={(event) => setBookFollowUp(event.target.checked)} />Book follow-up visit in clinic schedule</label>
        {!hasInvoice && <label className="remember-row"><input type="checkbox" checked={autoInvoice} onChange={(event) => setAutoInvoice(event.target.checked)} />Generate episode invoice for billing</label>}
      </div>
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="panel-actions"><Button icon={FileCheck2} onClick={submit}>Sign and discharge</Button></div>
    </section>
  )
}

export function AssessmentPanel({ patient }: { patient: Patient }) {
  const { can, saveAssessment } = useHospital()
  const { config, latest, chips, alerts } = specialtyFor(patient)
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(latest?.values ?? {}) }))
  const [error, setError] = useState('')
  if (!config) return null
  const editable = (can('prescribe') || can('vitals') || can('refer')) && patient.status !== 'discharged'
  const save = () => {
    const missing = config.fields.filter((field) => field.required && !values[field.key]?.trim())
    if (missing.length) { setError(`Complete: ${missing.map((field) => field.label).join(', ')}.`); return }
    const outOfRange = config.fields.find((field) => field.type === 'number' && values[field.key] && ((field.min !== undefined && Number(values[field.key]) < field.min) || (field.max !== undefined && Number(values[field.key]) > field.max)))
    if (outOfRange) { setError(`${outOfRange.label} must be between ${outOfRange.min} and ${outOfRange.max}.`); return }
    const problem = config.check?.(values)
    if (problem) { setError(problem); return }
    saveAssessment(patient.id, values, config.summary(values)); setError('')
  }
  return (
    <>
      {latest && (
        <section className="drawer-section">
          <div className="section-label"><Stethoscope size={15} />{config.title}<span>{formatDateTime(latest.at)} · {latest.by}</span></div>
          <p>{chips.map(([label, tone]) => <Chip key={label} tone={tone}>{label}</Chip>)}</p>
          {alerts.length > 0 && <div className="record-alerts" style={{ marginTop: 10 }}>{alerts.map((alert) => <p key={alert} className="warning"><AlertTriangle size={14} />{alert}</p>)}</div>}
        </section>
      )}
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />{latest ? 'Update assessment' : `New ${config.title.toLowerCase()}`}</div>
          <div className="form-grid obs-form">
            {config.fields.map((field) => (
              <label key={field.key} className={`form-field ${field.type === 'text' ? 'span-2' : ''}`}>
                <span>{field.label}{field.required && <b> *</b>}</span>
                {field.type === 'select'
                  ? <select value={values[field.key] ?? ''} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}><option value="">Choose…</option>{field.options!.map((option) => <option key={option}>{option}</option>)}</select>
                  : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} min={field.min} max={field.max} value={values[field.key] ?? ''} onChange={(event) => { setValues({ ...values, [field.key]: event.target.value }); setError('') }} />}
              </label>
            ))}
          </div>
          {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
          <div className="panel-actions"><Button icon={FileCheck2} onClick={save}>Save assessment</Button></div>
        </section>
      )}
    </>
  )
}
