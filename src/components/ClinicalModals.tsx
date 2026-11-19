import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, BedDouble, Check, ClipboardPlus, FileCheck2, HeartPulse, Info, Network, Send, Stethoscope } from 'lucide-react'
import { calculateEsi, commonRisks, esiLabels } from '../data'
import { stagesFor } from '../lib/clinical'
import { useHospital } from '../store/HospitalStore'
import type { ClinicalOrder, DepartmentId, Patient, Priority, Referral, Vitals } from '../types'
import { Button, EsiBadge, Modal } from './ui'

const defaultVitals: Vitals = { hr: 80, rr: 16, spo2: 98, bpSys: 120, bpDia: 75, temp: 36.8, gcs: 15, pain: 2 }

function VitalInput({ label, value, unit, min, max, step = 1, onChange }: { label: string; value: number; unit: string; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return <label className="vital-input"><span>{label}<small>{unit}</small></span><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function TriageModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { addTriage } = useHospital()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [age, setAge] = useState(45)
  const [sex, setSex] = useState<Patient['sex']>('Female')
  const [complaint, setComplaint] = useState('')
  const [history, setHistory] = useState('')
  const [allergies, setAllergies] = useState('')
  const [vitals, setVitals] = useState<Vitals>(defaultVitals)
  const [resources, setResources] = useState(1)
  const [risks, setRisks] = useState<string[]>([])
  const [finalEsi, setFinalEsi] = useState<Patient['esi']>(4)
  const [overrideReason, setOverrideReason] = useState('')
  const [error, setError] = useState('')
  const suggestion = useMemo(() => calculateEsi(vitals, complaint, resources, risks), [vitals, complaint, resources, risks])

  useEffect(() => {
    if (open) {
      setStep(1); setName(''); setAge(45); setSex('Female'); setComplaint(''); setHistory(''); setAllergies('')
      setVitals(defaultVitals); setResources(1); setRisks([]); setOverrideReason(''); setError('')
    }
  }, [open])

  useEffect(() => { setFinalEsi(suggestion.esi); setOverrideReason('') }, [suggestion.esi])

  const next = () => {
    if (step === 1 && (!name.trim() || !complaint.trim() || age < 0 || age > 120)) {
      setError('Enter the patient name, a valid age and presenting complaint.')
      return
    }
    setError('')
    setStep((value) => Math.min(3, value + 1))
  }

  const submit = () => {
    if (finalEsi !== suggestion.esi && !overrideReason.trim()) {
      setError('Document a clinical reason when overriding the suggested acuity.')
      return
    }
    const id = addTriage({ name, age, sex, complaint, history, allergies: allergies.split(',').map((item) => item.trim()).filter(Boolean), vitals, resources, riskFactors: risks, esi: finalEsi, overrideReason: finalEsi !== suggestion.esi ? overrideReason : undefined })
    onClose()
    onCreated?.(id)
  }

  const updateVital = (key: keyof Vitals, value: number) => setVitals((previous) => ({ ...previous, [key]: value }))

  return <Modal open={open} onClose={onClose} title="New patient triage" subtitle="Structured assessment · Emergency Severity Index (ESI)" size="xl">
    <div className="stepper" aria-label="Triage progress">
      {[['1', 'Identity'], ['2', 'Assessment'], ['3', 'Acuity decision']].map(([number, label], index) => <div key={number} className={`${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'done' : ''}`}><span>{step > index + 1 ? <Check size={14} /> : number}</span><b>{label}</b></div>)}
    </div>

    {step === 1 && <div className="form-section">
      <div className="form-section-title"><span><ClipboardPlus size={18} /></span><div><h3>Patient & presentation</h3><p>Create a single episode that every department can follow.</p></div></div>
      <div className="form-grid form-grid-3">
        <label className="form-field span-2"><span>Full name <b>*</b></span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jordan Ellis" /></label>
        <label className="form-field"><span>Age <b>*</b></span><input type="number" min="0" max="120" value={age} onChange={(event) => setAge(Number(event.target.value))} /></label>
        <label className="form-field"><span>Sex</span><select value={sex} onChange={(event) => setSex(event.target.value as Patient['sex'])}><option>Female</option><option>Male</option><option>Non-binary</option></select></label>
        <label className="form-field span-2"><span>Allergies</span><input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="Comma separated, or leave blank if NKDA" /></label>
        <label className="form-field span-3"><span>Presenting complaint <b>*</b></span><textarea rows={3} value={complaint} onChange={(event) => setComplaint(event.target.value)} placeholder="Describe symptoms, onset and relevant mechanism…" /></label>
        <label className="form-field span-3"><span>Brief history & immediate treatment</span><textarea rows={3} value={history} onChange={(event) => setHistory(event.target.value)} placeholder="Relevant conditions, medicines, last known well, treatment already given…" /></label>
      </div>
    </div>}

    {step === 2 && <div className="form-section">
      <div className="form-section-title"><span><HeartPulse size={18} /></span><div><h3>Observations & resource need</h3><p>The recommendation updates as the assessment changes.</p></div></div>
      <div className="vitals-grid">
        <VitalInput label="Heart rate" unit="/min" value={vitals.hr} min={0} max={250} onChange={(value) => updateVital('hr', value)} />
        <VitalInput label="Respiratory rate" unit="/min" value={vitals.rr} min={0} max={80} onChange={(value) => updateVital('rr', value)} />
        <VitalInput label="Oxygen saturation" unit="%" value={vitals.spo2} min={0} max={100} onChange={(value) => updateVital('spo2', value)} />
        <VitalInput label="Systolic BP" unit="mmHg" value={vitals.bpSys} min={30} max={280} onChange={(value) => updateVital('bpSys', value)} />
        <VitalInput label="Diastolic BP" unit="mmHg" value={vitals.bpDia} min={10} max={180} onChange={(value) => updateVital('bpDia', value)} />
        <VitalInput label="Temperature" unit="°C" value={vitals.temp} min={25} max={45} step={0.1} onChange={(value) => updateVital('temp', value)} />
        <VitalInput label="GCS" unit="/15" value={vitals.gcs} min={3} max={15} onChange={(value) => updateVital('gcs', value)} />
        <VitalInput label="Pain score" unit="/10" value={vitals.pain} min={0} max={10} onChange={(value) => updateVital('pain', value)} />
      </div>
      <div className="resource-block"><div><b>Anticipated resources</b><span>Tests, procedures, IV treatment or specialist consultation. Not a bed or simple review.</span></div><div className="segmented-control">{[0, 1, 2, 3, 4].map((value) => <button key={value} className={resources === value ? 'active' : ''} onClick={() => setResources(value)}>{value === 4 ? '4+' : value}</button>)}</div></div>
      <fieldset className="risk-fieldset"><legend>High-risk flags <span>Select all that apply</span></legend><div className="risk-grid">{commonRisks.map((risk) => <label key={risk} className={risks.includes(risk) ? 'checked' : ''}><input type="checkbox" checked={risks.includes(risk)} onChange={() => setRisks((previous) => previous.includes(risk) ? previous.filter((item) => item !== risk) : [...previous, risk])} /><span><Check size={12} /></span>{risk}</label>)}</div></fieldset>
    </div>}

    {step === 3 && <div className="form-section acuity-step">
      <div className="acuity-recommendation" style={{ '--esi': esiLabels[suggestion.esi].color } as React.CSSProperties}>
        <div><span className="recommendation-label"><Activity size={15} />SYSTEM RECOMMENDATION</span><div className="acuity-score"><strong>ESI {suggestion.esi}</strong><span>{esiLabels[suggestion.esi].name}<small>{esiLabels[suggestion.esi].target} to clinician</small></span></div></div>
        <div className="acuity-reasons"><b>Why this level?</b>{suggestion.reasons.map((reason) => <p key={reason}><Check size={14} />{reason}</p>)}</div>
      </div>
      <div className="final-acuity"><div className="field-heading"><b>Final clinical acuity</b><span>You remain accountable for the triage decision.</span></div><div className="acuity-options">{([1, 2, 3, 4, 5] as Patient['esi'][]).map((level) => <button key={level} className={finalEsi === level ? 'active' : ''} style={{ '--esi': esiLabels[level].color } as React.CSSProperties} onClick={() => setFinalEsi(level)}><b>{level}</b><span>{esiLabels[level].name}</span></button>)}</div></div>
      {finalEsi !== suggestion.esi && <div className="override-box"><AlertTriangle size={19} /><label className="form-field"><span>Clinical override rationale <b>*</b></span><textarea autoFocus rows={2} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder={`Why is ESI ${finalEsi} more appropriate than the suggested ESI ${suggestion.esi}?`} /></label></div>}
      <div className="handoff-note"><Info size={17} /><span>This creates the shared patient record, triage timeline and live waiting-room entry.</span></div>
    </div>}

    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    <div className="modal-footer">
      <Button variant="ghost" onClick={step === 1 ? onClose : () => { setError(''); setStep(step - 1) }} icon={step > 1 ? ArrowLeft : undefined}>{step === 1 ? 'Cancel' : 'Back'}</Button>
      <span>Step {step} of 3</span>
      {step < 3 ? <Button onClick={next}>Continue<ArrowRight size={17} /></Button> : <Button onClick={submit}>Complete triage<Check size={17} /></Button>}
    </div>
  </Modal>
}

export function RetriageModal({ patient, open, onClose }: { patient: Patient; open: boolean; onClose: () => void }) {
  const { retriage } = useHospital()
  const [vitals, setVitals] = useState(patient.vitals)
  const [esi, setEsi] = useState<Patient['esi']>(patient.esi)
  const [reason, setReason] = useState('')
  const suggestion = useMemo(() => calculateEsi(vitals, patient.complaint, patient.resources, patient.riskFactors), [vitals, patient])
  useEffect(() => { if (open) { setVitals(patient.vitals); setEsi(patient.esi); setReason('') } }, [open, patient])
  const update = (key: keyof Vitals, value: number) => setVitals((previous) => ({ ...previous, [key]: value }))
  return <Modal open={open} onClose={onClose} title={`Reassess ${patient.name}`} subtitle={`${patient.mrn} · Current acuity ESI ${patient.esi}`} size="lg">
    <div className="retriage-layout">
      <div className="vitals-grid compact-vitals">
        <VitalInput label="Heart rate" unit="/min" value={vitals.hr} onChange={(value) => update('hr', value)} />
        <VitalInput label="Respiratory rate" unit="/min" value={vitals.rr} onChange={(value) => update('rr', value)} />
        <VitalInput label="Oxygen saturation" unit="%" value={vitals.spo2} onChange={(value) => update('spo2', value)} />
        <VitalInput label="Systolic BP" unit="mmHg" value={vitals.bpSys} onChange={(value) => update('bpSys', value)} />
        <VitalInput label="Diastolic BP" unit="mmHg" value={vitals.bpDia} onChange={(value) => update('bpDia', value)} />
        <VitalInput label="Temperature" unit="°C" value={vitals.temp} step={0.1} onChange={(value) => update('temp', value)} />
        <VitalInput label="GCS" unit="/15" value={vitals.gcs} onChange={(value) => update('gcs', value)} />
        <VitalInput label="Pain score" unit="/10" value={vitals.pain} onChange={(value) => update('pain', value)} />
      </div>
      <div className="retriage-decision"><span>Suggested from latest observations</span><EsiBadge level={suggestion.esi} /><label className="form-field"><span>Final ESI</span><select value={esi} onChange={(event) => setEsi(Number(event.target.value) as Patient['esi'])}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>ESI {level} · {esiLabels[level].name}</option>)}</select></label><label className="form-field"><span>Reassessment rationale</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Clinical change, response to treatment or override rationale…" /></label></div>
    </div>
    <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { retriage(patient.id, vitals, esi, reason); onClose() }}>Save reassessment<Check size={17} /></Button></div>
  </Modal>
}

export function ReferralModal({ patient, open, onClose }: { patient: Patient; open: boolean; onClose: () => void }) {
  const { state, addReferral } = useHospital()
  const available = state.departments.filter((department) => department.id !== patient.department)
  const [to, setTo] = useState<DepartmentId>(available[0]?.id ?? 'cardiology')
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState<Priority>('urgent')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setTo(available[0]?.id ?? 'cardiology'); setReason(''); setPriority('urgent'); setError('') } }, [open, patient.id])
  const submit = () => {
    if (reason.trim().length < 12) { setError('Add a focused clinical question of at least 12 characters.'); return }
    addReferral(patient.id, to, reason, priority); onClose()
  }
  return <Modal open={open} onClose={onClose} title="Request specialist consultation" subtitle={`${patient.name} · ${patient.mrn}`} size="md">
    <div className="context-banner"><Stethoscope size={20} /><div><b>{patient.complaint}</b><span>Latest observations, allergies and episode timeline will be shared.</span></div></div>
    <div className="form-grid">
      <label className="form-field"><span>Receiving department</span><select value={to} onChange={(event) => setTo(event.target.value as DepartmentId)}>{available.map((department) => <option key={department.id} value={department.id}>{department.name} · {department.onCall}</option>)}</select></label>
      <div className="form-field"><span>Clinical priority</span><div className="priority-control">{(['routine', 'urgent', 'emergent'] as Priority[]).map((value) => <button key={value} className={priority === value ? `active ${value}` : ''} onClick={() => setPriority(value)}>{value}</button>)}</div></div>
      <label className="form-field"><span>Clinical question <b>*</b></span><textarea rows={5} value={reason} onChange={(event) => { setReason(event.target.value); setError('') }} placeholder="What decision do you need from the receiving team? Include the key findings and timeframe…" /></label>
    </div>
    <div className="handoff-note"><Network size={17} /><span>The referral enters the receiving team's inbox immediately and every response is written back to this episode.</span></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}>Send referral<Send size={16} /></Button></div>
  </Modal>
}

const orderTemplates: Array<{ title: string; kind: ClinicalOrder['kind']; department: DepartmentId }> = [
  { title: 'CT head without contrast', kind: 'Imaging', department: 'radiology' },
  { title: 'Portable chest X-ray', kind: 'Imaging', department: 'radiology' },
  { title: 'CT pulmonary angiogram', kind: 'Imaging', department: 'radiology' },
  { title: 'FBC, U&E and CRP', kind: 'Laboratory', department: 'laboratory' },
  { title: 'High-sensitivity troponin I', kind: 'Laboratory', department: 'laboratory' },
  { title: 'Arterial blood gas', kind: 'Laboratory', department: 'laboratory' },
  { title: 'Blood cultures x2', kind: 'Laboratory', department: 'laboratory' },
  { title: 'MRI brain with and without contrast', kind: 'Imaging', department: 'radiology' },
  { title: 'Medication reconciliation', kind: 'Medication', department: 'pharmacy' },
  { title: 'Mobilisation and falls assessment', kind: 'Physiotherapy', department: 'ward' },
  { title: 'Chest physiotherapy', kind: 'Physiotherapy', department: 'ward' },
  { title: 'Dietitian review', kind: 'Nutrition', department: 'internal-medicine' },
  { title: 'Swallow and texture-modified diet assessment', kind: 'Nutrition', department: 'internal-medicine' },
  { title: 'Group and save', kind: 'Blood bank', department: 'laboratory' },
  { title: 'Crossmatch 2 units red cells', kind: 'Blood bank', department: 'laboratory' },
]

export function OrderModal({ patient, open, onClose, kind }: { patient?: Patient; open: boolean; onClose: () => void; kind?: ClinicalOrder['kind'] }) {
  const { state, addOrder } = useHospital()
  // Lab and imaging come from the administrator's catalogue; other services keep their templates.
  const catalogue = state.investigations.filter((item) => item.active).map((item) => ({ title: item.name, kind: item.kind as ClinicalOrder['kind'], department: (item.kind === 'Imaging' ? 'radiology' : 'laboratory') as DepartmentId, inHouse: item.inHouse }))
  const allTemplates = [...catalogue, ...orderTemplates.filter((item) => !['Laboratory', 'Imaging'].includes(item.kind)).map((item) => ({ ...item, inHouse: true }))]
  const templates = kind ? allTemplates.filter((item) => item.kind === kind) : allTemplates
  const [performAt, setPerformAt] = useState('in-house')
  const [patientId, setPatientId] = useState(patient?.id ?? '')
  const [template, setTemplate] = useState(0)
  const [title, setTitle] = useState(templates[0].title)
  const [priority, setPriority] = useState<Priority>('urgent')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setPatientId(patient?.id ?? ''); setTemplate(0); setPerformAt('in-house'); setTitle(templates[0].title); setPriority('urgent'); setError('') } }, [open, patient?.id, kind])
  const item = templates[template] ?? templates[0]
  const target = patient ?? state.patients.find((candidate) => candidate.id === patientId)
  const referable = item && (item.kind === 'Laboratory' || item.kind === 'Imaging')
  const partners = referable ? state.providers.filter((provider) => provider.active && provider.services.includes(item.kind as 'Laboratory' | 'Imaging')) : []
  const where = item && !item.inHouse && performAt === 'in-house' ? partners[0]?.id ?? 'in-house' : performAt
  const submit = () => {
    if (!target) { setError('Choose the patient this order is for.'); return }
    if (!title.trim()) { setError('Enter an order description.'); return }
    addOrder(target.id, title, item.kind, item.department, priority, referable && where !== 'in-house' ? where : undefined)
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={kind === 'Imaging' ? 'Request imaging' : kind === 'Laboratory' ? 'Request laboratory tests' : kind ? `Request ${kind.toLowerCase()}` : 'Place an order'} subtitle={target ? `${target.name} · Order will appear in the receiving worklist` : 'Order will appear in the receiving worklist'} size="md">
    <div className="form-grid">
      {!patient && <label className="form-field"><span>Patient <b>*</b></span><select value={patientId} onChange={(event) => { setPatientId(event.target.value); setError('') }}><option value="">Select a patient…</option>{state.patients.filter((candidate) => candidate.status !== 'discharged').map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.mrn} · {candidate.location}</option>)}</select></label>}
      <label className="form-field"><span>Order template</span><select value={template} onChange={(event) => { const index = Number(event.target.value); setTemplate(index); setTitle(templates[index].title); setPerformAt('in-house') }}>{templates.map((order, index) => <option key={`${order.kind}-${order.title}`} value={index}>{order.title}</option>)}</select></label>
      <label className="form-field"><span>Order description <b>*</b></span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="order-meta"><span><b>Destination</b>{item.kind === 'Blood bank' ? 'Blood bank' : item.kind === 'Physiotherapy' ? 'Physiotherapy' : item.kind === 'Nutrition' ? 'Nutrition and dietetics' : item.department === 'radiology' ? 'Radiology & Imaging' : item.department === 'laboratory' ? 'Clinical Laboratory' : 'Pharmacy'}</span><span><b>Type</b>{item.kind}</span></div>
      {referable && <label className="form-field"><span>Where it is done</span><select value={where} onChange={(event) => setPerformAt(event.target.value)}>{item.inHouse && <option value="in-house">In-house {item.kind === 'Imaging' ? 'radiology' : 'laboratory'}</option>}{partners.map((provider) => <option key={provider.id} value={provider.id}>Refer to {provider.name}</option>)}</select>{!item.inHouse && <small className="muted-text">Not available in-house — choose a referral partner.</small>}</label>}
      <div className="form-field"><span>Priority</span><div className="priority-control">{(['routine', 'urgent', 'emergent'] as Priority[]).map((value) => <button type="button" key={value} aria-pressed={priority === value} className={priority === value ? `active ${value}` : ''} onClick={() => setPriority(value)}>{value}</button>)}</div></div>
    </div>
    {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
    <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit}>Place order<Send size={16} /></Button></div>
  </Modal>
}

const locationNames: Record<DepartmentId, string> = {
  emergency: 'ED Bed 12', cardiology: 'CCU 09', neurology: 'Stroke Ward · Bed 04', radiology: 'Imaging Bay 02', laboratory: 'Laboratory collection room', icu: 'ICU Bed 16', surgery: 'Surgical 3B · Bed 15', ward: 'Ward 5S · Bed 18', pharmacy: 'Discharge Lounge', pediatrics: "Children's Ward · Bed 06", obgyn: 'Maternity 3S · Bed 09', 'internal-medicine': 'Medical 5N · Bed 14', ent: 'ENT Clinic 04', dermatology: 'Dermatology Clinic 03', oncology: 'Oncology unit · Bed 05'
}

export function TransferModal({ patient, open, onClose }: { patient: Patient; open: boolean; onClose: () => void }) {
  const { state, transferPatient } = useHospital()
  const destinations = state.departments.filter((department) => department.id !== patient.department)
  const [to, setTo] = useState<DepartmentId>('ward')
  const [location, setLocation] = useState(locationNames.ward)
  useEffect(() => { if (open) { const first = patient.department === 'ward' ? 'cardiology' : 'ward'; setTo(first); setLocation(locationNames[first] ?? '') } }, [open, patient.department])
  const destination = destinations.find((department) => department.id === to)
  const full = destination ? destination.occupied >= destination.capacity : true
  return <Modal open={open} onClose={onClose} title="Coordinate patient transfer" subtitle={`${patient.name} · From ${patient.location}`} size="md">
    <div className="form-grid">
      <label className="form-field"><span>Destination department</span><select value={to} onChange={(event) => { const value = event.target.value as DepartmentId; setTo(value); setLocation(locationNames[value] ?? '') }}>{destinations.map((department) => <option key={department.id} value={department.id} disabled={department.occupied >= department.capacity}>{department.name} — {department.capacity - department.occupied} spaces</option>)}</select></label>
      <label className="form-field"><span>Bed / location</span><input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
    </div>
    {destination && <div className={`capacity-banner ${full ? 'full' : ''}`}><BedDouble size={21} /><div><b>{destination.name}</b><span>{destination.occupied}/{destination.capacity} occupied · {destination.onCall} on call</span></div><strong>{Math.round(destination.occupied / destination.capacity * 100)}%</strong></div>}
    <div className="handoff-note"><Network size={17} /><span>Both departments, the patient location and the shared handoff timeline update together.</span></div>
    <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={full || !location.trim()} onClick={() => { transferPatient(patient.id, to, location); onClose() }}>Confirm transfer<ArrowRight size={17} /></Button></div>
  </Modal>
}

export function ResultModal({ order, open, onClose }: { order: ClinicalOrder; open: boolean; onClose: () => void }) {
  const { state, advanceOrder } = useHospital()
  const patient = state.patients.find((item) => item.id === order.patientId)
  const [result, setResult] = useState(order.result ?? '')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setResult(order.result ?? ''); setError('') } }, [open, order])
  return <Modal open={open} onClose={onClose} title="Release diagnostic result" subtitle={`${order.id} · ${order.title}`} size="md">
    <div className="context-banner"><FileCheck2 size={21} /><div><b>{patient?.name} · {patient?.mrn}</b><span>{order.priority} priority · Ordered by {order.createdBy}</span></div></div>
    <label className="form-field"><span>Verified findings / report <b>*</b></span><textarea autoFocus rows={7} value={result} onChange={(event) => { setResult(event.target.value); setError('') }} placeholder="Enter the verified result, key values and any comparison or clinical caveat…" /></label>
    <div className="handoff-note"><Info size={17} /><span>{order.kind === 'Laboratory' ? 'The result goes to “Awaiting verification” until a senior scientist or pathologist verifies it.' : 'Releasing this report makes it visible in the patient chart and the ordering clinician’s dashboard.'}</span></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (result.trim().length < 8) { setError('Enter a verified result before releasing.'); return } advanceOrder(order.id, result, order.kind === 'Laboratory' && !order.externalProviderId ? 3 : stagesFor(order).length - 1); onClose() }}>Verify & release<FileCheck2 size={17} /></Button></div>
  </Modal>
}

export function CompleteReferralModal({ referral, open, onClose }: { referral: Referral; open: boolean; onClose: () => void }) {
  const { state, updateReferral } = useHospital()
  const patient = state.patients.find((item) => item.id === referral.patientId)
  const [recommendation, setRecommendation] = useState(referral.recommendation ?? '')
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setRecommendation(referral.recommendation ?? ''); setError('') } }, [open, referral])
  return <Modal open={open} onClose={onClose} title="Complete consultation" subtitle={`${referral.id} · ${patient?.name}`} size="md">
    <div className="context-banner"><Network size={20} /><div><b>{referral.reason}</b><span>{referral.priority} referral from {referral.from}</span></div></div>
    <label className="form-field"><span>Specialist recommendation <b>*</b></span><textarea autoFocus rows={6} value={recommendation} onChange={(event) => { setRecommendation(event.target.value); setError('') }} placeholder="Document assessment, treatment recommendations, monitoring and follow-up responsibilities…" /></label>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (recommendation.trim().length < 12) { setError('Add a clear recommendation for the referring team.'); return } updateReferral(referral.id, 'completed', recommendation); onClose() }}>Send recommendation<Check size={17} /></Button></div>
  </Modal>
}