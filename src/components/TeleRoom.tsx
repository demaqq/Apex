import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarPlus, Copy, FilePenLine, FlaskConical, HeartPulse, MessageSquareText, Mic, MicOff, MonitorUp, PhoneOff, Pill, Send, ShieldCheck, UserRound, Video, VideoOff } from 'lucide-react'
import { Button, Chip } from './ui'
import { EPrescribeModal } from './EPrescription'
import { OrderModal } from './ClinicalModals'
import { openMedia, TeleCall, type ChatLine } from '../lib/telecall'
import { formatDateTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Appointment, Vitals } from '../types'

type Tab = 'patient' | 'note' | 'vitals' | 'care' | 'chat'

/** The link a patient opens to join (works with either router). */
export function joinLink(code: string) {
  const { origin, pathname } = window.location
  return import.meta.env.VITE_HASH_ROUTER === '1' ? `${origin}${pathname}#/join/${code}` : `${origin}/join/${code}`
}

export const inviteText = (apt: Appointment, facility: string, patientName: string) =>
  `${patientName}, your video visit with ${apt.clinician} (${facility}) is on ${formatDateTime(apt.startsAt)}. Join: ${joinLink(apt.joinCode ?? '')} · Visit code ${apt.joinCode}. Find a quiet, private place.`

/** The clinician's video consultation room: video, controls and clinical tools side by side. */
export function TeleRoom({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { state, profile, can, addNote, recordObservations, scheduleAppointment, startTeleconsult, recordTeleConsent, finishTeleconsult, notify } = useHospital()
  const apt = state.appointments.find((item) => item.id === appointment.id) ?? appointment
  const patient = state.patients.find((item) => item.id === apt.patientId)
  const code = apt.joinCode ?? ''
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const call = useRef<TeleCall | null>(null)
  const media = useRef<MediaStream | null>(null)
  const [problem, setProblem] = useState('')
  const [status, setStatus] = useState<'starting' | 'waiting' | 'connecting' | 'connected' | 'ended'>('starting')
  const [peer, setPeer] = useState('')
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [tab, setTab] = useState<Tab>('patient')
  const [chat, setChat] = useState<ChatLine[]>([])
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState(0)
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' })
  const [vitals, setVitals] = useState({ hr: '', rr: '', spo2: '', bpSys: '', bpDia: '', temp: '' })
  const [prescribing, setPrescribing] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let cancelled = false
    startTeleconsult(apt.id)
    void openMedia().then(({ stream, problem: issue }) => {
      if (cancelled) { stream?.getTracks().forEach((track) => track.stop()); return }
      media.current = stream
      if (issue) setProblem(issue)
      if (localVideo.current && stream) localVideo.current.srcObject = stream
      const tele = new TeleCall(code, 'clinician', profile?.name ?? 'Clinician', stream)
      tele.onState = (next) => setStatus(next)
      tele.onRemoteStream = (remote) => { if (remoteVideo.current) remoteVideo.current.srcObject = remote }
      tele.onPeerName = (name, consent) => { setPeer(name); if (consent) recordTeleConsent(apt.id) }
      tele.onChat = (line) => setChat((list) => [...list, line])
      call.current = tele
      tele.start()
    })
    return () => { cancelled = true; call.current?.end(); media.current?.getTracks().forEach((track) => track.stop()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'connected') return
    const timer = window.setInterval(() => setSeconds((value) => { if (value % 60 === 0) window.dispatchEvent(new Event('careos-active')); return value + 1 }), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  const toggleMic = () => { media.current?.getAudioTracks().forEach((track) => { track.enabled = !mic }); setMic(!mic) }
  const toggleCam = () => { media.current?.getVideoTracks().forEach((track) => { track.enabled = !cam }); setCam(!cam) }
  const share = async () => {
    if (sharing) { call.current?.replaceVideo(media.current?.getVideoTracks()[0] ?? null); setSharing(false); return }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const track = screen.getVideoTracks()[0]
      call.current?.replaceVideo(track)
      track.onended = () => { call.current?.replaceVideo(media.current?.getVideoTracks()[0] ?? null); setSharing(false) }
      setSharing(true)
    } catch { notify('Screen sharing is not available here', 'warning') }
  }
  const sendChat = () => {
    if (!message.trim() || !call.current) return
    setChat((list) => [...list, call.current!.send(message.trim())])
    setMessage('')
  }
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); notify(`${what} copied`) } catch { notify(`Copy failed — select and copy the ${what.toLowerCase()} instead`, 'warning') } }
  const saveNote = () => {
    if (!patient || !Object.values(soap).some((value) => value.trim())) return
    addNote(patient.id, ['Video consultation note.', soap.s && `S: ${soap.s.trim()}`, soap.o && `O: ${soap.o.trim()}`, soap.a && `A: ${soap.a.trim()}`, soap.p && `P: ${soap.p.trim()}`].filter(Boolean).join(' '))
    setNotes((value) => value + 1); setSoap({ s: '', o: '', a: '', p: '' })
  }
  const vitalsComplete = Object.values(vitals).every((value) => value.trim())
  const saveVitals = () => {
    if (!patient || !vitalsComplete) return
    const numbers = Object.fromEntries(Object.entries(vitals).map(([key, value]) => [key, Number(value)])) as Record<keyof typeof vitals, number>
    recordObservations(patient.id, { ...numbers, gcs: 15, pain: patient.vitals.pain || 0 } as Vitals, false, 'Alert', 'Telemedicine')
    setVitals({ hr: '', rr: '', spo2: '', bpSys: '', bpDia: '', temp: '' })
  }
  const followUp = (days: number) => {
    if (!patient) return
    const at = new Date(Date.now() + days * 86_400_000); at.setHours(10, 0, 0, 0)
    scheduleAppointment({ patientId: patient.id, department: apt.department, clinician: apt.clinician, startsAt: at.toISOString(), durationMinutes: 20, mode: 'Video', reason: `Video follow-up: ${apt.reason}` })
  }
  const end = () => {
    if (soap.s || soap.o || soap.a || soap.p) saveNote()
    finishTeleconsult(apt.id, notes ? `${notes} consultation note${notes === 1 ? '' : 's'} recorded.` : '')
    call.current?.end(); media.current?.getTracks().forEach((track) => track.stop())
    onClose()
  }
  const clock = useMemo(() => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`, [seconds])
  const last = patient?.observations?.[0]

  return (
    <div className="tele-room" role="dialog" aria-modal="true" aria-label="Video consultation">
      <div className="tele-stage">
        <header className="tele-head">
          <div><b>{patient?.name ?? 'Patient'}</b><span>{apt.reason} · {apt.clinician}</span></div>
          <div className="tele-head-right">
            {status === 'connected' ? <span className="live-badge"><span className="live-dot" />Live · {clock}</span> : <Chip tone="neutral">{status === 'connecting' ? 'Connecting…' : 'Waiting for the patient'}</Chip>}
            <Chip tone={apt.consentAt ? 'success' : 'warning'}><ShieldCheck size={12} /> {apt.consentAt ? 'Consent recorded' : 'Consent pending'}</Chip>
            <Chip tone="neutral">Encrypted · not recorded</Chip>
          </div>
        </header>
        <div className="tele-videos">
          <video ref={remoteVideo} className="tele-remote" autoPlay playsInline aria-label="Patient video" />
          {status !== 'connected' && (
            <div className="tele-waiting">
              <UserRound size={34} />
              <b>{peer ? `${peer} is joining…` : 'Waiting for the patient to join'}</b>
              <span>Send the patient this link or visit code. They join from any phone or computer browser — no app or account.</span>
              <div className="tele-code"><span className="mono">{code}</span><Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(code, 'Visit code')}>Code</Button><Button size="sm" variant="secondary" icon={Copy} onClick={() => patient && copy(inviteText(apt, state.settings.name, patient.name), 'Invitation')}>Invitation</Button></div>
              <a className="tele-link" href={joinLink(code)} target="_blank" rel="noreferrer">Open the patient’s join page</a>
            </div>
          )}
          <video ref={localVideo} className={`tele-local ${cam ? '' : 'off'}`} autoPlay playsInline muted aria-label="Your video" />
          {problem && <p className="tele-problem">{problem}</p>}
        </div>
        <div className="tele-controls">
          <button type="button" className={mic ? '' : 'off'} onClick={toggleMic} aria-label={mic ? 'Mute microphone' : 'Unmute microphone'}>{mic ? <Mic size={19} /> : <MicOff size={19} />}</button>
          <button type="button" className={cam ? '' : 'off'} onClick={toggleCam} aria-label={cam ? 'Turn camera off' : 'Turn camera on'}>{cam ? <Video size={19} /> : <VideoOff size={19} />}</button>
          <button type="button" className={sharing ? 'on' : ''} onClick={share} aria-label={sharing ? 'Stop sharing screen' : 'Share screen'}><MonitorUp size={19} /></button>
          <button type="button" className="end" onClick={end} aria-label="End consultation"><PhoneOff size={19} /><span>End</span></button>
        </div>
      </div>

      <aside className="tele-side">
        <div className="tabs tele-tabs" role="tablist" aria-label="Consultation tools">
          {([['patient', UserRound, 'Patient'], ['note', FilePenLine, 'Note'], ['vitals', HeartPulse, 'Vitals'], ['care', Pill, 'Rx & orders'], ['chat', MessageSquareText, `Chat${chat.length ? ` (${chat.length})` : ''}`]] as Array<[Tab, typeof UserRound, string]>).map(([id, Icon, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={14} />{label}</button>)}
        </div>
        <div className="tele-panel">
          {tab === 'patient' && patient && <>
            <p><b>{patient.name}</b> · {patient.age} y · {patient.sex} · <span className="mono">{patient.mrn}</span></p>
            <p className="record-hint">{patient.complaint}</p>
            <div className="tele-chips">{patient.allergies.map((item) => <Chip key={item} tone={/no known/i.test(item) ? 'neutral' : 'danger'}>{item}</Chip>)}{patient.riskFactors.map((item) => <Chip key={item} tone="neutral">{item}</Chip>)}</div>
            <span className="detail-heading">Last vitals{last ? ` · ${formatDateTime(last.at)}${last.context ? ` · ${last.context}` : ''}` : ''}</span>
            <p>HR {patient.vitals.hr} · BP {patient.vitals.bpSys}/{patient.vitals.bpDia} · SpO₂ {patient.vitals.spo2}% · T {patient.vitals.temp}°C</p>
            <span className="detail-heading">Current medicines</span>
            <ul className="tele-list">{state.prescriptions.filter((rx) => rx.patientId === patient.id && rx.status !== 'Cancelled').flatMap((rx) => rx.items.map((item) => <li key={rx.id + item.medicationId}>{state.formulary.find((med) => med.id === item.medicationId)?.name} {item.dosage} {item.frequency}</li>))}</ul>
            <span className="detail-heading">Recent notes</span>
            <ul className="tele-list">{patient.timeline.slice(0, 4).map((event) => <li key={event.id}><b>{event.title}</b> — {event.detail.slice(0, 120)}</li>)}</ul>
          </>}
          {tab === 'note' && <>
            {(['s', 'o', 'a', 'p'] as const).map((key) => <label key={key} className="form-field"><span>{{ s: 'Subjective — what the patient reports', o: 'Objective — what you see and home readings', a: 'Assessment', p: 'Plan' }[key]}</span><textarea rows={2} value={soap[key]} onChange={(event) => setSoap({ ...soap, [key]: event.target.value })} /></label>)}
            <Button icon={Send} disabled={!Object.values(soap).some((value) => value.trim()) || !can('notes')} onClick={saveNote}>Save note to chart</Button>
            {notes > 0 && <p className="record-hint">{notes} note{notes === 1 ? '' : 's'} saved this visit.</p>}
          </>}
          {tab === 'vitals' && <>
            <p className="record-hint">Readings the patient takes at home (BP cuff, pulse oximeter, thermometer) go on the vitals chart marked “Telemedicine”.</p>
            <div className="form-grid form-grid-3">{([['hr', 'Heart rate'], ['rr', 'Resp. rate'], ['spo2', 'SpO₂ %'], ['bpSys', 'Systolic'], ['bpDia', 'Diastolic'], ['temp', 'Temp °C']] as Array<[keyof typeof vitals, string]>).map(([key, label]) => <label key={key} className="form-field"><span>{label}</span><input type="number" step={key === 'temp' ? 0.1 : 1} value={vitals[key]} onChange={(event) => setVitals({ ...vitals, [key]: event.target.value })} /></label>)}</div>
            <Button icon={HeartPulse} disabled={!vitalsComplete || !(can('vitals') || can('clinical-notes'))} onClick={saveVitals}>Record home vitals</Button>
          </>}
          {tab === 'care' && <>
            <div className="tele-actions">
              <Button icon={Pill} disabled={!can('prescribe')} onClick={() => setPrescribing(true)}>e-Prescription</Button>
              <Button icon={FlaskConical} variant="secondary" disabled={!can('prescribe') && !can('refer')} onClick={() => setOrdering(true)}>Order investigation</Button>
              <Button icon={CalendarPlus} variant="secondary" onClick={() => followUp(7)}>Video follow-up in 1 week</Button>
              <Button icon={CalendarPlus} variant="secondary" onClick={() => followUp(30)}>Video follow-up in 1 month</Button>
            </div>
            <p className="record-hint">The e-prescription code is collected at any branch pharmacy; investigations can be done here, sent electronically to a connected centre, or printed.</p>
          </>}
          {tab === 'chat' && <>
            <div className="tele-chat">{chat.length === 0 && <p className="record-hint">Messages appear here — useful if the sound drops. Not saved to the record.</p>}{chat.map((line, index) => <p key={index} className={line.from === 'clinician' ? 'me' : ''}><b>{line.name}</b>{line.text}</p>)}</div>
            <div className="referral-reply"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat() }} placeholder={status === 'connected' ? 'Message the patient' : 'Available once the patient joins'} disabled={status !== 'connected'} aria-label="Chat message" /><Button size="sm" icon={Send} disabled={status !== 'connected' || !message.trim()} onClick={sendChat}>Send</Button></div>
          </>}
        </div>
      </aside>
      {prescribing && patient && <EPrescribeModal open onClose={() => setPrescribing(false)} patientId={patient.id} takeHomeDefault />}
      {ordering && patient && <OrderModal open onClose={() => setOrdering(false)} patient={patient} />}
    </div>
  )
}
