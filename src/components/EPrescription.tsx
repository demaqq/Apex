import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { AlertTriangle, BadgeCheck, CheckCircle2, MessageSquareText, PackageCheck, Pill, Plus, Printer, QrCode, ScanLine, Search, ShieldCheck, Trash2, UserCheck } from 'lucide-react'
import { prescribingWarnings } from '../lib/clinical'
import { isExpired, makeErxCode, normaliseCode, qrPayload, remaining } from '../lib/erx'
import { formatDate, formatDateTime, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Patient, Prescription, RxCollection, RxPriority } from '../types'
import { Button, Chip, EmptyState, Modal, Panel, PersonCell, StatusBadge } from './ui'

interface Line { medicationId: string; dosage: string; frequency: string; duration: string; quantity: string }
const blankLine = (medicationId: string): Line => ({ medicationId, dosage: '', frequency: '', duration: '', quantity: '1' })
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 h', 'At night', 'As needed']

/* ---------------- Prescribe (ward or take-home e-prescription) ---------------- */

export function EPrescribeModal({ open, onClose, patientId: presetPatient, takeHomeDefault = true }: { open: boolean; onClose: () => void; patientId?: string; takeHomeDefault?: boolean }) {
  const { state, profile, createPrescription } = useHospital()
  const active = state.patients.filter((patient) => patient.status !== 'discharged' || patient.id === presetPatient)
  const firstMed = state.formulary[0]?.id ?? ''
  const [patientId, setPatientId] = useState(presetPatient ?? '')
  const [lines, setLines] = useState<Line[]>([blankLine(firstMed)])
  const [diagnosis, setDiagnosis] = useState('')
  const [priority, setPriority] = useState<RxPriority>('Routine')
  const [takeHome, setTakeHome] = useState(takeHomeDefault)
  const [validDays, setValidDays] = useState(30)
  const [instructions, setInstructions] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const patient = active.find((item) => item.id === patientId)
  const createdRx = created ? state.prescriptions.find((rx) => rx.eRx?.code === created) : undefined

  useEffect(() => { if (open) { setPatientId(presetPatient ?? ''); setTakeHome(takeHomeDefault) } }, [open, presetPatient, takeHomeDefault])

  const warnings = useMemo(() => patient ? lines.flatMap((line) => { const med = state.formulary.find((m) => m.id === line.medicationId); return med ? prescribingWarnings(med, patient, state.prescriptions, state.formulary).map((w) => ({ ...w, text: `${med.name}: ${w.text}` })) : [] }) : [], [lines, patient, state.formulary, state.prescriptions])
  const high = warnings.some((w) => w.level === 'High')

  const reset = () => { setPatientId(presetPatient ?? ''); setLines([blankLine(firstMed)]); setDiagnosis(''); setPriority('Routine'); setValidDays(30); setInstructions(''); setAcknowledged(false); setError(''); setCreated(null) }
  const close = () => { reset(); onClose() }
  const update = (index: number, change: Partial<Line>) => { setLines(lines.map((line, i) => i === index ? { ...line, ...change } : line)); setError('') }

  const submit = () => {
    if (!patient) { setError('Choose a patient.'); return }
    const bad = lines.findIndex((line) => !line.dosage.trim() || !line.frequency.trim() || !line.duration.trim() || !(Number(line.quantity) >= 1))
    if (bad >= 0) { setError(`Complete dose, frequency, duration and quantity for medicine ${bad + 1}.`); return }
    if (new Set(lines.map((line) => line.medicationId)).size !== lines.length) { setError('The same medicine is listed twice — combine the lines.'); return }
    if (high && !acknowledged) { setError('Review the high-risk warnings and confirm the prescription is clinically justified.'); return }
    const code = takeHome ? makeErxCode() : undefined
    createPrescription({
      patientId: patient.id, department: profile?.department ?? patient.department, priority, diagnosis: diagnosis.trim() || undefined,
      items: lines.map((line) => ({ medicationId: line.medicationId, dosage: line.dosage.trim(), frequency: line.frequency.trim(), duration: line.duration.trim(), quantity: Math.floor(Number(line.quantity)) })),
      ...(code ? { eRx: { code, validUntil: new Date(Date.now() + validDays * 86_400_000).toISOString(), instructions: instructions.trim() || undefined, phone: patient.phone } } : {}),
    })
    if (code) setCreated(code)
    else close()
  }

  if (createdRx) return (
    <Modal open={open} onClose={close} title="e-Prescription ready" subtitle="Give the code to the patient — any pharmacist can find it with the code" size="md">
      <ErxSlip rx={createdRx} />
      <div className="modal-footer"><Button variant="ghost" onClick={close}>Done</Button></div>
    </Modal>
  )

  return (
    <Modal open={open} onClose={close} title="New prescription" subtitle={takeHome ? 'e-Prescription: the patient collects from the pharmacy with a code' : 'Ward supply: goes to the pharmacy queue for the ward'} size="lg">
      <div className="segmented chart-seg" role="radiogroup" aria-label="How the patient gets the medicine">
        <button type="button" role="radio" aria-checked={takeHome} className={takeHome ? 'on' : ''} onClick={() => setTakeHome(true)}>Patient collects (e-prescription)</button>
        <button type="button" role="radio" aria-checked={!takeHome} className={!takeHome ? 'on' : ''} onClick={() => setTakeHome(false)}>Ward supply</button>
      </div>
      <div className="form-grid form-grid-2">
        {!presetPatient && <label className="form-field span-2"><span>Patient <b>*</b></span>
          <select value={patientId} onChange={(event) => { setPatientId(event.target.value); setError('') }}>
            <option value="">Select a patient…</option>
            {active.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.mrn}</option>)}
          </select>
        </label>}
        {patient && <div className="span-2 erx-patient"><b>{patient.name}</b><span>{patient.mrn} · {patient.age} y · {patient.sex}{patient.weightKg ? ` · ${patient.weightKg} kg` : ''}</span>{patient.allergies[0] !== 'No known allergies' && <em><AlertTriangle size={13} />Allergies: {patient.allergies.join(', ')}</em>}</div>}
      </div>

      <div className="rx-builder">
        {lines.map((line, index) => {
          const med = state.formulary.find((m) => m.id === line.medicationId)
          return (
            <div key={index} className="rx-line">
              <span className="rx-line-no">{index + 1}</span>
              <label className="form-field rx-med"><span>Medicine</span>
                <select value={line.medicationId} onChange={(e) => update(index, { medicationId: e.target.value })}>{state.formulary.map((item) => <option key={item.id} value={item.id}>{item.name} {item.strength} · {item.dosageForm}{item.stock <= 0 ? ' (out of stock)' : ''}</option>)}</select>
              </label>
              <label className="form-field"><span>Dose</span><input value={line.dosage} onChange={(e) => update(index, { dosage: e.target.value })} placeholder="e.g. 500 mg" /></label>
              <label className="form-field"><span>How often</span><input list="rx-frequencies" value={line.frequency} onChange={(e) => update(index, { frequency: e.target.value })} placeholder="e.g. Twice daily" /></label>
              <label className="form-field"><span>For</span><input value={line.duration} onChange={(e) => update(index, { duration: e.target.value })} placeholder="e.g. 7 days" /></label>
              <label className="form-field rx-qty"><span>Qty <small className="muted-text">{med?.unit}</small></span><input type="number" min={1} value={line.quantity} onChange={(e) => update(index, { quantity: e.target.value })} /></label>
              {lines.length > 1 && <button type="button" className="icon-button" aria-label={`Remove medicine ${index + 1}`} onClick={() => setLines(lines.filter((_, i) => i !== index))}><Trash2 size={15} /></button>}
              {med && Number(line.quantity) > med.stock && <small className="rx-line-note warn-text">Only {med.stock} {med.unit} in stock — pharmacy may part-supply.</small>}
            </div>
          )
        })}
        <datalist id="rx-frequencies">{FREQUENCIES.map((f) => <option key={f} value={f} />)}</datalist>
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setLines([...lines, blankLine(firstMed)])}>Add another medicine</Button>
      </div>

      {warnings.length > 0 && <div className="rx-warnings" role="alert">
        {warnings.map((warning, index) => <p key={index} className={warning.level === 'High' ? 'danger' : 'warning'}><AlertTriangle size={14} />{warning.text}</p>)}
        {high && <label className="remember-row"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I have reviewed these warnings; the prescription is clinically justified.</label>}
      </div>}

      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Indication</span><input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Community-acquired pneumonia" /></label>
        <div className="form-field"><span>Priority</span>
          <div className="priority-control">{(['Routine', 'Urgent', 'STAT'] as RxPriority[]).map((value) => <button type="button" key={value} aria-pressed={priority === value} className={priority === value ? `active ${{ Routine: 'routine', Urgent: 'urgent', STAT: 'emergent' }[value]}` : ''} onClick={() => setPriority(value)}>{value}</button>)}</div>
        </div>
        {takeHome && <>
          <label className="form-field"><span>Valid for</span><select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))}>{[3, 7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
          <label className="form-field"><span>Advice for the patient</span><input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Take with food; finish the course" /></label>
        </>}
      </div>
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={close}>Cancel</Button><Button icon={takeHome ? QrCode : Pill} onClick={submit}>{takeHome ? 'Create e-prescription' : 'Send to pharmacy'}</Button></div>
    </Modal>
  )
}

/* ---------------- The slip the patient takes away ---------------- */

export function ErxSlip({ rx }: { rx: Prescription }) {
  const { state, sendErx } = useHospital()
  const patient = state.patients.find((item) => item.id === rx.patientId)
  const [qr, setQr] = useState('')
  const [phone, setPhone] = useState(rx.eRx?.phone ?? patient?.phone ?? '')
  useEffect(() => { if (rx.eRx) QRCode.toDataURL(qrPayload(rx.eRx.code), { margin: 1, width: 220, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr('')) }, [rx.eRx])
  if (!rx.eRx || !patient) return null
  const left = remaining(rx)
  return (
    <div className="erx-slip" id={`slip-${rx.id}`}>
      <div className="erx-head">
        <div><small>{state.settings.name} · e-Prescription</small><b className="erx-code">{rx.eRx.code}</b><span>Valid until {formatDate(rx.eRx.validUntil)}{isExpired(rx) ? ' · expired' : ''}</span></div>
        {qr ? <img src={qr} alt={`QR code for ${rx.eRx.code}`} width={120} height={120} /> : <QrCode size={64} />}
      </div>
      <dl className="erx-meta">
        <dt>Patient</dt><dd>{patient.name} · {patient.mrn} · {patient.age} y</dd>
        <dt>Prescriber</dt><dd>{rx.prescriber} · {formatDateTime(rx.createdAt)}</dd>
        {rx.diagnosis && <><dt>For</dt><dd>{rx.diagnosis}</dd></>}
      </dl>
      <ol className="erx-lines">{left.map((item) => { const med = state.formulary.find((m) => m.id === item.medicationId); return <li key={item.medicationId}><b>{med?.name} {med?.strength}</b><span>{item.dosage} · {item.frequency} · {item.duration}</span><small>Quantity {item.quantity} {med?.unit}{item.given ? ` · ${item.given} collected, ${item.left} to collect` : ''}</small></li> })}</ol>
      {rx.eRx.instructions && <p className="erx-advice">{rx.eRx.instructions}</p>}
      <p className="record-hint">Show this code or QR at the pharmacy. Bring your ID or hospital card.</p>
      <div className="erx-actions no-print">
        <Button size="sm" variant="secondary" icon={Printer} onClick={() => printSlip(rx.id)}>Print slip</Button>
        <input aria-label="Patient phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Patient phone, e.g. +251 9…" />
        <Button size="sm" variant="secondary" icon={MessageSquareText} disabled={phone.replace(/\D/g, '').length < 9} onClick={() => sendErx(rx.id, phone.trim())}>{rx.eRx.sentAt ? 'Send again' : 'Send code by SMS'}</Button>
      </div>
      {rx.eRx.sentAt && <p className="record-hint no-print">Code saved for {rx.eRx.phone} {relativeTime(rx.eRx.sentAt)}.</p>}
    </div>
  )
}

function printSlip(id: string) {
  const node = document.getElementById(`slip-${id}`)
  if (!node) return
  document.body.classList.add('printing-slip')
  node.classList.add('print-target')
  const done = () => { document.body.classList.remove('printing-slip'); node.classList.remove('print-target'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  window.print()
  setTimeout(done, 1500)
}

/* ---------------- Pharmacy: collection desk ---------------- */

export function CollectionDesk() {
  const { state, setPrescriptionStatus, setSelectedPatientId } = useHospital()
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<string | null>(null)
  const [error, setError] = useState('')
  const eRxs = state.prescriptions.filter((rx) => rx.eRx)
  const waiting = eRxs.filter((rx) => ['Pending', 'Verified', 'Ready for collection', 'Part collected'].includes(rx.status)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const collectedToday = eRxs.flatMap((rx) => rx.collections ?? []).filter((c) => new Date(c.at).toDateString() === new Date().toDateString()).length
  const found = lookup ? state.prescriptions.find((rx) => rx.id === lookup) : undefined

  const find = () => {
    const wanted = normaliseCode(code)
    const rx = state.prescriptions.find((item) => item.eRx?.code === wanted)
    if (!rx) { setError(`No e-prescription with code ${wanted || code}. Check the letters and try again.`); return }
    setError(''); setLookup(rx.id)
  }

  return (
    <>
      <Panel>
        <div className="collect-search">
          <ScanLine size={22} />
          <div>
            <b>Find an e-prescription</b>
            <span>Type the code from the patient’s slip or SMS, or scan the QR code into the box.</span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); find() }}>
            <input aria-label="e-Prescription code" value={code} onChange={(e) => { setCode(e.target.value); setError('') }} placeholder="ERX-XXXXXX" autoComplete="off" />
            <Button icon={Search} type="submit">Find</Button>
          </form>
        </div>
        {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
        <div className="collect-stats"><span><b>{waiting.filter((rx) => rx.status === 'Ready for collection' || rx.status === 'Part collected').length}</b> ready to collect</span><span><b>{waiting.filter((rx) => rx.status === 'Pending' || rx.status === 'Verified').length}</b> to verify or prepare</span><span><b>{collectedToday}</b> handed over today</span></div>
      </Panel>
      <div className="card-grid">
        {waiting.map((rx) => {
          const patient = state.patients.find((p) => p.id === rx.patientId)
          return (
            <article key={rx.id} className={`work-card ${isExpired(rx) ? 'is-expired' : ''}`}>
              <header><b className="mono">{rx.eRx!.code}</b><StatusBadge status={rx.status} />{isExpired(rx) && <Chip tone="danger">Expired</Chip>}</header>
              {patient && <PersonCell name={patient.name} detail={`${patient.mrn} · ${rx.prescriber}`} onClick={() => setSelectedPatientId(patient.id)} />}
              <ul className="rx-lines">{remaining(rx).map((item) => { const med = state.formulary.find((m) => m.id === item.medicationId); return <li key={item.medicationId}><b>{med?.name} {item.dosage}</b><span>{item.frequency} · qty {item.quantity}{item.given ? ` · ${item.left} still owed` : ''}</span>{med && med.stock < item.left && <em>Low stock ({med.stock})</em>}</li> })}</ul>
              <footer><small>{relativeTime(rx.createdAt)} · valid to {formatDate(rx.eRx!.validUntil)}</small><div>
                {rx.status === 'Pending' && <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => setPrescriptionStatus(rx.id, 'Verified')}>Verify</Button>}
                {rx.status === 'Verified' && <Button size="sm" variant="secondary" icon={PackageCheck} onClick={() => setPrescriptionStatus(rx.id, 'Ready for collection')}>Mark ready</Button>}
                {(rx.status === 'Ready for collection' || rx.status === 'Part collected') && <Button size="sm" icon={UserCheck} disabled={isExpired(rx)} onClick={() => setLookup(rx.id)}>Hand over</Button>}
              </div></footer>
            </article>
          )
        })}
        {waiting.length === 0 && <Panel><EmptyState icon={QrCode} title="No e-prescriptions waiting" text="Take-home prescriptions appear here when a clinician sends one." /></Panel>}
      </div>
      {found && <CollectModal rx={found} onClose={() => { setLookup(null); setCode('') }} />}
    </>
  )
}

const COUNSELLING = ['How much to take and when', 'Side effects and what to do', 'How to store it', 'When to finish or come back']

export function CollectModal({ rx, onClose }: { rx: Prescription; onClose: () => void }) {
  const { state, setPrescriptionStatus, collectPrescription } = useHospital()
  const patient = state.patients.find((item) => item.id === rx.patientId) as Patient | undefined
  const left = remaining(rx)
  const [give, setGive] = useState<Record<string, string>>(() => Object.fromEntries(left.map((item) => { const stock = state.formulary.find((m) => m.id === item.medicationId)?.stock ?? 0; return [item.medicationId, String(Math.min(item.left, stock))] })))
  const [idChecked, setIdChecked] = useState(false)
  const [collectedBy, setCollectedBy] = useState<RxCollection['collectedBy']>('Patient')
  const [collectorName, setCollectorName] = useState('')
  const [counselled, setCounselled] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState<RxCollection | null>(null)
  const expired = isExpired(rx)
  const canHand = rx.status === 'Ready for collection' || rx.status === 'Part collected' || rx.status === 'Verified'

  const handOver = () => {
    if (!idChecked) { setError('Confirm the patient’s identity first.'); return }
    if (collectedBy !== 'Patient' && !collectorName.trim()) { setError('Enter the name of the person collecting.'); return }
    if (counselled.length < COUNSELLING.length) { setError('Go through each counselling point with the patient.'); return }
    const items = left.map((item) => ({ medicationId: item.medicationId, quantity: Math.max(0, Math.min(item.left, Math.floor(Number(give[item.medicationId]) || 0))) }))
    const record = { collectedBy, collectorName: collectorName.trim() || undefined, idChecked, counselled: true, items }
    if (collectPrescription(rx.id, record)) setDone({ ...record, id: 'receipt', at: new Date().toISOString(), by: '' })
  }

  if (done) {
    const after = state.prescriptions.find((item) => item.id === rx.id) ?? rx
    const owed = remaining(after).filter((item) => item.left > 0)
    return (
      <Modal open onClose={onClose} title="Handed over" subtitle={`${rx.eRx?.code} · ${patient?.name}`} size="md">
        <div className="handover-done"><CheckCircle2 size={28} /><div><b>{done.items.filter((i) => i.quantity).map((i) => `${state.formulary.find((m) => m.id === i.medicationId)?.name} × ${i.quantity}`).join(', ')}</b><span>Given to {done.collectedBy === 'Patient' ? patient?.name : done.collectorName} · stock updated</span></div></div>
        {owed.length > 0 && <p className="record-alerts"><span className="warning"><AlertTriangle size={14} />Still owed: {owed.map((i) => `${state.formulary.find((m) => m.id === i.medicationId)?.name} × ${i.left}`).join(', ')}. The patient can return with the same code.</span></p>}
        <div className="modal-footer"><Button onClick={onClose}>Done</Button></div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title={`Collect ${rx.eRx?.code ?? rx.id}`} subtitle={`${rx.prescriber} · ${formatDateTime(rx.createdAt)}${rx.diagnosis ? ` · ${rx.diagnosis}` : ''}`} size="lg">
      {expired && <div className="inline-error"><AlertTriangle size={16} />This e-prescription expired on {formatDate(rx.eRx!.validUntil)}. Ask the prescriber to renew it.</div>}
      {rx.status === 'Pending' && <div className="report-images"><div><b>Not yet verified</b><span>A pharmacist must verify the prescription before it can be handed over.</span></div><Button size="sm" icon={BadgeCheck} onClick={() => setPrescriptionStatus(rx.id, 'Verified')}>Verify now</Button></div>}
      {rx.status === 'Dispensed' && <div className="handover-done"><CheckCircle2 size={22} /><div><b>Already fully collected</b><span>{(rx.collections ?? []).map((c) => `${formatDateTime(c.at)} by ${c.collectedBy === 'Patient' ? 'the patient' : c.collectorName}`).join(' · ')}</span></div></div>}
      {patient && <div className="erx-patient"><b>{patient.name}</b><span>{patient.mrn} · {patient.age} y · {patient.sex}{patient.phone ? ` · ${patient.phone}` : ''}</span>{patient.allergies[0] !== 'No known allergies' && <em><AlertTriangle size={13} />Allergies: {patient.allergies.join(', ')}</em>}</div>}

      {canHand && !expired && <>
        <label className="remember-row id-check"><input type="checkbox" checked={idChecked} onChange={(e) => { setIdChecked(e.target.checked); setError('') }} /><ShieldCheck size={15} />Identity checked against ID or hospital card (name and MRN match)</label>
        <div className="table-wrap"><table className="data-table compact">
          <thead><tr><th>Medicine</th><th className="num">Prescribed</th><th className="num">Collected</th><th className="num">In stock</th><th className="num">Give now</th></tr></thead>
          <tbody>{left.map((item) => { const med = state.formulary.find((m) => m.id === item.medicationId); return (
            <tr key={item.medicationId}>
              <td><b>{med?.name} {med?.strength}</b><small>{item.dosage} · {item.frequency} · {item.duration}</small></td>
              <td className="num">{item.quantity}</td><td className="num">{item.given}</td>
              <td className={`num ${(med?.stock ?? 0) < item.left ? 'danger-text' : ''}`}>{med?.stock ?? 0}</td>
              <td className="num"><input className="inline-number" type="number" min={0} max={Math.min(item.left, med?.stock ?? 0)} aria-label={`Quantity of ${med?.name} to give`} value={give[item.medicationId]} disabled={item.left === 0} onChange={(e) => setGive({ ...give, [item.medicationId]: e.target.value })} /></td>
            </tr>
          ) })}</tbody>
        </table></div>
        <div className="form-grid form-grid-2">
          <div className="form-field"><span>Collected by</span><div className="segmented small">{(['Patient', 'Relative or carer'] as const).map((who) => <button key={who} type="button" className={collectedBy === who ? 'on' : ''} onClick={() => setCollectedBy(who)}>{who}</button>)}</div></div>
          {collectedBy !== 'Patient' && <label className="form-field"><span>Name and relationship</span><input value={collectorName} onChange={(e) => setCollectorName(e.target.value)} placeholder="e.g. Hirut, daughter" /></label>}
        </div>
        <div className="form-field"><span>Counselling given</span><div className="pick-row">{COUNSELLING.map((point) => <button key={point} type="button" className={`pick-chip ${counselled.includes(point) ? 'on' : ''}`} aria-pressed={counselled.includes(point)} onClick={() => { setCounselled(counselled.includes(point) ? counselled.filter((p) => p !== point) : [...counselled, point]); setError('') }}>{counselled.includes(point) && <CheckCircle2 size={13} />}{point}</button>)}</div></div>
        {rx.eRx?.instructions && <p className="erx-advice">Prescriber’s advice: {rx.eRx.instructions}</p>}
      </>}
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Close</Button>{canHand && !expired && <Button icon={PackageCheck} onClick={handOver}>Hand over medicines</Button>}</div>
    </Modal>
  )
}
