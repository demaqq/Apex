import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BellRing, CalendarPlus, Camera, ClipboardCheck, Copy, ExternalLink, Link2, MessageSquareText, MonitorPlay, Send, ShieldCheck, Star, Timer, Users, Video, Zap } from 'lucide-react'
import { Button, Chip, EmptyState, Metric, Modal, PageHeader, Panel, Tabs } from '../components/ui'
import { inviteText, TeleRoom } from '../components/TeleRoom'
import { watchWaitingRoom } from '../lib/telecall'
import { averageRating, onDemandQueue, phqBand, selfHarmFlag, total } from '../lib/telehealth'
import { formatCurrency, formatDateTime, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Appointment, MessageThread } from '../types'

type View = 'queue' | 'today' | 'upcoming' | 'messages' | 'completed'
const DAY = 86_400_000

/** Patient-facing links (work with either router). */
export function portalLink() {
  const { origin, pathname } = window.location
  return import.meta.env.VITE_HASH_ROUTER === '1' ? `${origin}${pathname}#/care` : `${origin}/care`
}

/** Video consultations: on-demand queue, virtual waiting room, booked visits, secure messages and history. */
export default function Telemedicine() {
  const { state, profile, notify, claimOnDemand, sendVisitReminder, cancelVideoVisit } = useHospital()
  const [view, setView] = useState<View>('queue')
  const [room, setRoom] = useState<Appointment | null>(null)
  const [scheduling, setScheduling] = useState<{ patientId?: string; reason?: string } | null>(null)
  const [waiting, setWaiting] = useState<Record<string, string>>({})
  const [photo, setPhoto] = useState<string | null>(null)
  const me = profile?.name ?? ''
  const video = state.appointments.filter((item) => item.mode === 'Video')
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999)
  const queue = onDemandQueue(state.appointments)
  const open = video.filter((item) => (item.status === 'Scheduled' || item.status === 'In progress') && !(item.onDemand && !item.clinician))
  const today = open.filter((item) => Date.parse(item.startsAt) <= endOfDay.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const upcoming = open.filter((item) => Date.parse(item.startsAt) > endOfDay.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const completed = video.filter((item) => item.status === 'Completed').sort((a, b) => (b.endedAt ?? b.startsAt).localeCompare(a.endedAt ?? a.startsAt))
  const recent = completed.filter((item) => Date.now() - Date.parse(item.endedAt ?? item.startsAt) <= 30 * DAY)
  const minutes = (item: Appointment) => item.startedAt && item.endedAt ? Math.max(1, Math.round((Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 60_000)) : item.durationMinutes
  const openThreads = state.messageThreads.filter((item) => item.status === 'Awaiting reply')
  const overdue = openThreads.filter((item) => Date.parse(item.dueAt) < Date.now())
  const rating = averageRating(recent)
  const watched = [...open, ...queue]
  const codes = useMemo(() => watched.map((item) => item.joinCode).filter(Boolean) as string[], [watched.map((item) => item.joinCode).join()])
  const longest = queue[0] ? Math.max(0, Math.round((Date.now() - Date.parse(queue[0].queuedAt ?? queue[0].startsAt)) / 60_000)) : 0

  // Live: which patients have opened their join page.
  useEffect(() => watchWaitingRoom(codes, (code, name) => setWaiting((list) => list[code] === name ? list : { ...list, [code]: name }), (code) => setWaiting((list) => { const next = { ...list }; delete next[code]; return next })), [codes])

  const patientOf = (item: { patientId: string }) => state.patients.find((patient) => patient.id === item.patientId)
  // Confidential (mental-health) visits show their reason only to the treating clinician.
  const hidden = (item: Appointment) => item.confidential && item.clinician !== me
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); notify(`${what} copied`) } catch { notify('Copy failed', 'warning') } }
  const pickUp = (item: Appointment) => { claimOnDemand(item.id); setRoom({ ...item, clinician: me }) }

  const card = (item: Appointment) => {
    const patient = patientOf(item)
    const here = item.joinCode ? waiting[item.joinCode] : undefined
    const phq = total(item.intake?.phq9)
    return (
      <article key={item.id} className={`work-card tele-card ${here ? 'here' : ''}`}>
        <header><div><b>{patient?.name ?? 'Patient'}</b><small>{item.onDemand && !item.clinician ? `Waiting ${relativeTime(item.queuedAt ?? item.startsAt).replace(' ago', '')}` : `${formatDateTime(item.startsAt)} · ${item.durationMinutes} min · ${item.clinician}`}</small></div>
          {item.status === 'Completed' ? <Chip tone="success">Completed · {minutes(item)} min</Chip> : here ? <Chip tone="warning">Patient waiting</Chip> : item.status === 'In progress' ? <Chip tone="accent">In progress</Chip> : item.onDemand && !item.clinician ? <Chip tone="warning"><Zap size={11} /> On demand</Chip> : <Chip tone="neutral">{relativeTime(item.startsAt)}</Chip>}
        </header>
        <p className="work-card-reason">{hidden(item) ? 'Confidential visit' : item.reason}</p>
        {!hidden(item) && item.intake && item.status !== 'Completed' && <p className="tele-intake-line">{item.intake.symptoms}{item.intake.since ? ` · ${item.intake.since}` : ''}</p>}
        <div className="tele-chips">
          {item.service && <Chip tone={item.service === 'Mental health' ? 'accent' : 'neutral'}>{item.service}</Chip>}
          {item.joinCode && <Chip tone="neutral"><Link2 size={11} /> Code <span className="mono">{item.joinCode}</span></Chip>}
          {item.intake && <Chip tone="success"><ClipboardCheck size={11} /> Intake</Chip>}
          {!hidden(item) && item.intake?.photos.length ? <button type="button" className="chip-button" onClick={() => setPhoto(item.intake!.photos[0])}><Chip tone="neutral"><Camera size={11} /> {item.intake.photos.length} photo{item.intake.photos.length === 1 ? '' : 's'}</Chip></button> : null}
          {!hidden(item) && item.intake?.phq9 && <Chip tone={phq >= 15 ? 'danger' : phq >= 10 ? 'warning' : 'neutral'}>PHQ-9 {phq} · {phqBand(phq)}</Chip>}
          {!hidden(item) && selfHarmFlag(item.intake?.phq9) && <Chip tone="danger"><AlertTriangle size={11} /> Safety check today</Chip>}
          {item.payment && <Chip tone={item.payment.refundedAt ? 'neutral' : 'success'}>{item.payment.refundedAt ? 'Refunded' : item.payment.payer === 'Insurance' || item.payment.payer === 'Corporate plan' ? `Claim · ${item.payment.insurer ?? item.payment.payer}` : `Paid ${formatCurrency(item.payment.amount)}`}</Chip>}
          {item.reminders?.sent.length ? <Chip tone="neutral"><BellRing size={11} /> Reminded {relativeTime(item.reminders.sent[item.reminders.sent.length - 1].at)}</Chip> : null}
          {item.consentAt ? <Chip tone="success"><ShieldCheck size={11} /> Consent</Chip> : null}
          {here && <Chip tone="warning">{here} has joined</Chip>}
          {item.rating && <Chip tone="neutral">{'★'.repeat(item.rating.stars)}{'☆'.repeat(5 - item.rating.stars)}</Chip>}
          {item.summary && <Chip tone="success">Summary shared</Chip>}
        </div>
        {item.rating?.comment && !hidden(item) && <p className="record-hint">“{item.rating.comment}”</p>}
        {item.status !== 'Completed' && (
          <footer>
            {item.onDemand && !item.clinician
              ? <Button size="sm" icon={MonitorPlay} onClick={() => pickUp(item)}>Pick up and start</Button>
              : <>
                <Button size="sm" variant="secondary" icon={Copy} onClick={() => patient && copy(inviteText(item, state.settings.name, patient.name), 'Invitation')}>Invitation</Button>
                {item.status === 'Scheduled' && !item.onDemand && <Button size="sm" variant="ghost" icon={BellRing} onClick={() => sendVisitReminder(item.id)}>Remind</Button>}
                {item.status === 'Scheduled' && <Button size="sm" variant="ghost" onClick={() => cancelVideoVisit(item.id, 'Staff')}>{item.payment ? 'Cancel & refund' : 'Cancel'}</Button>}
                <Button size="sm" icon={MonitorPlay} disabled={hidden(item)} onClick={() => setRoom(item)}>{item.status === 'In progress' ? 'Rejoin' : here ? 'Admit and start' : 'Start visit'}</Button>
              </>}
          </footer>
        )}
      </article>
    )
  }

  const list = view === 'queue' ? queue : view === 'today' ? today : view === 'upcoming' ? upcoming : completed

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Clinical care · Telemedicine" title="Video consultations" description="Patients see a doctor now or book from the patient portal, pay up front, and fill in their symptoms, medicines and photos before you join. Notes, home vitals, e-prescriptions to their chosen pharmacy and an after-visit summary go straight to the record."
        actions={<><Button variant="secondary" icon={ExternalLink} onClick={() => copy(portalLink(), 'Patient portal link')}>Patient portal link</Button><Button icon={CalendarPlus} onClick={() => setScheduling({})}>Schedule video visit</Button></>} />
      <div className="metrics-grid">
        <Metric label="On-demand queue" value={queue.length} detail={queue.length ? `Longest wait ${longest} min` : 'No one waiting'} icon={Timer} tone="amber" />
        <Metric label="Booked today" value={today.length} detail={`${today.filter((item) => item.status === 'In progress').length} in progress · ${Object.keys(waiting).length} on their join page`} icon={Video} tone="blue" />
        <Metric label="Messages to answer" value={openThreads.length} detail={overdue.length ? `${overdue.length} past the 1-day reply time` : 'All within the reply time'} icon={MessageSquareText} tone="coral" />
        <Metric label="Patient rating (30 days)" value={rating ? `${rating.average.toFixed(1)} ★` : '—'} detail={rating ? `${rating.count} rating${rating.count === 1 ? '' : 's'} · ${recent.length} visits` : `${recent.length} completed visits`} icon={Star} tone="teal" />
      </div>
      <Tabs<View> label="Video visits" value={view} onChange={setView} options={[
        { value: 'queue', label: 'On-demand queue', count: queue.length || undefined },
        { value: 'today', label: 'Waiting room · today', count: today.length || undefined },
        { value: 'upcoming', label: 'Upcoming', count: upcoming.length || undefined },
        { value: 'messages', label: 'Messages', count: openThreads.length || undefined },
        { value: 'completed', label: 'Completed' },
      ]} />
      {view === 'messages' ? <MessagesInbox onVideo={(thread) => setScheduling({ patientId: thread.patientId, reason: thread.subject })} /> : <>
        <div className="trainee-grid">{list.map(card)}</div>
        {list.length === 0 && <Panel><EmptyState icon={view === 'queue' ? Users : Video} title={view === 'queue' ? 'No one in the on-demand queue' : view === 'completed' ? 'No completed video visits yet' : 'No video visits'} text={view === 'queue' ? 'Patients who choose “See a doctor now” on the patient portal wait here.' : view === 'completed' ? 'Completed visits appear here with their length, summary and rating.' : 'Schedule a video visit, or share the patient portal link so patients can book.'} /></Panel>}
      </>}
      {room && <TeleRoom appointment={room} onClose={() => setRoom(null)} />}
      {scheduling && <ScheduleVideo preset={scheduling} onClose={() => setScheduling(null)} />}
      {photo && <Modal open onClose={() => setPhoto(null)} title="Patient photo" size="md"><img src={photo} alt="Photo from the patient" className="tele-photo-large" /></Modal>}
    </motion.div>
  )
}

/** Secure messages from patients, answered within one working day. */
function MessagesInbox({ onVideo }: { onVideo: (thread: MessageThread) => void }) {
  const { state, profile, replyThread } = useHospital()
  const threads = [...state.messageThreads].sort((a, b) => (a.status === 'Awaiting reply' ? 0 : 1) - (b.status === 'Awaiting reply' ? 0 : 1) || a.dueAt.localeCompare(b.dueAt))
  const [openId, setOpenId] = useState<string | null>(threads[0]?.id ?? null)
  const [text, setText] = useState('')
  const thread = threads.find((item) => item.id === openId)
  const patient = thread && state.patients.find((item) => item.id === thread.patientId)
  const mine = (item: MessageThread) => !item.confidential || item.department === profile?.department || item.clinician === profile?.name
  if (threads.length === 0) return <Panel><EmptyState icon={MessageSquareText} title="No patient messages" text="Questions patients send from the portal appear here." /></Panel>
  return (
    <div className="tele-inbox">
      <aside>{threads.map((item) => {
        const late = item.status === 'Awaiting reply' && Date.parse(item.dueAt) < Date.now()
        return <button key={item.id} type="button" className={`portal-thread ${item.id === openId ? 'on' : ''}`} onClick={() => { setOpenId(item.id); setText('') }}><b>{mine(item) ? item.subject : 'Confidential message'}</b><small>{state.patients.find((p) => p.id === item.patientId)?.name} · {state.departments.find((d) => d.id === item.department)?.shortName}</small><small className={late ? 'late' : ''}>{item.status === 'Awaiting reply' ? (late ? `Overdue since ${relativeTime(item.dueAt).replace(' ago', '')}` : `Reply ${relativeTime(item.dueAt)}`) : item.status}</small></button>
      })}</aside>
      {thread && <Panel title={mine(thread) ? thread.subject : 'Confidential message'} action={<Chip tone={thread.status === 'Awaiting reply' ? 'warning' : thread.status === 'Answered' ? 'success' : 'neutral'}>{thread.status}</Chip>}>
        <p className="record-hint">{patient?.name} · <span className="mono">{patient?.mrn}</span> · {formatCurrency(thread.fee)} paid · opened {formatDateTime(thread.openedAt)}</p>
        {mine(thread) ? <>
          <div className="portal-chat">{thread.messages.map((line) => <div key={line.id} className={line.from === 'Clinician' ? 'me' : ''}><b>{line.name}</b><p>{line.text}</p>{line.photos?.length ? <div className="portal-photos">{line.photos.map((src, index) => <figure key={index}><img src={src} alt={`Patient photo ${index + 1}`} /></figure>)}</div> : null}<small>{formatDateTime(line.at)}</small></div>)}</div>
          {thread.status !== 'Closed' && <>
            <label className="form-field"><span>Reply</span><textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} aria-label="Reply to the patient" /></label>
            <div className="tele-actions">
              <Button icon={Send} disabled={!text.trim()} onClick={() => { replyThread(thread.id, text, false); setText('') }}>Reply</Button>
              <Button variant="secondary" disabled={!text.trim()} onClick={() => { replyThread(thread.id, text, true); setText('') }}>Reply and close</Button>
              <Button variant="ghost" icon={Video} onClick={() => onVideo(thread)}>Book a video visit instead</Button>
            </div>
          </>}
        </> : <p className="record-hint"><ShieldCheck size={13} /> This message is confidential to the {state.departments.find((d) => d.id === thread.department)?.name} team.</p>}
      </Panel>}
    </div>
  )
}

function ScheduleVideo({ onClose, preset }: { onClose: () => void; preset: { patientId?: string; reason?: string } }) {
  const { state, profile, scheduleAppointment } = useHospital()
  const soon = new Date(Date.now() + 3_600_000); soon.setMinutes(0, 0, 0)
  const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  const [patientId, setPatientId] = useState(preset.patientId ?? '')
  const [startsAt, setStartsAt] = useState(local(soon))
  const [duration, setDuration] = useState(20)
  const [reason, setReason] = useState(preset.reason ?? '')
  const patient = state.patients.find((item) => item.id === patientId)
  const valid = Boolean(patient) && reason.trim().length >= 3
  return (
    <Modal open onClose={onClose} title="Schedule a video visit" subtitle="A visit code and invitation are created; the patient is reminded by SMS" size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field span-2"><span>Patient</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Select a patient…</option>{state.patients.filter((item) => item.status !== 'awaiting-payment').map((item) => <option key={item.id} value={item.id}>{item.name} · {item.mrn}</option>)}</select></label>
        <label className="form-field"><span>Date and time</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
        <label className="form-field"><span>Length</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[10, 15, 20, 30, 45].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label>
        <label className="form-field span-2"><span>Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Blood pressure review, results discussion" /></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={CalendarPlus} disabled={!valid} onClick={() => { if (!patient) return; scheduleAppointment({ patientId: patient.id, department: profile?.department ?? patient.department, clinician: profile?.name ?? patient.assignedTo, startsAt: new Date(startsAt).toISOString(), durationMinutes: duration, mode: 'Video', reason: reason.trim(), bookedBy: 'Staff', service: 'General practice', reminders: { channels: ['SMS'], phone: patient.phone, sent: [] } }); onClose() }}>Schedule</Button></div>
    </Modal>
  )
}
