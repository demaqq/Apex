import { useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, ClipboardCheck, ClipboardList, FlaskConical, HeartPulse, NotebookPen, Stethoscope, UserRound } from 'lucide-react'
import { EXAM_SYSTEMS, news2, newsTone } from '../lib/clinical'
import { formatDateTime, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import { gradeById } from '../lib/grades'
import type { Consciousness, NoteReview, Patient, RoundKind, RoundNote, Vitals } from '../types'
import { Button, Chip } from './ui'

const DAY = 86_400_000
const hospitalDay = (patient: Patient, at: string) => {
  const start = new Date(patient.arrival); start.setHours(0, 0, 0, 0)
  return Math.floor((new Date(at).getTime() - start.getTime()) / DAY) + 1
}

const NURSE_KINDS: RoundKind[] = ['Bedside assessment', 'Nurse round', 'Senior nurse assessment', 'Junior nurse assessment', 'Intern nurse assessment']
const isNursing = (kind?: RoundKind) => Boolean(kind && NURSE_KINDS.includes(kind))
/** Note types each role can write; the first is the default. */
const KINDS_FOR: Record<string, RoundKind[]> = {
  intern: ['Intern assessment', 'Resident round'],
  physician: ['Ward round', 'Resident round'],
  consultant: ['Consultant review', 'Ward round'],
  nurse: NURSE_KINDS,
}
const NEEDS_REVIEW: Partial<Record<RoundKind, string>> = { 'Junior nurse assessment': 'senior nurse', 'Intern nurse assessment': 'senior nurse' }
const SYMPTOMS = ['Pain', 'Fever / rigors', 'Breathless', 'Cough', 'Chest pain', 'Nausea / vomiting', 'Not eating', 'Not drinking', 'Low urine output', 'Bowels not open', 'Diarrhoea', 'Confused', 'Headache', 'Bleeding', 'Wound concern', 'Poor sleep']
const NURSING: Array<{ key: string; label: string; options: string[] }> = [
  { key: 'pressure', label: 'Pressure areas', options: ['Intact', 'Red, blanching', 'Broken skin'] },
  { key: 'cannula', label: 'IV cannula site', options: ['No cannula', 'Healthy', 'Red / phlebitis', 'Removed'] },
  { key: 'mobility', label: 'Mobility', options: ['Independent', 'Needs help', 'Bed-bound'] },
  { key: 'intake', label: 'Eating and drinking', options: ['Well', 'Poor', 'Nil by mouth', 'Tube feeding'] },
  { key: 'continence', label: 'Continence', options: ['Continent', 'Catheter', 'Incontinent'] },
  { key: 'falls', label: 'Fall risk', options: ['Low', 'High — precautions in place'] },
  { key: 'hygiene', label: 'Personal care', options: ['Independent', 'Assisted', 'Full care'] },
]
const VITAL_FIELDS: Array<[keyof Vitals, string, string, number?]> = [['hr', 'Heart rate', '/min'], ['rr', 'Resp. rate', '/min'], ['spo2', 'SpO₂', '%'], ['bpSys', 'Systolic BP', 'mmHg'], ['bpDia', 'Diastolic BP', 'mmHg'], ['temp', 'Temp', '°C', 0.1], ['gcs', 'GCS', '/15'], ['pain', 'Pain', '/10']]
const blankVitals: Record<keyof Vitals, string> = { hr: '', rr: '', spo2: '', bpSys: '', bpDia: '', temp: '', gcs: '15', pain: '0' }


export function RoundsView({ patient }: { patient: Patient }) {
  const { state, profile, currentRole, grade, level, myRank, saveRound, reviewRound } = useHospital()
  const rounds = patient.rounds ?? []
  const canRound = ['physician', 'consultant', 'intern', 'nurse'].includes(currentRole ?? '') && patient.status !== 'discharged'
  const today = hospitalDay(patient, new Date().toISOString())
  const seenToday = rounds.some((item) => hospitalDay(patient, item.at) === today && !isNursing(item.kind))
  const bedsideToday = rounds.some((item) => hospitalDay(patient, item.at) === today && isNursing(item.kind))
  const pendingCount = rounds.filter((item) => item.cosign === 'Pending review').length
  const [filter, setFilter] = useState<'All' | 'Doctors' | 'Nursing' | 'Awaiting review'>('All')
  const shown = rounds.filter((item) => filter === 'All' || (filter === 'Nursing' ? isNursing(item.kind) : filter === 'Doctors' ? !isNursing(item.kind) : item.cosign === 'Pending review'))
  const nurseKind: RoundKind | undefined = currentRole === 'nurse' && level ? ({ 'Student nurse': 'Intern nurse assessment', 'Intern nurse': 'Intern nurse assessment', 'Junior nurse': 'Junior nurse assessment', 'Staff nurse': 'Bedside assessment', 'Senior nurse': 'Bedside assessment', 'Nurse educator': 'Bedside assessment' } as Record<string, RoundKind>)[level] : undefined
  const kinds = (currentRole !== 'nurse' && grade ? gradeById(grade.grade)?.rounds : undefined) ?? (nurseKind ? [nurseKind, ...NURSE_KINDS.filter((kind) => kind !== nurseKind)] : undefined) ?? KINDS_FOR[currentRole ?? ''] ?? ['Ward round']

  return (
    <>
      <div className="round-status">
        <span className={seenToday ? 'ok' : 'due'}><Stethoscope size={14} />{seenToday ? 'Seen on a round today' : 'Not yet seen on a round today'}</span>
        <span className={bedsideToday ? 'ok' : 'due'}><HeartPulse size={14} />{bedsideToday ? 'Bedside assessment done today' : 'Bedside assessment due'}</span>
        {pendingCount > 0 && <span className="due"><BadgeCheck size={14} />{pendingCount} awaiting senior review</span>}
        <span><ClipboardList size={14} />Day {today} of stay</span>
      </div>
      {canRound && <RoundForm key={`${patient.id}-${currentRole}-${grade?.grade ?? ''}-${level ?? ''}`} patient={patient} kinds={kinds} onSave={saveRound} onReview={reviewRound} today={today} author={profile?.name ?? ''} orders={state.orders.filter((order) => order.patientId === patient.id)} />}
      <section className="drawer-section">
        <div className="section-label"><ClipboardList size={15} />Rounds and assessments<span>{rounds.length} entries</span></div>
        {rounds.length > 0 && <div className="segmented small chart-seg">{(['All', 'Doctors', 'Nursing', 'Awaiting review'] as const).map((kind) => <button key={kind} type="button" className={filter === kind ? 'on' : ''} onClick={() => setFilter(kind)}>{kind}{kind === 'Awaiting review' && pendingCount ? <small>{pendingCount}</small> : null}</button>)}</div>}
        {shown.length === 0 ? <div className="drawer-empty"><NotebookPen size={25} /><p>{rounds.length ? 'None of this type yet.' : 'No rounds or bedside assessments documented yet.'}</p></div> : (
          <ol className="round-list">{shown.map((item) => <RoundCard key={item.id} patient={patient} item={item} me={profile?.name ?? ''} role={currentRole ?? ''} rank={myRank} onReview={reviewRound} />)}</ol>
        )}
      </section>
    </>
  )
}

function canReviewNote(item: RoundNote, role: string, me: string) {
  if (item.by === me) return false
  if (isNursing(item.kind)) return role === 'nurse' && item.cosign === 'Pending review'
  return role === 'consultant' || (role === 'physician' && item.cosign === 'Pending review')
}

function RoundCard({ patient, item, me, role, rank, onReview }: { patient: Patient; item: RoundNote; me: string; role: string; rank: number; onReview: (patientId: string, roundId: string, outcome: NoteReview['outcome'], comment: string) => void }) {
  const [reviewing, setReviewing] = useState(false)
  const [outcome, setOutcome] = useState<NoteReview['outcome']>('Agreed')
  const [comment, setComment] = useState('')
  const set = item.vitals ?? (patient.observations ?? []).find((obs) => obs.context === 'Ward round' && hospitalDay(patient, obs.at) === hospitalDay(patient, item.at))
  const score = set ? news2(set, set.onOxygen, set.consciousness) : null
  const abnormal = item.exam?.filter((row) => !row.normal) ?? []
  return (
    <li className={`kind-${isNursing(item.kind) ? 'nursing' : (item.kind ?? 'Ward round').split(' ')[0].toLowerCase()}`}>
      <header>
        <b>Day {hospitalDay(patient, item.at)}</b>
        <Chip tone="neutral">{item.kind ?? 'Ward round'}</Chip>
        <span className="round-meta">{formatDateTime(item.at)} · {item.by}</span>
        {item.cosign && <Chip tone={item.cosign === 'Co-signed' ? 'success' : 'warning'}>{item.cosign === 'Co-signed' ? <><BadgeCheck size={12} />{item.reviewer === 'Senior nurse' ? 'Reviewed' : 'Co-signed'}</> : `Awaiting ${(item.reviewer ?? 'Senior doctor').toLowerCase()}`}</Chip>}
        <Chip tone={item.status === 'Deteriorating' ? 'danger' : item.status === 'Improving' ? 'success' : 'accent'}>{item.status}</Chip>
      </header>
      {set && <p className="round-obs"><HeartPulse size={13} />HR {set.hr} · BP {set.bpSys}/{set.bpDia} · RR {set.rr} · SpO₂ {set.spo2}%{set.onOxygen ? ' on O₂' : ''} · T {set.temp}°C · GCS {set.gcs} · pain {set.pain}/10{score && patient.age >= 16 ? <Chip tone={newsTone(score.score)}>NEWS2 {score.score}</Chip> : null}</p>}
      <dl>
        {(item.subjective || item.symptoms?.length) ? <><dt>History</dt><dd>{item.subjective}{item.symptoms?.length ? <span className="round-tags">{item.symptoms.map((s) => <i key={s}>{s}</i>)}</span> : null}</dd></> : null}
        {item.exam?.length ? <><dt>Examination</dt><dd>{abnormal.length ? abnormal.map((row) => <span key={row.system} className="exam-line"><b>{row.system}:</b> {row.findings || 'abnormal'}</span>) : null}<span className="muted-text">{item.exam.filter((row) => row.normal).map((row) => row.system).join(', ')}{item.exam.some((row) => row.normal) ? ' — normal' : ''}</span></dd></> : item.examination ? <><dt>Examination</dt><dd>{item.examination}</dd></> : null}
        {item.nursing && Object.keys(item.nursing).length > 0 && <><dt>Nursing checks</dt><dd className="round-tags">{Object.entries(item.nursing).map(([key, value]) => <i key={key} className={/broken|phlebitis|red|bed-bound|poor|nil|high|incontinent/i.test(value) ? 'warn' : ''}>{NURSING.find((n) => n.key === key)?.label}: {value}</i>)}</dd></>}
        {item.resultsReviewed?.length ? <><dt>Results reviewed</dt><dd>{item.resultsReviewed.join(' · ')}</dd></> : null}
        <dt>Assessment</dt><dd>{item.assessment}</dd>
        <dt>Plan</dt><dd>{item.plan}</dd>
      </dl>
      {item.reviews?.length ? <ul className="note-reviews">{item.reviews.map((review) => <li key={review.at} className={review.outcome === 'Amended' ? 'amended' : ''}><BadgeCheck size={14} /><div><b>{review.role} · {review.by}</b> <span>{review.outcome}{review.comment ? ` — ${review.comment}` : ''}</span><small>{formatDateTime(review.at)}</small></div></li>)}</ul> : null}
      {canReviewNote(item, role, me) && (isNursing(item.kind) || item.cosign !== 'Pending review' || rank > (item.authorRank ?? 1)) && !reviewing && <div className="card-action-row"><Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => setReviewing(true)}>{item.cosign === 'Pending review' ? (isNursing(item.kind) ? 'Review as senior nurse' : 'Review and co-sign') : 'Add consultant review'}</Button></div>}
      {reviewing && (
        <div className="review-box">
          <div className="segmented small" role="radiogroup" aria-label="Review outcome">{(['Agreed', 'Amended'] as const).map((o) => <button key={o} type="button" role="radio" aria-checked={outcome === o} className={outcome === o ? 'on' : ''} onClick={() => setOutcome(o)}>{o === 'Agreed' ? 'Agree with plan' : 'Plan amended'}</button>)}</div>
          <textarea rows={2} aria-label="Review comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={outcome === 'Amended' ? 'What changes and why' : 'Optional comment, teaching point'} />
          <div className="card-action-row"><Button size="sm" variant="ghost" onClick={() => setReviewing(false)}>Cancel</Button><Button size="sm" icon={BadgeCheck} disabled={outcome === 'Amended' && !comment.trim()} onClick={() => { onReview(patient.id, item.id, outcome, comment.trim()); setReviewing(false); setComment('') }}>Save review</Button></div>
        </div>
      )}
    </li>
  )
}

function RoundForm({ patient, kinds, onSave, onReview, today, author, orders }: { patient: Patient; kinds: RoundKind[]; onSave: (id: string, round: Omit<RoundNote, 'id' | 'at' | 'by'>) => void; onReview: (patientId: string, roundId: string, outcome: NoteReview['outcome'], comment: string) => void; today: number; author: string; orders: Array<{ id: string; title: string; result?: string; status: string; createdAt: string; kind: string }> }) {
  const [kind, setKind] = useState<RoundKind>(kinds[0])
  const pendingDoctorNotes = (patient.rounds ?? []).filter((item) => item.cosign === 'Pending review' && !isNursing(item.kind) && item.by !== author)
  const [cosignIds, setCosignIds] = useState<string[]>(() => pendingDoctorNotes.map((item) => item.id))
  const [subjective, setSubjective] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [vitals, setVitals] = useState(blankVitals)
  const [onOxygen, setOnOxygen] = useState(false)
  const [consciousness, setConsciousness] = useState<Consciousness>('Alert')
  const [exam, setExam] = useState<Record<string, { normal: boolean | null; findings: string }>>({})
  const [nursing, setNursing] = useState<Record<string, string>>({})
  const [reviewed, setReviewed] = useState<string[]>([])
  const [assessment, setAssessment] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState<RoundNote['status']>('Stable')
  const [error, setError] = useState('')
  const bedside = isNursing(kind)

  const results = useMemo(() => orders.filter((order) => (order.result && Date.now() - new Date(order.createdAt).getTime() < 4 * DAY) || order.status !== 'completed').slice(0, 10), [orders])
  const filledVitals = (['hr', 'rr', 'spo2', 'bpSys', 'bpDia', 'temp'] as const).every((key) => vitals[key] !== '')
  const anyVitals = (['hr', 'rr', 'spo2', 'bpSys', 'bpDia', 'temp'] as const).some((key) => vitals[key] !== '')
  const numericVitals = Object.fromEntries(Object.entries(vitals).map(([k, v]) => [k, Number(v)])) as unknown as Vitals
  const preview = filledVitals && patient.age >= 16 ? news2(numericVitals, onOxygen, consciousness) : null
  const latest = patient.observations?.[0]
  const examDone = EXAM_SYSTEMS.filter((system) => exam[system]?.normal !== null && exam[system]?.normal !== undefined).length

  const steps = [
    { label: 'History', done: Boolean(subjective.trim() || symptoms.length) },
    { label: 'Vitals', done: filledVitals },
    { label: bedside ? 'Checks' : 'Exam', done: bedside ? Object.keys(nursing).length >= 3 : examDone > 0 },
    { label: 'Results', done: reviewed.length > 0 || results.length === 0 },
    { label: 'Plan', done: Boolean(assessment.trim() && plan.trim()) },
  ]

  const save = () => {
    if (anyVitals && !filledVitals) { setError('Complete the vital signs (heart rate, breathing, SpO₂, BP, temperature) or clear them.'); return }
    if (filledVitals && (numericVitals.spo2 > 100 || numericVitals.spo2 < 50 || numericVitals.hr < 20 || numericVitals.hr > 250 || numericVitals.temp < 30 || numericVitals.temp > 43)) { setError('A vital sign is outside a plausible range — check it.'); return }
    if (!assessment.trim() || !plan.trim()) { setError('Add an assessment and a plan.'); return }
    const examRows = EXAM_SYSTEMS.filter((system) => exam[system] && exam[system].normal !== null).map((system) => ({ system, normal: Boolean(exam[system].normal), findings: exam[system].findings.trim() }))
    const abnormal = examRows.filter((row) => !row.normal)
    onSave(patient.id, {
      kind, subjective: subjective.trim(), symptoms,
      vitals: filledVitals ? { ...numericVitals, onOxygen, consciousness } : undefined,
      exam: examRows.length ? examRows : undefined,
      examination: abnormal.length ? abnormal.map((row) => `${row.system}: ${row.findings || 'abnormal'}`).join('; ') : examRows.length ? 'Examination unremarkable' : '',
      nursing: bedside && Object.keys(nursing).length ? nursing : undefined,
      resultsReviewed: reviewed.length ? reviewed : undefined,
      assessment: assessment.trim(), plan: plan.trim(), status,
    })
    if (kind === 'Consultant review') cosignIds.forEach((id) => onReview(patient.id, id, 'Agreed', 'Reviewed on the consultant round.'))
    setSubjective(''); setSymptoms([]); setVitals(blankVitals); setOnOxygen(false); setConsciousness('Alert'); setExam({}); setNursing({}); setReviewed([]); setAssessment(''); setPlan(''); setStatus('Stable'); setError('')
  }

  const setSystem = (system: string, normal: boolean | null) => setExam({ ...exam, [system]: { normal, findings: exam[system]?.findings ?? '' } })

  return (
    <section className="drawer-section round-form">
      <div className="section-label"><NotebookPen size={15} />New {kind.toLowerCase()} · Day {today}</div>
      <div className="segmented chart-seg" role="radiogroup" aria-label="Type of note">{kinds.map((k) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}</div>
      <ol className="round-steps">{steps.map((step, i) => <li key={step.label} className={step.done ? 'done' : ''}><span>{i + 1}</span>{step.label}</li>)}</ol>

      <fieldset className="round-block">
        <legend><UserRound size={14} />1 · History</legend>
        <label className="form-field"><span>{bedside ? 'How the patient says they are' : 'Overnight events and what the patient reports'}</span><textarea rows={2} value={subjective} onChange={(e) => setSubjective(e.target.value)} placeholder={bedside ? 'Comfort, worries, sleep, pain…' : 'Overnight events, symptoms, concerns…'} /></label>
        <div className="form-field"><span>Symptoms today <small className="muted-text">tap any present</small></span><div className="pick-row">{SYMPTOMS.map((s) => <button key={s} type="button" className={`pick-chip ${symptoms.includes(s) ? 'on' : ''}`} aria-pressed={symptoms.includes(s)} onClick={() => setSymptoms(symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s])}>{s}</button>)}</div></div>
      </fieldset>

      <fieldset className="round-block">
        <legend><HeartPulse size={14} />2 · Vital signs{preview && <Chip tone={newsTone(preview.score)}>NEWS2 {preview.score}</Chip>}</legend>
        {latest && <p className="record-hint">Last set {relativeTime(latest.at)} ({latest.context ?? 'Bedside'}): HR {latest.hr}, BP {latest.bpSys}/{latest.bpDia}, RR {latest.rr}, SpO₂ {latest.spo2}%, T {latest.temp}°C. <button type="button" className="link-button" onClick={() => setVitals(Object.fromEntries(VITAL_FIELDS.map(([k]) => [k, String(latest[k])])) as Record<keyof Vitals, string>)}>Copy as a starting point</button></p>}
        <div className="form-grid obs-form">
          {VITAL_FIELDS.map(([key, label, unit, step]) => <label key={key} className="form-field"><span>{label} <small className="muted-text">{unit}</small></span><input type="number" step={step ?? 1} value={vitals[key]} onChange={(e) => { setVitals({ ...vitals, [key]: e.target.value }); setError('') }} /></label>)}
          <label className="form-field"><span>Consciousness</span><select value={consciousness} onChange={(e) => setConsciousness(e.target.value as Consciousness)}>{(['Alert', 'New confusion', 'Voice', 'Pain', 'Unresponsive'] as Consciousness[]).map((level) => <option key={level}>{level}</option>)}</select></label>
          <label className="remember-row obs-oxygen"><input type="checkbox" checked={onOxygen} onChange={(e) => setOnOxygen(e.target.checked)} />On oxygen</label>
        </div>
        <p className="record-hint">Saved vitals also go on the vitals chart as a {bedside ? 'bedside' : 'ward-round'} set.</p>
      </fieldset>

      {bedside ? (
        <fieldset className="round-block">
          <legend><ClipboardCheck size={14} />3 · Bedside checks</legend>
          <div className="nursing-grid">{NURSING.map((item) => (
            <div key={item.key} className="nursing-item"><span>{item.label}</span><div>{item.options.map((option) => <button key={option} type="button" className={`pick-chip ${nursing[item.key] === option ? 'on' : ''}`} aria-pressed={nursing[item.key] === option} onClick={() => setNursing({ ...nursing, [item.key]: option })}>{option}</button>)}</div></div>
          ))}</div>
        </fieldset>
      ) : (
        <fieldset className="round-block">
          <legend><Stethoscope size={14} />3 · Examination<span className="legend-actions"><button type="button" className="link-button" onClick={() => setExam(Object.fromEntries(EXAM_SYSTEMS.map((system) => [system, { normal: exam[system]?.normal === false ? false : true, findings: exam[system]?.findings ?? '' }])))}>Mark the rest normal</button></span></legend>
          <div className="exam-list">{EXAM_SYSTEMS.map((system) => {
            const row = exam[system]
            return (
              <div key={system} className={`exam-row ${row?.normal === false ? 'abnormal' : row?.normal ? 'normal' : ''}`}>
                <span>{system}</span>
                <div className="exam-toggle" role="radiogroup" aria-label={system}>
                  <button type="button" role="radio" aria-checked={row?.normal === true} onClick={() => setSystem(system, row?.normal === true ? null : true)}>Normal</button>
                  <button type="button" role="radio" aria-checked={row?.normal === false} onClick={() => setSystem(system, row?.normal === false ? null : false)}>Abnormal</button>
                </div>
                {row?.normal === false && <input aria-label={`${system} findings`} autoFocus value={row.findings} onChange={(e) => setExam({ ...exam, [system]: { normal: false, findings: e.target.value } })} placeholder="Findings…" />}
              </div>
            )
          })}</div>
        </fieldset>
      )}

      <fieldset className="round-block">
        <legend><FlaskConical size={14} />4 · Results and pending tests</legend>
        {results.length === 0 ? <p className="record-hint">No recent results or pending tests.</p> : <div className="results-review">{results.map((order) => (
          <label key={order.id} className={`result-check ${order.result ? '' : 'pending'}`}>
            <input type="checkbox" disabled={!order.result} checked={reviewed.includes(order.title)} onChange={(e) => setReviewed(e.target.checked ? [...reviewed, order.title] : reviewed.filter((t) => t !== order.title))} />
            <div><b>{order.title}</b><span>{order.result ?? `Pending · ${order.status}`}</span></div>
          </label>
        ))}</div>}
      </fieldset>

      <fieldset className="round-block">
        <legend><NotebookPen size={14} />5 · Assessment and plan</legend>
        <div className="form-grid form-grid-2">
          <label className="form-field"><span>Assessment / problems <b>*</b></span><textarea rows={3} value={assessment} onChange={(e) => { setAssessment(e.target.value); setError('') }} placeholder="Working diagnosis, problem list, progress" /></label>
          <label className="form-field"><span>Plan <b>*</b></span><textarea rows={3} value={plan} onChange={(e) => { setPlan(e.target.value); setError('') }} placeholder={bedside ? 'Nursing actions, escalation, what to watch' : 'Changes today, tests, referrals, discharge planning'} /></label>
        </div>
        <div className="form-field"><span>Overall progress</span>
          <div className="priority-control">{(['Improving', 'Stable', 'Deteriorating'] as const).map((value) => <button type="button" key={value} aria-pressed={status === value} className={status === value ? `active ${value === 'Deteriorating' ? 'emergent' : value === 'Stable' ? 'urgent' : 'routine'}` : ''} onClick={() => setStatus(value)}>{value}</button>)}</div>
        </div>
      </fieldset>

      {kind === 'Consultant review' && pendingDoctorNotes.length > 0 && (
        <fieldset className="round-block">
          <legend><BadgeCheck size={14} />Notes awaiting your co-signature</legend>
          <div className="results-review">{pendingDoctorNotes.map((item) => (
            <label key={item.id} className="result-check">
              <input type="checkbox" checked={cosignIds.includes(item.id)} onChange={(e) => setCosignIds(e.target.checked ? [...cosignIds, item.id] : cosignIds.filter((id) => id !== item.id))} />
              <div><b>{item.kind} · {item.by} · {formatDateTime(item.at)}</b><span>{item.assessment} Plan: {item.plan}</span></div>
            </label>
          ))}</div>
        </fieldset>
      )}

      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="panel-actions">{(kind === 'Intern assessment' || kind === 'Resident round') && kinds[0] === 'Intern assessment' && <span className="record-hint">Your notes go to a senior doctor for co-signature.</span>}{NEEDS_REVIEW[kind] && <span className="record-hint">This note goes to a {NEEDS_REVIEW[kind]} for review.</span>}<Button icon={NotebookPen} onClick={save}>Save {kind.toLowerCase()}</Button></div>
    </section>
  )
}
