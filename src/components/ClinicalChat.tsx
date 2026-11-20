import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, AlertTriangle, ArrowRightLeft, ClipboardList, FileText, FlaskConical, HeartPulse, LogOut, MessageSquareText, Network, Pill, ScanLine, Send, Stethoscope, UserRound, type LucideIcon } from 'lucide-react'
import { ImageStrip } from './OrderImages'
import { makeErxCode } from '../lib/erx'
import { news2, newsTone, prescribingWarnings } from '../lib/clinical'
import { formatDate, formatTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Patient, Priority, TimelineEvent, Vitals } from '../types'
import { PRINTOUT, sentOutLabel } from '../lib/diagnostics'
import { RequestFormModal } from './RequestForm'
import { Avatar, Chip, OrderStepper } from './ui'

type Mode = 'history' | 'exam' | 'labs' | 'imaging' | 'medication' | 'vitals' | 'plan' | 'note'

const MODES: Array<{ id: Mode; label: string; icon: LucideIcon; placeholder: string }> = [
  { id: 'history', label: 'History', icon: UserRound, placeholder: 'Presenting complaint, onset, duration, associated symptoms… (tap a prompt above to start a line)' },
  { id: 'exam', label: 'Examination', icon: Stethoscope, placeholder: 'Findings by system… (tap a system above to add a normal finding, then edit)' },
  { id: 'labs', label: 'Investigation', icon: FlaskConical, placeholder: 'Pick tests above, or type another test and press Enter' },
  { id: 'imaging', label: 'Imaging', icon: ScanLine, placeholder: 'Pick a study above, or type one, plus the clinical question' },
  { id: 'medication', label: 'Medication', icon: Pill, placeholder: 'Indication (optional)' },
  { id: 'vitals', label: 'Vitals', icon: HeartPulse, placeholder: 'Comment (optional)' },
  { id: 'plan', label: 'Plan', icon: ClipboardList, placeholder: 'Assessment and plan: diagnosis, treatment, monitoring, disposition…' },
  { id: 'note', label: 'Note', icon: MessageSquareText, placeholder: 'Write a message to the care team…' },
]

const HISTORY_PROMPTS = ['Presenting complaint: ', 'Onset: ', 'Duration: ', 'Associated symptoms: ', 'Past medical history: ', 'Medicines: ', 'Allergies: ', 'Social history: ', 'Family history: ']
const EXAM_NORMALS: Array<[string, string]> = [
  ['General', 'General: alert, comfortable at rest, well perfused.'],
  ['Cardiovascular', 'CVS: heart sounds I + II, no murmurs, capillary refill < 2 s.'],
  ['Respiratory', 'Resp: equal air entry, vesicular breath sounds, no added sounds.'],
  ['Abdomen', 'Abdomen: soft, non-tender, no masses, bowel sounds present.'],
  ['Neurological', 'Neuro: GCS 15, pupils equal and reactive, no focal deficit.'],
  ['Musculoskeletal', 'MSK: full range of movement, no deformity or swelling.'],
  ['Skin', 'Skin: no rash, warm and well perfused.'],
  ['ENT', 'ENT: tympanic membranes normal, throat unremarkable.'],
]

function eventStyle(event: TimelineEvent): { icon: LucideIcon; label: string; tone: string } {
  const title = event.title.toLowerCase()
  if (title.startsWith('history')) return { icon: UserRound, label: 'History', tone: 'history' }
  if (title.startsWith('examination')) return { icon: Stethoscope, label: 'Examination', tone: 'exam' }
  if (title.startsWith('plan')) return { icon: ClipboardList, label: 'Plan', tone: 'plan' }
  if (title.startsWith('prescription')) return { icon: Pill, label: 'Medication', tone: 'order' }
  if (title.includes('observations')) return { icon: HeartPulse, label: 'Vitals', tone: 'vitals' }
  if (title.startsWith('escalated')) return { icon: AlertTriangle, label: 'Escalation', tone: 'alert' }
  switch (event.type) {
    case 'arrival': return { icon: UserRound, label: 'Arrival', tone: 'system' }
    case 'triage': return { icon: Activity, label: 'Triage', tone: 'triage' }
    case 'order': return { icon: event.title.match(/x-ray|ct |mri|ultrasound|scan|imaging|echo/i) ? ScanLine : FlaskConical, label: 'Order', tone: 'order' }
    case 'result': return { icon: FileText, label: 'Result', tone: 'result' }
    case 'referral': return { icon: Network, label: 'Referral', tone: 'order' }
    case 'transfer': return { icon: ArrowRightLeft, label: 'Movement', tone: 'system' }
    case 'discharge': return { icon: LogOut, label: 'Discharge', tone: 'system' }
    default: return { icon: MessageSquareText, label: 'Note', tone: 'note' }
  }
}

/** The patient's episode as a conversation, with a composer for history, examination, orders, vitals and plans. */
export default function ClinicalChat({ patient }: { patient: Patient }) {
  const { state, profile, can, addNote, addOrder, recordObservations, createPrescription } = useHospital()
  const canOrder = can('prescribe') || can('refer') || can('triage') || can('manage')
  const modes = MODES.filter((mode) => (['labs', 'imaging'].includes(mode.id) ? canOrder : mode.id === 'medication' ? can('prescribe') || can('manage') : mode.id === 'vitals' ? can('vitals') : mode.id === 'note' ? can('notes') : can('clinical-notes')))
  const [mode, setMode] = useState<Mode>(modes[0]?.id ?? 'note')
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>('urgent')
  const [vitals, setVitals] = useState({ hr: '', rr: '', spo2: '', bpSys: '', bpDia: '', temp: '' })
  const [onOxygen, setOnOxygen] = useState(false)
  const [medId, setMedId] = useState(state.formulary[0]?.id ?? '')
  const [rx, setRx] = useState({ dose: '', frequency: '', duration: '', quantity: '1' })
  const [takeHome, setTakeHome] = useState(patient.encounterType === 'outpatient' || patient.status === 'discharged')
  const [error, setError] = useState('')
  const [partner, setPartner] = useState('auto')
  const [section, setSection] = useState('All')
  const [printing, setPrinting] = useState<string[] | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const orders = useMemo(() => new Map(state.orders.map((order) => [order.id, order])), [state.orders])
  const events = useMemo(() => [...patient.timeline].sort((a, b) => a.at.localeCompare(b.at)), [patient.timeline])
  const current = MODES.find((item) => item.id === mode)!
  const med = state.formulary.find((item) => item.id === medId)
  const warnings = mode === 'medication' && med ? prescribingWarnings(med, patient, state.prescriptions, state.formulary) : []
  const vitalNumbers = Object.fromEntries(Object.entries(vitals).map(([key, value]) => [key, Number(value)])) as Record<keyof typeof vitals, number>
  const vitalsComplete = Object.values(vitals).every(Boolean)
  const preview = vitalsComplete && patient.age >= 16 ? news2({ ...vitalNumbers, gcs: 15, pain: 0 } as Vitals, onOxygen) : null
  const closed = patient.status === 'discharged'
  const orderKind = mode === 'imaging' ? 'Imaging' : 'Laboratory'
  const fullCatalogue = state.investigations.filter((item) => item.active && item.kind === orderKind)
  const sections = [...new Set(fullCatalogue.map((item) => item.section ?? 'Other'))]
  const catalogue = fullCatalogue.filter((item) => section === 'All' || (item.section ?? 'Other') === section)
  const partners = state.providers.filter((provider) => provider.active && provider.services.includes(orderKind))
  /** In-house when available (unless sent elsewhere), otherwise a printed request for an outside lab or centre. */
  const providerFor = (title: string) => {
    const item = fullCatalogue.find((entry) => entry.name === title)
    if (partner !== 'auto') return partner
    return item && !item.inHouse ? PRINTOUT : undefined
  }

  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }) }, [events.length])
  useEffect(() => { setPicked([]); setError(''); setPartner('auto'); setSection('All') }, [mode])

  const appendLine = (line: string) => {
    const el = inputRef.current
    el?.focus()
    setText((value) => (value && !value.endsWith('\n') ? `${value}\n${line}` : `${value}${line}`))
    window.setTimeout(() => { if (el) el.selectionStart = el.selectionEnd = el.value.length }, 0)
  }
  const toggle = (item: string) => setPicked((list) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]))

  const send = () => {
    setError('')
    const body = text.trim()
    if (mode === 'labs' || mode === 'imaging') {
      const typed = body.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
      const items = mode === 'imaging' && picked.length ? picked.map((study) => (body ? `${study} — ${body}` : study)) : [...picked, ...typed]
      if (!items.length) { setError(mode === 'labs' ? 'Pick at least one test.' : 'Pick or type a study.'); return }
      const sentOut = items.map((title) => { const where = providerFor(title.split(' — ')[0]); const id = addOrder(patient.id, title, mode === 'labs' ? 'Laboratory' : 'Imaging', mode === 'labs' ? 'laboratory' : 'radiology', priority, where); return where ? id : undefined }).filter((id): id is string => Boolean(id))
      if (sentOut.length) setPrinting(sentOut)
    } else if (mode === 'vitals') {
      if (!vitalsComplete) { setError('Enter all six observations.'); return }
      recordObservations(patient.id, { ...vitalNumbers, gcs: patient.vitals.gcs || 15, pain: patient.vitals.pain || 0 } as Vitals, onOxygen, 'Alert')
      if (body) addNote(patient.id, body, 'Vitals comment')
      setVitals({ hr: '', rr: '', spo2: '', bpSys: '', bpDia: '', temp: '' }); setOnOxygen(false)
    } else if (mode === 'medication') {
      if (!med || !rx.dose.trim() || !rx.frequency.trim() || !rx.duration.trim()) { setError('Choose a medicine and enter dose, frequency and duration.'); return }
      const code = takeHome ? makeErxCode() : undefined
      createPrescription({ patientId: patient.id, department: profile?.department ?? patient.department, priority: priority === 'emergent' ? 'STAT' : priority === 'urgent' ? 'Urgent' : 'Routine', diagnosis: body || undefined, items: [{ medicationId: med.id, dosage: rx.dose.trim(), frequency: rx.frequency.trim(), duration: rx.duration.trim(), quantity: Math.max(1, Number(rx.quantity) || 1) }], ...(code ? { eRx: { code, validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(), phone: patient.phone } } : {}) })
      addNote(patient.id, `${med.name} ${rx.dose.trim()} ${rx.frequency.trim()} for ${rx.duration.trim()}${body ? ` — ${body}` : ''}. ${code ? `e-Prescription ${code}: patient collects from the pharmacy.` : 'Sent to pharmacy.'}`, 'Prescription')
      setRx({ dose: '', frequency: '', duration: '', quantity: '1' })
    } else {
      if (body.length < 2) { setError('Write something to send.'); return }
      addNote(patient.id, body, { history: 'History', exam: 'Examination', plan: 'Plan', note: undefined }[mode as 'history' | 'exam' | 'plan' | 'note'])
    }
    setText(''); setPicked([])
  }

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() }
  }

  let lastDay = ''
  return (
    <div className="chat">
      <div className="chat-thread" ref={threadRef} aria-live="polite">
        {events.map((event) => {
          const day = formatDate(event.at)
          const divider = day !== lastDay ? <div className="chat-day" key={`d-${event.id}`}><span>{day}</span></div> : null
          lastDay = day
          const mine = event.author === profile?.name
          const style = eventStyle(event)
          const Icon = style.icon
          const order = event.orderId ? orders.get(event.orderId) : undefined
          return [divider,
            <motion.div key={event.id} className={`chat-row ${mine ? 'mine' : ''} tone-${style.tone}`} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}>
              {!mine && <Avatar name={event.author} size="sm" />}
              <div className="chat-bubble">
                <div className="chat-meta"><span className="chat-kind"><Icon size={12} />{style.label}</span><b>{mine ? 'You' : event.author}</b><time>{formatTime(event.at)}</time></div>
                <p className="chat-title">{event.title.replace(/^(History|Examination|Plan|Prescription)( \(awaiting co-signature\))?$/, (_, word, pending) => pending ? `${word} · awaiting co-signature` : '')}</p>
                <p className="chat-text">{event.detail}</p>
                {order && event.type === 'order' && <div className="chat-order">{order.externalProviderId && <Chip tone="warning">{sentOutLabel(order, state.providers)}</Chip>}<OrderStepper order={order} />{order.result && <p className="chat-result"><FileText size={13} />{order.result}</p>}<ImageStrip order={order} compact /></div>}
                {order && event.type === 'result' && event.title.startsWith('Images attached') && <ImageStrip order={order} compact />}
              </div>
            </motion.div>]
        })}
        {events.length === 0 && <p className="record-hint">No entries yet. Start with the history below.</p>}
      </div>

      {!closed && modes.length > 0 && (
        <div className="chat-composer">
          {!can('clinical-notes') && <p className="chat-readonly">You can read the whole record. History, examination, vitals and plans are written by the clinical team; add a note for them here.</p>}
          <div className="chat-modes" role="tablist" aria-label="Entry type">
            {modes.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={mode === id} className={mode === id ? 'active' : ''} onClick={() => { setMode(id); inputRef.current?.focus() }}><Icon size={14} />{label}</button>)}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} className="chat-picks" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              {mode === 'history' && HISTORY_PROMPTS.map((prompt) => <button key={prompt} type="button" className="pick" onMouseDown={(event) => event.preventDefault()} onClick={() => appendLine(prompt)}>+ {prompt.replace(': ', '')}</button>)}
              {mode === 'exam' && EXAM_NORMALS.map(([label, line]) => <button key={label} type="button" className="pick" onMouseDown={(event) => event.preventDefault()} onClick={() => appendLine(line)}>+ {label} normal</button>)}
              {(mode === 'labs' || mode === 'imaging') && <>
                {catalogue.map(({ name: item, inHouse }) => <button key={item} type="button" className={`pick ${picked.includes(item) ? 'on' : ''} ${inHouse ? '' : 'external'}`} aria-pressed={picked.includes(item)} title={inHouse ? 'Done here' : 'Not done here: printed request for an outside lab or centre'} onClick={() => toggle(item)}>{picked.includes(item) ? '✓ ' : ''}{item}{!inHouse && <span className="pick-tag">outside</span>}</button>)}
                <span className="pick-sep" />
                {(['routine', 'urgent', 'emergent'] as Priority[]).map((value) => <button key={value} type="button" className={`pick priority ${priority === value ? `on ${value}` : ''}`} onClick={() => setPriority(value)}>{value}</button>)}
                <label className="pick-select"><span>{orderKind === 'Imaging' ? 'Modality' : 'Section'}</span><select value={section} onChange={(event) => setSection(event.target.value)}><option value="All">All</option>{sections.map((name) => <option key={name}>{name}</option>)}</select></label>
                <label className="pick-select"><span>Send to</span><select value={partner} onChange={(event) => setPartner(event.target.value)}><option value="auto">Here when available</option><option value={PRINTOUT}>Outside · printed request</option>{partners.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
              </>}
              {mode === 'vitals' && <div className="chat-vitals">
                {([['hr', 'HR'], ['rr', 'RR'], ['spo2', 'SpO₂'], ['bpSys', 'SBP'], ['bpDia', 'DBP'], ['temp', 'Temp']] as Array<[keyof typeof vitals, string]>).map(([key, label]) => <label key={key}><span>{label}</span><input type="number" step={key === 'temp' ? 0.1 : 1} value={vitals[key]} onChange={(event) => setVitals({ ...vitals, [key]: event.target.value })} /></label>)}
                <label className="remember-row"><input type="checkbox" checked={onOxygen} onChange={(event) => setOnOxygen(event.target.checked)} />On O₂</label>
                {preview && <Chip tone={newsTone(preview.score)}>NEWS2 {preview.score}</Chip>}
              </div>}
              {mode === 'medication' && <div className="chat-vitals">
                <label className="wide"><span>Medicine</span><select value={medId} onChange={(event) => setMedId(event.target.value)}>{state.formulary.map((item) => <option key={item.id} value={item.id}>{item.name} {item.strength}</option>)}</select></label>
                <label><span>Dose</span><input value={rx.dose} onChange={(event) => setRx({ ...rx, dose: event.target.value })} placeholder="500 mg" /></label>
                <label><span>Frequency</span><input value={rx.frequency} onChange={(event) => setRx({ ...rx, frequency: event.target.value })} placeholder="8-hourly" /></label>
                <label><span>Duration</span><input value={rx.duration} onChange={(event) => setRx({ ...rx, duration: event.target.value })} placeholder="5 days" /></label>
                <label><span>Qty</span><input type="number" min={1} value={rx.quantity} onChange={(event) => setRx({ ...rx, quantity: event.target.value })} /></label>
                {(['routine', 'urgent', 'emergent'] as Priority[]).map((value) => <button key={value} type="button" className={`pick priority ${priority === value ? `on ${value}` : ''}`} onClick={() => setPriority(value)}>{value === 'emergent' ? 'STAT' : value}</button>)}
                <button type="button" className={`pick ${takeHome ? 'on' : ''}`} aria-pressed={takeHome} onClick={() => setTakeHome(!takeHome)} title="Patient collects from the pharmacy with an e-prescription code">e-Rx · patient collects</button>
              </div>}
            </motion.div>
          </AnimatePresence>
          {warnings.length > 0 && <div className="rx-warnings chat-warnings">{warnings.map((warning, index) => <p key={index} className={warning.level === 'High' ? 'danger' : 'warning'}><AlertTriangle size={13} />{warning.text}</p>)}</div>}

          <div className="chat-input">
            <textarea ref={inputRef} rows={text.split('\n').length > 2 ? 4 : 2} value={text} onChange={(event) => { setText(event.target.value); setError('') }} onKeyDown={onKey} placeholder={current.placeholder} aria-label={`${current.label} entry`} />
            <motion.button type="button" className="chat-send" onClick={send} whileTap={{ scale: 0.9 }} aria-label={`Send ${current.label.toLowerCase()}`}><Send size={18} /></motion.button>
          </div>
          <div className="chat-hint">{error ? <span className="danger-text" role="alert">{error}</span> : <span><span className="kbd">Enter</span> to send · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> for a new line</span>}{(mode === 'labs' || mode === 'imaging') && picked.length > 0 && <b>{picked.length} selected · {priority}</b>}</div>
        </div>
      )}
      {printing && <RequestFormModal orderIds={printing} onClose={() => setPrinting(null)} />}
    </div>
  )
}
