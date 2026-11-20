import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Banknote, CheckCircle2, ClipboardPlus, CreditCard, Hourglass, Printer, Receipt, Search, Siren, Smartphone, UserPlus, Wallet } from 'lucide-react'
import { Button, Chip, EmptyState, EsiBadge, Metric, Modal, PageHeader, Panel, PersonCell } from '../components/ui'
import { calculateEsi, departmentById, esiLabels } from '../data'
import { formatCurrency, formatTime, minutesSince } from '../lib/format'
import { useNow } from '../lib/hooks'
import { BILLING_TONE, DEFAULT_FEES, opdDepartments, PAYERS, payerCover, VISIT_LABEL, visitCharges } from '../lib/reception'
import { useHospital } from '../store/HospitalStore'
import { doneHere } from '../lib/diagnostics'
import type { DepartmentId, Patient, Payer, Vitals, VisitType } from '../types'

const METHODS = [['Cash', Banknote], ['Card', CreditCard], ['Mobile money', Smartphone]] as const
type Method = typeof METHODS[number][0]

export default function FrontDesk() {
  const { state, can, setSelectedPatientId, settleAtReception } = useHospital()
  const now = useNow()
  const [triaging, setTriaging] = useState<Patient | null>(null)
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const awaiting = state.patients.filter((patient) => patient.status === 'awaiting-triage').sort((a, b) => a.arrival.localeCompare(b.arrival))
  const unpaidOrders = state.orders.filter((order) => order.billing === 'Unpaid')
  const cashier = state.patients.filter((patient) => patient.status === 'awaiting-payment' || unpaidOrders.some((order) => order.patientId === patient.id))
  const checkedIn = state.patients.filter((patient) => patient.visit && new Date(patient.visit.checkedInAt).getTime() >= startOfDay.getTime())
  const takings = state.invoices.flatMap((inv) => inv.payments ?? []).filter((pay) => pay.method !== 'Insurer' && new Date(pay.at).getTime() >= startOfDay.getTime()).reduce((sum, pay) => sum + pay.amount, 0)
  const canTriage = can('triage')
  const canRegister = can('register')

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Reception · Registration and billing" title="Reception" description="Every patient checks in here first — for the OPD, emergency, a ward admission or lab and imaging. Reception takes payment or records the payer, then sends the patient on. Emergencies are treated first and billed later." />
      <div className="metrics-grid">
        <Metric label="Checked in today" value={checkedIn.length} detail={`${checkedIn.filter((p) => p.visit?.type === 'OPD').length} OPD · ${checkedIn.filter((p) => p.visit?.type === 'Investigation').length} lab / imaging`} icon={UserPlus} tone="teal" />
        <Metric label="At the cashier" value={cashier.length} detail="Waiting to pay before they can continue" icon={Wallet} tone="amber" />
        <Metric label="Sent to triage" value={awaiting.length} detail={awaiting[0] ? `Longest wait ${minutesSince(awaiting[0].arrival, now)} min` : 'Queue clear'} icon={Hourglass} tone="blue" />
        <Metric label="Taken today" value={formatCurrency(takings)} detail="Cash, card and mobile money" icon={Receipt} tone="coral" />
      </div>

      {canRegister && <CheckInPanel />}

      <Panel title="Cashier — waiting to pay" action={<Chip tone={cashier.length ? 'warning' : 'neutral'}>{cashier.length}</Chip>}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>For</th><th>Payer</th><th className="num">To pay</th><th className="num">Waiting</th><th aria-label="Take payment" /></tr></thead>
            <tbody>
              {cashier.map((patient) => {
                const visitInvoice = patient.status === 'awaiting-payment' ? state.invoices.find((inv) => inv.id === patient.visit?.invoiceId) : undefined
                const visitDue = visitInvoice ? visitInvoice.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) - visitInvoice.discount - visitInvoice.insuranceCovered : 0
                const orders = unpaidOrders.filter((order) => order.patientId === patient.id)
                const ordersDue = orders.reduce((sum, order) => sum + (state.investigations.find((item) => item.name === order.title.split(' — ')[0])?.price ?? (order.kind === 'Imaging' ? 40 : 8)), 0)
                return (
                  <tr key={patient.id}>
                    <td><PersonCell name={patient.name} detail={`${patient.mrn}${patient.visit ? ` · ${patient.visit.queueNo}` : ''}`} onClick={canTriage ? () => setSelectedPatientId(patient.id) : undefined} /></td>
                    <td className="wrap">{visitInvoice && <span className="cashier-line">{patient.visit?.type === 'Admission' ? 'Admission deposit' : VISIT_LABEL[patient.visit!.type]}</span>}{orders.map((order) => <span key={order.id} className="cashier-line">{order.kind}: {order.title}</span>)}</td>
                    <td>{patient.visit?.payer ?? patient.insurance ?? 'Self-pay'}</td>
                    <td className="num"><b>{formatCurrency(Math.max(0, visitDue) + ordersDue)}</b></td>
                    <td className="num mono">{minutesSince(patient.visit?.checkedInAt ?? patient.arrival, now)} min</td>
                    <td className="row-actions">{canRegister && METHODS.map(([method, Icon]) => <Button key={method} size="sm" variant={method === 'Cash' ? 'primary' : 'secondary'} icon={Icon} onClick={() => settleAtReception(patient.id, method)}>{method}</Button>)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {cashier.length === 0 && <EmptyState icon={Wallet} title="Nobody waiting to pay" text="Patients who choose to pay later, and tests ordered in clinic, appear here." />}
      </Panel>

      <Panel title="Waiting for triage">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Queue</th><th>Patient</th><th>Reason</th><th>Going to</th><th>Billing</th><th className="num">Waiting</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {awaiting.map((patient) => (
                <tr key={patient.id}>
                  <td><b className="mono">{patient.visit?.queueNo ?? '—'}</b><small>{patient.visit ? patient.visit.type : 'Walk-in'}</small></td>
                  <td><PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.age} y ${patient.sex[0]}`} onClick={() => setSelectedPatientId(patient.id)} /></td>
                  <td className="wrap">{patient.complaint}</td>
                  <td>{departmentById(state.departments, patient.department).shortName}{patient.visit?.type === 'OPD' ? ' OPD' : ''}</td>
                  <td>{patient.visit ? <Chip tone={BILLING_TONE[patient.visit.billing]}>{patient.visit.billing === 'Deferred' ? 'Bill later' : patient.visit.billing}</Chip> : <Chip tone="neutral">{patient.insurance ?? 'Self-pay'}</Chip>}</td>
                  <td className="num mono">{minutesSince(patient.arrival, now)} min<small>since {formatTime(patient.arrival)}</small></td>
                  <td className="row-actions">{canTriage ? <Button size="sm" icon={ClipboardPlus} onClick={() => setTriaging(patient)}>Triage</Button> : <Chip tone="warning">Awaiting nurse</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {awaiting.length === 0 && <EmptyState icon={Hourglass} title="Nobody waiting" text="Patients appear here once reception has checked them in and billing is cleared." />}
      </Panel>

      {triaging && <TriageEvaluationModal patient={triaging} onClose={() => setTriaging(null)} />}
    </motion.div>
  )
}

/* ---------------- Check-in ---------------- */

function CheckInPanel() {
  const { state, receptionCheckIn } = useHospital()
  const fees = state.settings.fees ?? DEFAULT_FEES
  const clinics = opdDepartments(state.departments)
  const [search, setSearch] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Patient['sex']>('Female')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<VisitType>('OPD')
  const [department, setDepartment] = useState<DepartmentId>(clinics.find((d) => d.id === 'internal-medicine')?.id ?? clinics[0]?.id ?? 'emergency')
  const [tests, setTests] = useState<string[]>([])
  const [complaint, setComplaint] = useState('')
  const [payer, setPayer] = useState<Payer>('Self-pay')
  const [payerRef, setPayerRef] = useState('')
  const [waiverReason, setWaiverReason] = useState('')
  const [method, setMethod] = useState<Method>('Cash')
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ queueNo: string; name: string; type: VisitType; department: string; paid: string } | null>(null)

  const existing = existingId ? state.patients.find((p) => p.id === existingId) : undefined
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2 || existing) return []
    return state.patients.filter((p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q) || (p.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 6)
  }, [search, state.patients, existing])
  const active = existing && !['discharged'].includes(existing.status) && existing.visit && existing.status !== 'awaiting-payment'
  const catalogue = state.investigations.filter((item) => item.active && doneHere(item, state.settings))
  const priced = tests.map((t) => ({ name: t, price: catalogue.find((c) => c.name === t)?.price ?? 0 }))
  const effectiveDept = type === 'Emergency' ? 'emergency' : type === 'Investigation' ? (priced.length && catalogue.find((c) => c.name === tests[0])?.kind === 'Imaging' ? 'radiology' : 'laboratory') : department
  const charges = visitCharges({ returning: Boolean(existing), type, department: effectiveDept, tests: type === 'Investigation' ? priced : [] }, fees)
  const cover = payer === 'Fee waiver' ? 1 : payerCover(payer)
  const covered = Math.round(charges.total * cover * 100) / 100
  const share = Math.round((charges.total - covered) * 100) / 100

  const reset = () => { setSearch(''); setExistingId(null); setName(''); setAge(''); setPhone(''); setTests([]); setComplaint(''); setPayer('Self-pay'); setPayerRef(''); setWaiverReason(''); setError(''); setType('OPD') }

  const submit = (payment: 'Paid' | 'Unpaid' | 'Waived' | 'Deferred') => {
    if (!existing) {
      const years = Number(age)
      if (name.trim().split(/\s+/).length < 2 || age === '' || years < 0 || years > 120) { setError('Enter the full name and a valid age, or find the patient’s existing record.'); return }
    }
    if (active) { setError(`${existing!.name} already has an open visit (${existing!.visit!.queueNo}).`); return }
    if (type === 'Investigation' && !tests.length) { setError('Choose the tests or scans the patient came for.'); return }
    if (type !== 'Investigation' && complaint.trim().length < 3) { setError('Enter the reason for the visit.'); return }
    if (payer === 'Fee waiver' && waiverReason.trim().length < 4) { setError('Give the reason for the fee waiver (e.g. letter from the kebele).'); return }
    if ((payer === 'CBHI' || payer === 'Health insurance (EHIS)' || payer === 'Private insurance' || payer === 'Employer / credit') && payerRef.trim().length < 3) { setError(`Enter the ${payer === 'Employer / credit' ? 'company or agreement number' : 'membership number'}.`); return }
    const queueNo = receptionCheckIn({
      patientId: existing?.id, name: name.trim(), age: Number(age), sex, phone, complaint: complaint.trim() || tests.join(', '), type, department: effectiveDept, tests: type === 'Investigation' ? tests : undefined,
      payer, payerRef: payerRef.trim() || undefined, payment: payer === 'Fee waiver' ? 'Waived' : payment, method, waiverReason: waiverReason.trim() || undefined,
    })
    setDone({ queueNo, name: existing?.name ?? name.trim(), type, department: departmentById(state.departments, effectiveDept).name, paid: payer === 'Fee waiver' ? 'Fee waived' : share <= 0 ? `Covered by ${payer}` : payment === 'Paid' ? `Paid ${formatCurrency(share)} by ${method.toLowerCase()}` : payment === 'Deferred' ? 'Emergency — bill later' : `${formatCurrency(share)} to pay at the cashier` })
    reset()
  }

  return (
    <Panel title="Check in a patient">
      <div className="checkin">
        <div className="checkin-step">
          <span className="detail-heading">1 · Patient</span>
          {existing ? (
            <div className="erx-patient"><b>{existing.name}</b><span>{existing.mrn} · {existing.age} y · {existing.sex}{existing.phone ? ` · ${existing.phone}` : ''}</span><Chip tone="accent">Returning patient</Chip><button type="button" className="link-button" onClick={() => { setExistingId(null); setSearch('') }}>Change</button></div>
          ) : (
            <>
              <div className="checkin-search"><span>Returning patient? Find their record</span><div className="inline-search-box"><Search size={15} /><input aria-label="Find an existing record" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, MRN or phone" /></div></div>
              {matches.length > 0 && <div className="checkin-matches">{matches.map((p) => <button key={p.id} type="button" onClick={() => { setExistingId(p.id); setComplaint(''); setError('') }}><b>{p.name}</b><span>{p.mrn} · {p.age} y · {p.status === 'discharged' ? 'last visit ' + new Date(p.arrival).toLocaleDateString() : 'currently in hospital'}</span></button>)}</div>}
              <div className="form-grid form-grid-4">
                <label className="form-field"><span>Full name <b>*</b></span><input value={name} onChange={(e) => { setName(e.target.value); setError('') }} /></label>
                <label className="form-field"><span>Age <b>*</b></span><input type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} /></label>
                <label className="form-field"><span>Sex</span><select value={sex} onChange={(e) => setSex(e.target.value as Patient['sex'])}><option>Female</option><option>Male</option></select></label>
                <label className="form-field"><span>Phone</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 9…" /></label>
              </div>
            </>
          )}
        </div>

        <div className="checkin-step">
          <span className="detail-heading">2 · What they came for</span>
          <div className="segmented chart-seg" role="radiogroup" aria-label="Visit type">{(['OPD', 'Emergency', 'Admission', 'Investigation'] as VisitType[]).map((t) => <button key={t} type="button" role="radio" aria-checked={type === t} className={type === t ? 'on' : ''} onClick={() => { setType(t); setError('') }}>{t === 'Emergency' && <Siren size={13} />}{VISIT_LABEL[t]}</button>)}</div>
          <div className="form-grid form-grid-2">
            {(type === 'OPD' || type === 'Admission') && <label className="form-field"><span>{type === 'OPD' ? 'Clinic (OPD)' : 'Admitting department'}</span><select value={department} onChange={(e) => setDepartment(e.target.value as DepartmentId)}>{clinics.map((d) => <option key={d.id} value={d.id}>{d.name}{type === 'OPD' ? ' OPD' : ''}</option>)}</select></label>}
            {type !== 'Investigation' && <label className="form-field"><span>Reason for visit <b>*</b></span><input value={complaint} onChange={(e) => { setComplaint(e.target.value); setError('') }} placeholder={type === 'Admission' ? 'e.g. Elective hernia repair' : 'e.g. Cough for two weeks'} /></label>}
          </div>
          {type === 'Emergency' && <p className="record-hint"><Siren size={13} /> Emergency patients go straight to triage. Payment never delays emergency care — you can take it later.</p>}
          {type === 'Investigation' && <div className="form-field"><span>Tests and scans <small className="muted-text">done in this facility</small></span><div className="pick-row">{catalogue.map((item) => <button key={item.id} type="button" className={`pick-chip ${tests.includes(item.name) ? 'on' : ''}`} aria-pressed={tests.includes(item.name)} onClick={() => { setTests(tests.includes(item.name) ? tests.filter((t) => t !== item.name) : [...tests, item.name]); setError('') }}>{item.name} <small>{formatCurrency(item.price)}</small></button>)}</div></div>}
        </div>

        <div className="checkin-step">
          <span className="detail-heading">3 · Who pays</span>
          <div className="form-grid form-grid-2">
            <label className="form-field"><span>Payer</span><select value={payer} onChange={(e) => setPayer(e.target.value as Payer)}>{PAYERS.map((p) => <option key={p}>{p}</option>)}</select></label>
            {payer !== 'Self-pay' && payer !== 'Fee waiver' && <label className="form-field"><span>{payer === 'Employer / credit' ? 'Company / agreement no.' : 'Membership number'} <b>*</b></span><input value={payerRef} onChange={(e) => setPayerRef(e.target.value)} placeholder={payer === 'CBHI' ? 'e.g. CBHI-AA-0123456' : ''} /></label>}
            {payer === 'Fee waiver' && <label className="form-field"><span>Waiver reason <b>*</b></span><input value={waiverReason} onChange={(e) => setWaiverReason(e.target.value)} placeholder="e.g. Kebele poverty letter no. 214" /></label>}
          </div>
          <div className="bill-box">
            {charges.lines.map((line) => <div key={line.description}><span>{line.description}</span><b>{formatCurrency(line.price)}</b></div>)}
            {covered > 0 && <div className="covered"><span>{payer === 'Fee waiver' ? 'Waived' : `Covered by ${payer}`}</span><b>− {formatCurrency(covered)}</b></div>}
            <div className="total"><span>Patient pays now</span><b>{formatCurrency(share)}</b></div>
          </div>
          {share > 0 && <div className="pay-methods" role="radiogroup" aria-label="Payment method">{METHODS.map(([m, Icon]) => <button key={m} type="button" role="radio" aria-checked={method === m} className={`pick-chip ${method === m ? 'on' : ''}`} onClick={() => setMethod(m)}><Icon size={14} />{m === 'Mobile money' ? 'Mobile money (telebirr, M-Pesa)' : m}</button>)}</div>}
        </div>
      </div>
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="panel-actions checkin-actions">
        {type === 'Emergency' && share > 0 && <Button variant="danger" icon={Siren} onClick={() => submit('Deferred')}>Send to triage now — bill later</Button>}
        {share > 0 && type !== 'Emergency' && <Button variant="secondary" icon={Wallet} onClick={() => submit('Unpaid')}>Pay later at the cashier</Button>}
        <Button icon={share > 0 ? Receipt : CheckCircle2} onClick={() => submit(share > 0 ? 'Paid' : 'Paid')}>{share > 0 ? `Take ${formatCurrency(share)} and check in` : 'Check in'}</Button>
      </div>
      {done && (
        <Modal open onClose={() => setDone(null)} title="Checked in" subtitle={done.name} size="sm">
          <div className="token" id="queue-token">
            <small>Queue number</small>
            <b>{done.queueNo}</b>
            <span>{done.type === 'OPD' ? `${done.department} OPD — triage first, then the clinic` : done.type === 'Investigation' ? `${done.department} — go straight there` : done.type === 'Admission' ? `${done.department} — triage, then the ward` : 'Emergency — triage now'}</span>
            <em>{done.paid}</em>
          </div>
          <div className="modal-footer"><Button variant="ghost" icon={Printer} onClick={() => window.print()}>Print</Button><Button onClick={() => setDone(null)}>Next patient</Button></div>
        </Modal>
      )}
    </Panel>
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
  const opd = patient.visit?.type === 'OPD'

  const submit = () => {
    if (history.trim().length < 5 || !complete || !esi) { setError('Record the history, all six observations and an ESI level.'); return }
    completeTriage(patient.id, { vitals, esi: esi as Patient['esi'], history: `${history.trim()}${exam.trim() ? ` Examination: ${exam.trim()}` : ''}`, impression: impression.trim(), allergies: allergies.split(',').map((item) => item.trim()).filter(Boolean), department })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Triage evaluation · ${patient.name}`} subtitle={`${patient.visit ? `${patient.visit.queueNo} · ` : ''}${patient.mrn} · ${patient.age} y ${patient.sex} · ${patient.complaint}`} size="lg">
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
        <label className="form-field"><span>Send to{opd ? ' (OPD)' : ''}</span><select value={department} onChange={(event) => setDepartment(event.target.value as DepartmentId)}>{units.map((item) => <option key={item.id} value={item.id}>{item.name}{opd ? ' OPD' : ''}</option>)}</select></label>
      </div>
      {opd && esi > 0 && esi <= 2 && <p className="record-alerts"><span className="danger"><AlertTriangle size={14} />ESI {esi}: this patient goes to the emergency department instead of the OPD queue.</span></p>}
      {suggestion && <div className="rx-warnings" style={{ marginTop: 12 }}><span className="success"><EsiBadge level={suggestion.esi} /> Suggested from observations: {suggestion.reasons.join('; ')}. You remain accountable for the final level.</span></div>}
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={ClipboardPlus} onClick={submit}>Complete triage</Button></div>
    </Modal>
  )
}
