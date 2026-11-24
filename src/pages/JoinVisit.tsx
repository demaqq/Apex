import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Camera, Mic, MicOff, PhoneOff, Send, ShieldCheck, Video, VideoOff } from 'lucide-react'
import { Brand, Button } from '../components/ui'
import { openMedia, TeleCall, type ChatLine } from '../lib/telecall'
import { formatDateTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'

/** Public page for patients: join a video consultation with a visit code. No account, nothing stored on this device. */
export default function JoinVisit() {
  const { code: fromLink } = useParams()
  const [search] = useSearchParams()
  const { state } = useHospital()
  const [code, setCode] = useState((fromLink ?? '').toUpperCase())
  const [name, setName] = useState(search.get('name') ?? '')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<'form' | 'waiting' | 'connecting' | 'connected' | 'ended'>('form')
  const [problem, setProblem] = useState('')
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [chat, setChat] = useState<ChatLine[]>([])
  const [message, setMessage] = useState('')
  const [doctor, setDoctor] = useState('')
  const local = useRef<HTMLVideoElement>(null)
  const remote = useRef<HTMLVideoElement>(null)
  const media = useRef<MediaStream | null>(null)
  const call = useRef<TeleCall | null>(null)
  const visit = state.appointments.find((item) => item.joinCode && item.joinCode === code.trim().toUpperCase())

  useEffect(() => () => { call.current?.end(); media.current?.getTracks().forEach((track) => track.stop()) }, [])

  const preview = async () => {
    const { stream, problem: issue } = await openMedia()
    media.current = stream
    setProblem(issue ?? '')
    if (local.current && stream) local.current.srcObject = stream
  }

  const join = async () => {
    if (code.trim().length !== 6) { setError('Enter the 6-character visit code from your invitation.'); return }
    if (!visit || visit.status === 'Cancelled' || visit.status === 'Completed') { setError('This visit code is not valid or the visit has ended. Check your invitation.'); return }
    if (name.trim().length < 2) { setError('Enter your name so the doctor knows who is joining.'); return }
    if (!consent) { setError('Please agree to the video consultation to continue.'); return }
    setError('')
    if (!media.current) await preview()
    const tele = new TeleCall(code.trim().toUpperCase(), 'patient', name.trim(), media.current)
    tele.consent = true
    tele.onState = (next) => setStage(next === 'waiting' ? 'waiting' : next)
    tele.onRemoteStream = (stream) => { if (remote.current) remote.current.srcObject = stream }
    tele.onPeerName = (who) => setDoctor(who)
    tele.onChat = (line) => setChat((list) => [...list, line])
    call.current = tele
    tele.start()
  }
  const leave = () => { call.current?.end(); media.current?.getTracks().forEach((track) => track.stop()); setStage('ended') }
  const toggleMic = () => { media.current?.getAudioTracks().forEach((track) => { track.enabled = !mic }); setMic(!mic) }
  const toggleCam = () => { media.current?.getVideoTracks().forEach((track) => { track.enabled = !cam }); setCam(!cam) }
  const send = () => { if (!message.trim() || !call.current) return; setChat((list) => [...list, call.current!.send(message.trim())]); setMessage('') }

  return (
    <main className="join-page">
      <header className="join-head"><Brand name={state.settings.name} tagline="Video consultation" /></header>
      {stage === 'form' && (
        <section className="join-card">
          <h1>Join your video visit</h1>
          {visit && <p className="record-hint">With {visit.clinician} · {formatDateTime(visit.startsAt)} · {visit.reason}</p>}
          <div className="join-preview"><video ref={local} autoPlay playsInline muted aria-label="Your camera" />{!media.current && <Button variant="secondary" icon={Camera} onClick={preview}>Check camera and microphone</Button>}{problem && <p className="tele-problem">{problem}</p>}</div>
          <div className="form-grid form-grid-2">
            <label className="form-field"><span>Visit code</span><input value={code} maxLength={6} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="mono" aria-label="Visit code" /></label>
            <label className="form-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Your name" /></label>
          </div>
          <label className="remember-row consent-row"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError('') }} />I agree to a consultation by video. I understand it is private and encrypted, it is not recorded, the doctor may ask me to come in person, and I can stop at any time.</label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button size="lg" icon={Video} onClick={join}>Join the visit</Button>
          <p className="record-hint"><ShieldCheck size={13} /> No account needed. Nothing about you is stored on this device.</p>
          <p className="record-hint"><Link to="/care">Patient portal: see a doctor now, book a visit, read your visit summaries</Link></p>
        </section>
      )}
      {(stage === 'waiting' || stage === 'connecting' || stage === 'connected') && (
        <section className="join-call">
          <div className="tele-videos">
            <video ref={remote} className="tele-remote" autoPlay playsInline aria-label="Doctor video" />
            {stage !== 'connected' && <div className="tele-waiting"><b>{stage === 'connecting' ? 'Connecting…' : 'You are in the waiting room'}</b><span>{doctor ? `${doctor} will be with you shortly.` : 'The doctor will let you in. Please keep this page open.'}</span></div>}
            <video ref={(element) => { local.current = element; if (element && media.current) element.srcObject = media.current }} className={`tele-local ${cam ? '' : 'off'}`} autoPlay playsInline muted aria-label="Your video" />
          </div>
          <div className="tele-controls">
            <button type="button" className={mic ? '' : 'off'} onClick={toggleMic} aria-label={mic ? 'Mute' : 'Unmute'}>{mic ? <Mic size={19} /> : <MicOff size={19} />}</button>
            <button type="button" className={cam ? '' : 'off'} onClick={toggleCam} aria-label={cam ? 'Camera off' : 'Camera on'}>{cam ? <Video size={19} /> : <VideoOff size={19} />}</button>
            <button type="button" className="end" onClick={leave} aria-label="Leave the visit"><PhoneOff size={19} /><span>Leave</span></button>
          </div>
          {stage === 'connected' && (
            <div className="join-chat">
              <div className="tele-chat">{chat.map((line, index) => <p key={index} className={line.from === 'patient' ? 'me' : ''}><b>{line.name}</b>{line.text}</p>)}</div>
              <div className="referral-reply"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} placeholder="Type a message" aria-label="Message the doctor" /><Button size="sm" icon={Send} disabled={!message.trim()} onClick={send}>Send</Button></div>
            </div>
          )}
        </section>
      )}
      {stage === 'ended' && <section className="join-card"><h1>Visit ended</h1><p>Thank you. Your after-visit summary, prescription codes and follow-up are in the patient portal.</p><Link className="button button-primary button-md" to="/care">Open the patient portal</Link></section>}
    </main>
  )
}
