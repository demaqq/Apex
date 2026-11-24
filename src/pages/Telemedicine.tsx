import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarPlus, Clock3, Copy, Link2, MonitorPlay, ShieldCheck, Users, Video } from 'lucide-react'
import { Button, Chip, EmptyState, Metric, Modal, PageHeader, Panel, Tabs } from '../components/ui'
import { inviteText, TeleRoom } from '../components/TeleRoom'
import { watchWaitingRoom } from '../lib/telecall'
import { formatDateTime, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Appointment } from '../types'

type View = 'today' | 'upcoming' | 'completed'
const DAY = 86_400_000

/** Video consultations: virtual waiting room, invitations, the consultation room and history. */
export default function Telemedicine() {
  const { state, notify } = useHospital()
  const [view, setView] = useState<View>('today')
  const [room, setRoom] = useState<Appointment | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [waiting, setWaiting] = useState<Record<string, string>>({})
  const video = state.appointments.filter((item) => item.mode === 'Video')
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999)
  const open = video.filter((item) => item.status === 'Scheduled' || item.status === 'In progress')
  const today = open.filter((item) => Date.parse(item.startsAt) <= endOfDay.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const upcoming = open.filter((item) => Date.parse(item.startsAt) > endOfDay.getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const completed = video.filter((item) => item.status === 'Completed').sort((a, b) => (b.endedAt ?? b.startsAt).localeCompare(a.endedAt ?? a.startsAt))
  const recent = completed.filter((item) => Date.now() - Date.parse(item.endedAt ?? item.startsAt) <= 30 * DAY)
  const minutes = (item: Appointment) => item.startedAt && item.endedAt ? Math.max(1, Math.round((Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 60_000)) : item.durationMinutes
  const codes = useMemo(() => open.map((item) => item.joinCode).filter(Boolean) as string[], [open.map((item) => item.joinCode).join()])

  // Live: which patients have opened their join page.
  useEffect(() => watchWaitingRoom(codes, (code, name) => setWaiting((list) => list[code] === name ? list : { ...list, [code]: name }), (code) => setWaiting((list) => { const next = { ...list }; delete next[code]; return next })), [codes])

  const patientOf = (item: Appointment) => state.patients.find((patient) => patient.id === item.patientId)
  const copyInvite = async (item: Appointment) => {
    const patient = patientOf(item)
    try { await navigator.clipboard.writeText(inviteText(item, state.settings.name, patient?.name ?? 'Patient')); notify('Invitation copied — send it by SMS, Telegram or email') } catch { notify('Copy failed', 'warning') }
  }
  const list = view === 'today' ? today : view === 'upcoming' ? upcoming : completed

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Clinical care · Telemedicine" title="Video consultations" description="Patients join from any phone or computer with a visit code — no app or account. Consent is recorded, calls are encrypted end to end and never recorded, and notes, home vitals, e-prescriptions and orders go straight to the record."
        actions={<Button icon={CalendarPlus} onClick={() => setScheduling(true)}>Schedule video visit</Button>} />
      <div className="metrics-grid">
        <Metric label="Today" value={today.length} detail={`${today.filter((item) => item.status === 'In progress').length} in progress`} icon={Video} tone="blue" />
        <Metric label="In the waiting room" value={Object.keys(waiting).length} detail="Patients on their join page now" icon={Users} tone="amber" />
        <Metric label="Completed (30 days)" value={recent.length} detail={`${recent.filter((item) => item.consentAt).length} with recorded consent`} icon={ShieldCheck} tone="teal" />
        <Metric label="Average length" value={recent.length ? `${Math.round(recent.reduce((sum, item) => sum + minutes(item), 0) / recent.length)} min` : '—'} detail="Completed video visits" icon={Clock3} tone="coral" />
      </div>
      <Tabs<View> label="Video visits" value={view} onChange={setView} options={[{ value: 'today', label: 'Waiting room · today', count: today.length || undefined }, { value: 'upcoming', label: 'Upcoming', count: upcoming.length || undefined }, { value: 'completed', label: 'Completed' }]} />
      <div className="trainee-grid">
        {list.map((item) => {
          const patient = patientOf(item)
          const here = item.joinCode ? waiting[item.joinCode] : undefined
          return (
            <article key={item.id} className={`work-card tele-card ${here ? 'here' : ''}`}>
              <header><div><b>{patient?.name ?? 'Patient'}</b><small>{formatDateTime(item.startsAt)} · {item.durationMinutes} min · {item.clinician}</small></div>{item.status === 'Completed' ? <Chip tone="success">Completed · {minutes(item)} min</Chip> : here ? <Chip tone="warning">Patient waiting</Chip> : item.status === 'In progress' ? <Chip tone="accent">In progress</Chip> : <Chip tone="neutral">{relativeTime(item.startsAt)}</Chip>}</header>
              <p className="work-card-reason">{item.reason}</p>
              <div className="tele-chips">{item.joinCode && <Chip tone="neutral"><Link2 size={11} /> Code <span className="mono">{item.joinCode}</span></Chip>}{item.consentAt ? <Chip tone="success"><ShieldCheck size={11} /> Consent</Chip> : null}{here && <Chip tone="warning">{here} has joined</Chip>}</div>
              {item.status !== 'Completed' && <footer><Button size="sm" variant="secondary" icon={Copy} onClick={() => copyInvite(item)}>Copy invitation</Button><Button size="sm" icon={MonitorPlay} onClick={() => setRoom(item)}>{item.status === 'In progress' ? 'Rejoin' : here ? 'Admit and start' : 'Start visit'}</Button></footer>}
            </article>
          )
        })}
      </div>
      {list.length === 0 && <Panel><EmptyState icon={Video} title={view === 'completed' ? 'No completed video visits yet' : 'No video visits'} text={view === 'completed' ? 'Completed visits appear here with their length and consent.' : 'Schedule a video visit and send the patient the invitation.'} /></Panel>}
      {room && <TeleRoom appointment={room} onClose={() => setRoom(null)} />}
      {scheduling && <ScheduleVideo onClose={() => setScheduling(false)} />}
    </motion.div>
  )
}

function ScheduleVideo({ onClose }: { onClose: () => void }) {
  const { state, profile, scheduleAppointment } = useHospital()
  const soon = new Date(Date.now() + 3_600_000); soon.setMinutes(0, 0, 0)
  const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  const [patientId, setPatientId] = useState('')
  const [startsAt, setStartsAt] = useState(local(soon))
  const [duration, setDuration] = useState(20)
  const [reason, setReason] = useState('')
  const patient = state.patients.find((item) => item.id === patientId)
  const valid = Boolean(patient) && reason.trim().length >= 3
  return (
    <Modal open onClose={onClose} title="Schedule a video visit" subtitle="A visit code and invitation are created for the patient" size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field span-2"><span>Patient</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Select a patient…</option>{state.patients.filter((item) => item.status !== 'awaiting-payment').map((item) => <option key={item.id} value={item.id}>{item.name} · {item.mrn}</option>)}</select></label>
        <label className="form-field"><span>Date and time</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
        <label className="form-field"><span>Length</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[10, 15, 20, 30, 45].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></label>
        <label className="form-field span-2"><span>Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Blood pressure review, results discussion" /></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={CalendarPlus} disabled={!valid} onClick={() => { if (!patient) return; scheduleAppointment({ patientId: patient.id, department: profile?.department ?? patient.department, clinician: profile?.name ?? patient.assignedTo, startsAt: new Date(startsAt).toISOString(), durationMinutes: duration, mode: 'Video', reason: reason.trim() }); onClose() }}>Schedule</Button></div>
    </Modal>
  )
}
