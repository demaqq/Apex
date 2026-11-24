import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CalendarPlus, Camera, CheckCircle2, ClipboardList, CreditCard, Download, LogOut, MessageSquareText, Pill, Printer, Send, ShieldCheck, Star, Stethoscope, Timer, UserPlus, Video, X, Zap } from 'lucide-react'
import { Brand, Button, Chip, DepartmentIcon } from '../components/ui'
import { downloadHtml, printHtml } from '../lib/diagnostics'
import { formatCurrency, formatDateTime, relativeTime } from '../lib/format'
import { avsHtml, downscalePhoto, estimatedWait, FREQUENCY, freeSlots, GAD7, onDemandQueue, PAYERS, PHQ9, pharmacies, pharmacyName, priceOf, selfHarmFlag, serviceFor, TELE_CATEGORIES, videoCatalogue } from '../lib/telehealth'
import { useHospital, type VideoVisitRequest } from '../store/HospitalStore'
import { alreadyProcessed, clearPending, clearReturnParams, markProcessed, PROVIDER_NAME, readPending, returnParams, savePending, startCheckout, useIntegrations, verifyCheckout, type Integrations } from '../lib/integrations'
import type { Appointment, DepartmentId, Patient, TeleIntake, TeleService, VisitPayer } from '../types'

const SESSION = 'careos-portal-patient'

type ThreadDraft = { patientId: string; department: DepartmentId; subject: string; text: string; photos: string[]; payer: VisitPayer; insurer?: string; confidential?: boolean }
type View = 'home' | 'now' | 'book' | 'visits' | 'messages'
const GP_DEPARTMENT: DepartmentId = 'internal-medicine'

const readSession = () => { try { return sessionStorage.getItem(SESSION) } catch { return null } }
const writeSession = (id: string | null) => { try { if (id) sessionStorage.setItem(SESSION, id); else sessionStorage.removeItem(SESSION) } catch { /* private mode */ } }

/** Patient portal: see a doctor now, book a video visit, pay, fill in the intake, read after-visit summaries and message the clinic. */
export default function CarePortal() {
  const { state } = useHospital()
  const [patientId, setPatientId] = useState<string | null>(readSession)
  const [view, setView] = useState<View>('home')
  const [preset, setPreset] = useState<Preset | null>(null)
  const patient = state.patients.find((item) => item.id === patientId)
  const signIn = (id: string) => { writeSession(id); setPatientId(id); setView('home') }
  const signOut = () => { writeSession(null); setPatientId(null) }
  const { requestVideoVisit, openThread } = useHospital()
  const [returned, setReturned] = useState<{ receipt?: { id: string; reference: string; amount: number }; notice?: { tone: 'ok' | 'warn'; text: string; retry?: boolean } } | null>(null)

  // Back from the payment provider: verify with the server first, then book (once per payment reference).
  const settle = async () => {
    const { paid, session, cancelled } = returnParams()
    if (!paid) return
    const pending = readPending<VideoVisitRequest | ThreadDraft>()
    if (cancelled) { clearPending(); clearReturnParams(); setReturned({ notice: { tone: 'warn', text: 'Payment cancelled — nothing was charged. You can try again.' } }); return }
    if (alreadyProcessed(paid)) { clearReturnParams(); return }
    if (!pending || pending.reference !== paid) { clearReturnParams(); setReturned({ notice: { tone: 'warn', text: `We could not match payment ${paid} on this device. If you were charged, contact the clinic with this reference.` } }); return }
    try {
      const result = await verifyCheckout(paid, session ?? undefined)
      if (result.status === 'pending') { setReturned({ notice: { tone: 'warn', text: `${PROVIDER_NAME[result.provider] ?? 'The payment provider'} has not confirmed the payment yet.`, retry: true } }); return }
      if (result.status === 'failed') { clearPending(); clearReturnParams(); setReturned({ notice: { tone: 'warn', text: 'The payment did not go through, so nothing was booked. Please try again.' } }); return }
      if (result.amount + 0.005 < pending.amount) { clearPending(); clearReturnParams(); setReturned({ notice: { tone: 'warn', text: `The amount paid does not match the price. Contact the clinic with reference ${paid}.` } }); return }
      const gateway = { reference: paid, provider: result.provider, amount: result.amount, method: result.method, currency: result.currency }
      markProcessed(paid); clearPending(); clearReturnParams()
      if (pending.kind === 'visit') {
        const booked = requestVideoVisit({ ...(pending.payload as VideoVisitRequest), gateway })
        setReturned(booked ? { receipt: { id: booked.id, reference: paid, amount: result.amount } } : { notice: { tone: 'warn', text: `Paid (reference ${paid}) but the time is no longer free. The clinic will contact you to rebook or refund.` } })
      } else {
        openThread({ ...(pending.payload as ThreadDraft), gateway })
        setView('messages'); setReturned({ notice: { tone: 'ok', text: `Paid ${result.amount.toFixed(2)} ${result.currency} — your message has been sent.` } })
      }
    } catch (error) {
      setReturned({ notice: { tone: 'warn', text: error instanceof Error ? error.message : 'Could not check the payment.', retry: true } })
    }
  }
  useEffect(() => { void settle() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="join-page portal-page">
      <header className="join-head portal-head">
        <Brand name={state.settings.name} tagline="Patient portal · video care" />
        {patient && <div className="portal-who"><span>{patient.name} · <span className="mono">{patient.mrn}</span></span><Button size="sm" variant="ghost" icon={LogOut} onClick={signOut}>Sign out</Button></div>}
      </header>
      <p className="portal-emergency" role="note"><AlertTriangle size={15} /> Not for emergencies. For chest pain, trouble breathing, heavy bleeding, a seizure or thoughts of harming yourself, go to the nearest emergency department or call 907 now.</p>
      {!patient ? <PortalSignIn onSignIn={signIn} /> : (
        <section className="portal-body">
          <nav className="tabs portal-tabs" role="tablist" aria-label="Patient portal">
            {([['home', 'Home'], ['now', 'See a doctor now'], ['book', 'Book a visit'], ['visits', 'My visits'], ['messages', 'Messages']] as Array<[View, string]>).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'active' : ''} onClick={() => { setView(id); if (id !== 'book') setPreset(null) }}>{label}</button>)}
          </nav>
          {returned?.notice && <p className={`portal-notice ${returned.notice.tone}`} role="status">{returned.notice.text}{returned.notice.retry && <Button size="sm" variant="secondary" onClick={() => { setReturned(null); void settle() }}>Check again</Button>}<button type="button" className="link-button" onClick={() => setReturned(null)}>Dismiss</button></p>}
          {returned?.receipt ? <Receipt appointmentId={returned.receipt.id} reference={returned.receipt.reference} amount={returned.receipt.amount} onDone={() => { setReturned(null); setView('visits') }} /> : <>
          {view === 'home' && <PortalHome patient={patient} go={setView} book={(department) => { setPreset(department ? { department } : null); setView('book') }} />}
          {view === 'now' && <VisitWizard key="now" patient={patient} onDemand onDone={() => setView('visits')} />}
          {view === 'book' && <VisitWizard key={`book-${preset?.department ?? ''}-${preset?.clinician ?? ''}`} patient={patient} onDemand={false} preset={preset ?? undefined} onDone={() => setView('visits')} />}
          {view === 'visits' && <MyVisits patient={patient} onFollowUp={(apt) => { setPreset({ clinician: apt.clinician, department: apt.department, reason: `Follow-up: ${apt.reason}` }); setView('book') }} />}
          {view === 'messages' && <Messages patient={patient} />}
          </>}
        </section>
      )}
    </main>
  )
}

/* ---------- Sign in / register ---------- */

function PortalSignIn({ onSignIn }: { onSignIn: (id: string) => void }) {
  const { state, portalRegister } = useHospital()
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in')
  const [mrn, setMrn] = useState('')
  const [digits, setDigits] = useState('')
  const [tries, setTries] = useState(0)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', age: '', sex: 'Female' as Patient['sex'], phone: '', email: '' })
  const [created, setCreated] = useState<{ id: string; mrn: string } | null>(null)

  const verify = () => {
    if (tries >= 5) { setError('Too many attempts. Please call the clinic to confirm your details.'); return }
    const found = state.patients.find((item) => item.mrn.toUpperCase() === mrn.trim().toUpperCase())
    const last = (found?.phone ?? '').replace(/\D/g, '').slice(-4)
    if (!found || last.length < 4 || last !== digits.trim()) { setTries(tries + 1); setError('Those details do not match our records. Check the number on your card and the last 4 digits of your phone.'); return }
    onSignIn(found.id)
  }
  const register = () => {
    const age = Number(form.age)
    if (form.name.trim().length < 3) { setError('Enter your full name.'); return }
    if (!Number.isFinite(age) || age < 0 || age > 120 || form.age === '') { setError('Enter your age in years.'); return }
    if (form.phone.replace(/\D/g, '').length < 9) { setError('Enter a mobile number we can reach you on.'); return }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Check the email address.'); return }
    setError('')
    setCreated(portalRegister({ name: form.name, age, sex: form.sex, phone: form.phone, email: form.email }))
  }

  if (created) return (
    <section className="join-card">
      <h1>You are registered</h1>
      <p>Your hospital number is <b className="mono portal-mrn">{created.mrn}</b>. Keep it with your phone number: you need both to sign in.</p>
      <Button size="lg" onClick={() => onSignIn(created.id)}>Continue</Button>
    </section>
  )

  return (
    <section className="join-card">
      <h1>{mode === 'sign-in' ? 'Your care, by video' : 'New patient'}</h1>
      <p className="record-hint">See a doctor now or book a visit, pay securely, and read your visit summaries and prescriptions. No app to install.</p>
      {mode === 'sign-in' ? <>
        <div className="form-grid form-grid-2">
          <label className="form-field"><span>Hospital number (MRN)</span><input value={mrn} onChange={(event) => setMrn(event.target.value.toUpperCase())} placeholder="NS-000000" className="mono" aria-label="Hospital number" /></label>
          <label className="form-field"><span>Last 4 digits of your phone</span><input value={digits} inputMode="numeric" maxLength={4} onChange={(event) => setDigits(event.target.value.replace(/\D/g, ''))} aria-label="Last 4 digits of your phone" /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button size="lg" icon={ShieldCheck} onClick={verify}>Sign in</Button>
        <p className="record-hint">Demo: Zoe Campbell, <span className="mono">NS-008431</span>, phone ending <span className="mono">8431</span>.</p>
        <button type="button" className="link-button" onClick={() => { setMode('register'); setError('') }}><UserPlus size={14} /> New patient? Register</button>
      </> : <>
        <div className="form-grid form-grid-2">
          <label className="form-field span-2"><span>Full name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} aria-label="Full name" /></label>
          <label className="form-field"><span>Age</span><input type="number" min={0} max={120} value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} aria-label="Age" /></label>
          <label className="form-field"><span>Sex</span><select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value as Patient['sex'] })}>{['Female', 'Male', 'Non-binary'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="form-field"><span>Mobile number</span><input value={form.phone} inputMode="tel" onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+251 9…" aria-label="Mobile number" /></label>
          <label className="form-field"><span>Email (optional)</span><input value={form.email} inputMode="email" onChange={(event) => setForm({ ...form, email: event.target.value })} aria-label="Email" /></label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button size="lg" icon={UserPlus} onClick={register}>Register</Button>
        <button type="button" className="link-button" onClick={() => { setMode('sign-in'); setError('') }}>I already have a hospital number</button>
      </>}
    </section>
  )
}

/* ---------- Home ---------- */

function PortalHome({ patient, go, book }: { patient: Patient; go: (view: View) => void; book: (department?: DepartmentId) => void }) {
  const { state } = useHospital()
  const mine = state.appointments.filter((item) => item.patientId === patient.id && item.mode === 'Video')
  const next = mine.filter((item) => item.status === 'Scheduled' || item.status === 'In progress').sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const queue = onDemandQueue(state.appointments)
  const wait = estimatedWait(queue.length, state.staff)
  const unread = state.messageThreads.filter((item) => item.patientId === patient.id && item.status === 'Answered').length
  const fee = (id: string) => formatCurrency(priceOf(id, state.services).price)
  return (
    <div className="portal-grid">
      <button type="button" className="portal-tile primary" onClick={() => go('now')}><Zap size={22} /><b>See a doctor now</b><span>Next available doctor · about {wait} min wait · {fee('SV-15')}</span></button>
      <button type="button" className="portal-tile" onClick={() => book()}><CalendarPlus size={22} /><b>Book a visit</b><span>Choose a specialty, a doctor and a time · from {fee('SV-14')}</span></button>
      <button type="button" className="portal-tile" onClick={() => book('psychiatry')}><Stethoscope size={22} /><b>Mental health</b><span>Confidential sessions for mood, anxiety, stress and sleep · {fee('SV-16')}</span></button>
      <button type="button" className="portal-tile" onClick={() => go('messages')}><MessageSquareText size={22} /><b>Message the clinic{unread ? ` · ${unread} new` : ''}</b><span>Ask a question with photos · answered within 1 working day · {fee('SV-17')}</span></button>
      <div className="portal-browse">
        <b>Find care by specialty</b>
        {videoCatalogue(state.departments, state.staff).map((group) => <div key={group.id}><span>{group.label}</span><div>{group.items.filter((item) => item.doctors.length).map((item) => <button key={item.department.id} type="button" onClick={() => book(item.department.id)}><DepartmentIcon id={item.department.id} size={14} />{item.specialty.label}</button>)}</div></div>)}
      </div>
      {next && <div className="portal-next"><CalendarClock size={18} /><div><b>{next.onDemand && !next.clinician ? 'You are in the queue' : `Next visit: ${formatDateTime(next.startsAt)}`}</b><span>{next.clinician || 'Next available doctor'} · {next.reason} · code <span className="mono">{next.joinCode}</span></span></div><Button size="sm" icon={Video} onClick={() => go('visits')}>Open</Button></div>}
    </div>
  )
}

/* ---------- Visit wizard: service → about you → pharmacy & reminders → payment ---------- */

const STEPS = ['Visit', 'About you', 'Pharmacy & reminders', 'Payment']

const ON_DEMAND: DepartmentId[] = ['internal-medicine', 'pediatrics', 'psychiatry']
const ON_DEMAND_LABEL: Record<string, string> = { 'internal-medicine': 'Adult — general practice', pediatrics: 'Child — paediatrics', psychiatry: 'Mental health support' }

type Preset = { clinician?: string; department: DepartmentId; reason?: string }

function VisitWizard({ patient, onDemand, preset, onDone }: { patient: Patient; onDemand: boolean; preset?: Preset; onDone: () => void }) {
  const { state, requestVideoVisit } = useHospital()
  const catalogue = useMemo(() => videoCatalogue(state.departments, state.staff), [state.departments, state.staff])
  const entries = catalogue.flatMap((group) => group.items)
  const quick = entries.filter((entry) => ON_DEMAND.includes(entry.department.id) && entry.doctors.length)
  const [step, setStep] = useState(0)
  const [department, setDepartment] = useState<DepartmentId>(preset?.department ?? (onDemand ? quick[0]?.department.id ?? GP_DEPARTMENT : ''))
  const [clinician, setClinician] = useState(preset?.clinician ?? '')
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState(preset?.reason ?? '')
  const [intake, setIntake] = useState<TeleIntake>({ symptoms: '', since: '', medications: '', allergies: patient.allergies.filter((item) => !/no known|not yet/i.test(item)).join(', '), photos: [], submittedAt: '' })
  const [pharmacy, setPharmacy] = useState('in-house')
  const [sms, setSms] = useState(true)
  const [email, setEmail] = useState(Boolean(patient.email))
  const [emailAddress, setEmailAddress] = useState(patient.email ?? '')
  const [payment, setPayment] = useState<PaymentDetails>({ payer: 'Mobile money', card: '', expiry: '', cvc: '', wallet: 'telebirr', walletPhone: patient.phone ?? '', insurer: patient.insurance && patient.insurance !== 'Self-pay' ? patient.insurance : '', member: '', employer: '', employee: '' })
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ id: string; reference: string; amount: number } | null>(null)

  const entry = entries.find((item) => item.department.id === department)
  const service: TeleService = entry?.specialty.service ?? 'General practice'
  const team = entry?.doctors ?? []
  const pick = (id: DepartmentId) => { setDepartment(id); setClinician(''); setSlot(''); setError('') }
  const slots = useMemo(() => clinician ? freeSlots(clinician, state.appointments) : [], [clinician, state.appointments])
  const days = useMemo(() => { const map = new Map<string, Date[]>(); slots.forEach((date) => { const key = date.toDateString(); map.set(key, [...(map.get(key) ?? []), date]) }); return [...map.entries()].slice(0, 5) }, [slots])
  const queue = onDemandQueue(state.appointments)
  const live = useIntegrations()
  const serviceId = serviceFor(service, onDemand)
  const fee = priceOf(serviceId, state.services)
  const online = isOnline(live, payment.payer)
  const charge = online && live?.prices[serviceId] ? live.prices[serviceId] : fee.price
  const amountText = online && live?.payments ? `${charge.toFixed(2)} ${live.payments.currency}` : formatCurrency(fee.price)
  const [redirecting, setRedirecting] = useState(false)
  const places = pharmacies(state.network, state.connections, state.settings.name)
  const screeningNeeded = service === 'Mental health'

  const checkStep = (): string => {
    if (step === 0) {
      if (reason.trim().length < 3) return 'Tell us briefly why you want to see a doctor.'
      if (!entry) return 'Choose the kind of doctor you need.'
      if (!onDemand && (!clinician || !slot)) return 'Choose a doctor and a time.'
    }
    if (step === 1) {
      if (intake.symptoms.trim().length < 5) return 'Describe your symptoms or what you would like help with.'
      if (screeningNeeded && ((intake.phq9 ?? []).length < 9 || (intake.gad7 ?? []).length < 7 || [...(intake.phq9 ?? []), ...(intake.gad7 ?? [])].some((value) => value === undefined))) return 'Please answer every question in both short questionnaires.'
    }
    if (step === 2 && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) return 'Check the email address for reminders.'
    if (step === 3) { const problem = online ? '' : paymentProblem(payment); if (problem) return problem; if (!agree) return 'Please agree to the video consultation terms.' }
    return ''
  }
  const next = () => { const problem = checkStep(); setError(problem); if (!problem) setStep(step + 1) }
  const pay = async () => {
    const problem = checkStep(); setError(problem); if (problem) return
    const request: VideoVisitRequest = {
      patientId: patient.id, service, onDemand, department, clinician: onDemand ? undefined : clinician, startsAt: onDemand ? undefined : slot, reason,
      intake: { ...intake, submittedAt: new Date().toISOString() }, payer: payment.payer, insurer: payment.payer === 'Insurance' ? payment.insurer : payment.payer === 'Corporate plan' ? payment.employer : undefined,
      reminders: onDemand ? undefined : { channels: [...(sms ? ['SMS' as const] : []), ...(email ? ['Email' as const] : [])], phone: patient.phone, email: email ? emailAddress : undefined }, pharmacy,
    }
    if (online) {
      // Pay on the provider's secure page; the visit is booked only after the payment is verified on return.
      setRedirecting(true)
      try {
        const checkout = await startCheckout(serviceId, { name: patient.name, phone: payment.payer === 'Mobile money' ? payment.walletPhone : patient.phone, email: patient.email })
        savePending({ kind: 'visit', reference: checkout.reference, provider: checkout.provider, amount: checkout.amount, patientId: patient.id, payload: request, at: new Date().toISOString() })
        window.location.assign(checkout.checkoutUrl)
      } catch (failure) { setRedirecting(false); setError(failure instanceof Error ? failure.message : 'Could not start the payment.') }
      return
    }
    const result = requestVideoVisit(request)
    if (!result) { setError('That could not be booked. Please choose another time.'); return }
    setDone(result)
  }

  if (done) return <Receipt appointmentId={done.id} reference={done.reference} amount={done.amount} onDone={onDone} />

  return (
    <section className="join-card portal-card">
      <h1>{onDemand ? 'See a doctor now' : 'Book a video visit'}</h1>
      <ol className="portal-steps">{STEPS.map((label, index) => <li key={label} className={index === step ? 'on' : index < step ? 'done' : ''}>{index < step ? <CheckCircle2 size={13} /> : <span>{index + 1}</span>}{label}</li>)}</ol>

      {step === 0 && <>
        {onDemand ? <>
          <div className="portal-options" role="radiogroup" aria-label="Who is the visit for">{quick.map((item) => <label key={item.department.id} className={`portal-option ${department === item.department.id ? 'on' : ''}`}><input type="radio" name="on-demand" checked={department === item.department.id} onChange={() => pick(item.department.id)} /><Stethoscope size={15} /><span><b>{ON_DEMAND_LABEL[item.department.id]}</b><small>{item.specialty.examples}</small></span></label>)}</div>
          <div className="portal-queue-hint"><Timer size={18} /><div><b>About {estimatedWait(queue.length, state.staff)} minutes</b><span>{queue.length ? `${queue.length} ${queue.length === 1 ? 'person' : 'people'} ahead of you` : 'No one is waiting'} · the next available doctor will see you</span></div></div>
        </> : !entry ? (
          <div className="portal-catalogue">
            {catalogue.map((group) => (
              <section key={group.id}>
                <h3>{group.label}</h3><p className="record-hint">{group.blurb}</p>
                <div className="portal-specialties">{group.items.map((item) => <button key={item.department.id} type="button" disabled={!item.doctors.length} onClick={() => pick(item.department.id)}><DepartmentIcon id={item.department.id} size={18} /><b>{item.specialty.label}</b><small>{item.specialty.examples}</small><span>{item.doctors.length ? `${item.doctors.length} doctor${item.doctors.length === 1 ? '' : 's'} · ${formatCurrency(priceOf(serviceFor(item.specialty.service, false), state.services).price)}` : 'No video doctors yet'}</span></button>)}</div>
              </section>
            ))}
          </div>
        ) : <>
          <div className="portal-picked"><DepartmentIcon id={entry.department.id} size={20} /><div><b>{entry.specialty.label}</b><small>{TELE_CATEGORIES.find((item) => item.id === entry.specialty.category)?.label} · {entry.specialty.examples}</small></div><Button size="sm" variant="ghost" onClick={() => pick('')}>Change</Button></div>
          {entry.specialty.notFor && <p className="portal-crisis" role="note"><AlertTriangle size={15} /> {entry.specialty.notFor}</p>}
          <div className="form-field"><span>Doctor</span><div className="portal-doctors">{team.map((member) => <button key={member.id} type="button" className={clinician === member.name ? 'on' : ''} onClick={() => { setClinician(member.name); setSlot('') }}><b>{member.name}</b><small>{member.role} · {member.specialty}{member.grade ? ` · ${member.grade}${member.residentYear ? ` R${member.residentYear}` : ''}` : ''}</small></button>)}</div></div>
          {clinician && <div className="form-field"><span>Time</span>{days.length === 0 ? <p className="record-hint">No free times in the next week. Choose another doctor.</p> : <div className="portal-slots">{days.map(([day, times]) => <div key={day}><b>{new Date(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</b><div>{times.slice(0, 8).map((time) => <button key={time.toISOString()} type="button" className={slot === time.toISOString() ? 'on' : ''} onClick={() => setSlot(time.toISOString())}>{time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</button>)}</div></div>)}</div>}</div>}
        </>}
        {service === 'Mental health' && <p className="record-hint"><ShieldCheck size={13} /> Confidential: details stay with your clinician. Your wider record only shows that a session took place.</p>}
        <label className="form-field"><span>Reason for the visit</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Rash on my arms, blood pressure review" aria-label="Reason for the visit" /></label>
      </>}

      {step === 1 && <>
        <label className="form-field"><span>Your symptoms or question</span><textarea rows={3} value={intake.symptoms} onChange={(event) => setIntake({ ...intake, symptoms: event.target.value })} aria-label="Symptoms" /></label>
        <div className="form-grid form-grid-2">
          <label className="form-field"><span>Since when</span><input value={intake.since} onChange={(event) => setIntake({ ...intake, since: event.target.value })} placeholder="e.g. 3 days" aria-label="Since when" /></label>
          <label className="form-field"><span>Allergies</span><input value={intake.allergies} onChange={(event) => setIntake({ ...intake, allergies: event.target.value })} placeholder="None known" aria-label="Allergies" /></label>
          <label className="form-field span-2"><span>Medicines you take</span><input value={intake.medications} onChange={(event) => setIntake({ ...intake, medications: event.target.value })} placeholder="Name and dose, or none" aria-label="Medicines you take" /></label>
        </div>
        <PhotoPicker photos={intake.photos} onChange={(photos) => setIntake({ ...intake, photos })} />
        {screeningNeeded && <>
          <Screening title="Over the last 2 weeks, how often have you been bothered by…" subtitle="PHQ-9 (mood)" questions={PHQ9} answers={intake.phq9 ?? []} onChange={(phq9) => setIntake({ ...intake, phq9 })} />
          <Screening title="Over the last 2 weeks, how often have you been bothered by…" subtitle="GAD-7 (anxiety)" questions={GAD7} answers={intake.gad7 ?? []} onChange={(gad7) => setIntake({ ...intake, gad7 })} />
          {selfHarmFlag(intake.phq9) && <p className="portal-crisis" role="alert"><AlertTriangle size={16} /> Thank you for telling us. If you might act on these thoughts, call 907 or go to the nearest emergency department now. Your clinician will also check on your safety today.</p>}
        </>}
      </>}

      {step === 2 && <>
        <div className="form-field"><span>Pharmacy for any prescription</span>
          <div className="portal-options">{places.map((place) => <label key={place.id} className={`portal-option ${pharmacy === place.id ? 'on' : ''}`}><input type="radio" name="pharmacy" checked={pharmacy === place.id} onChange={() => setPharmacy(place.id)} /><Pill size={15} /><span><b>{place.name}</b><small>{place.detail}</small></span></label>)}</div>
        </div>
        {!onDemand && <div className="form-field"><span>Reminders (24 hours and 1 hour before)</span>
          <label className="remember-row"><input type="checkbox" checked={sms} onChange={(event) => setSms(event.target.checked)} />SMS to {patient.phone ?? 'your phone'}</label>
          <label className="remember-row"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />Email</label>
          {email && <input value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="you@example.com" aria-label="Reminder email" />}
        </div>}
      </>}

      {step === 3 && <>
        <div className="portal-fee"><span>{fee.name}</span><b>{amountText}</b><small>VAT included · full refund if the clinic cancels, or if you cancel more than 2 hours before</small></div>
        <PaymentFields value={payment} onChange={setPayment} live={live} />
        <label className="remember-row consent-row"><input type="checkbox" checked={agree} onChange={(event) => { setAgree(event.target.checked); setError('') }} />I agree to a consultation by video. It is private and encrypted and not recorded; the doctor may ask me to come in person.</label>
      </>}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="portal-actions">
        {step > 0 && <Button variant="ghost" onClick={() => { setError(''); setStep(step - 1) }}>Back</Button>}
        {step < 3 ? <Button onClick={next}>Continue</Button> : <Button icon={CreditCard} disabled={redirecting} onClick={() => void pay()}>{redirecting ? 'Opening secure checkout…' : `Pay ${amountText} and ${onDemand ? 'join the queue' : 'book'}`}</Button>}
      </div>
    </section>
  )
}

function Screening({ title, subtitle, questions, answers, onChange }: { title: string; subtitle: string; questions: string[]; answers: number[]; onChange: (answers: number[]) => void }) {
  const set = (index: number, value: number) => { const next = [...answers]; next[index] = value; onChange(next) }
  return (
    <fieldset className="portal-screen">
      <legend><b>{subtitle}</b> · {title}</legend>
      {questions.map((question, index) => (
        <div key={question} className="portal-question">
          <span>{index + 1}. {question}</span>
          <div role="radiogroup" aria-label={`${subtitle} question ${index + 1}`}>{FREQUENCY.map((label, value) => <button key={label} type="button" role="radio" aria-checked={answers[index] === value} className={answers[index] === value ? 'on' : ''} onClick={() => set(index, value)}>{label}</button>)}</div>
        </div>
      ))}
    </fieldset>
  )
}

function PhotoPicker({ photos, onChange }: { photos: string[]; onChange: (photos: string[]) => void }) {
  const [problem, setProblem] = useState('')
  const add = async (files: FileList | null) => {
    if (!files) return
    const room = 3 - photos.length
    const picked = Array.from(files).slice(0, room)
    try { const added = await Promise.all(picked.map((file) => downscalePhoto(file))); onChange([...photos, ...added]); setProblem(files.length > room ? 'Up to 3 photos.' : '') } catch { setProblem('That file is not a photo we can read.') }
  }
  return (
    <div className="form-field"><span>Photos (optional — a rash, wound or eye)</span>
      <div className="portal-photos">
        {photos.map((src, index) => <figure key={index}><img src={src} alt={`Photo ${index + 1}`} /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(photos.filter((_, at) => at !== index))}><X size={12} /></button></figure>)}
        {photos.length < 3 && <label className="portal-photo-add"><Camera size={18} /><span>Add photo</span><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => { void add(event.target.files); event.target.value = '' }} aria-label="Add photo" /></label>}
      </div>
      {problem && <small className="form-error">{problem}</small>}
    </div>
  )
}

/* ---------- Payment ---------- */

interface PaymentDetails { payer: VisitPayer; card: string; expiry: string; cvc: string; wallet: string; walletPhone: string; insurer: string; member: string; employer: string; employee: string }

const luhn = (digits: string) => digits.split('').reverse().map(Number).reduce((sum, digit, index) => sum + (index % 2 ? (digit * 2 > 9 ? digit * 2 - 9 : digit * 2) : digit), 0) % 10 === 0

function paymentProblem(value: PaymentDetails) {
  if (value.payer === 'Card') {
    const digits = value.card.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19 || !luhn(digits)) return 'Check the card number.'
    const [month, year] = value.expiry.split('/').map((part) => Number(part))
    if (!month || month > 12 || !year || new Date(2000 + year, month) < new Date()) return 'Check the expiry date (MM/YY).'
    if (!/^\d{3,4}$/.test(value.cvc)) return 'Check the 3-digit security code.'
  }
  if (value.payer === 'Mobile money' && value.walletPhone.replace(/\D/g, '').length < 9) return 'Enter the mobile money number to charge.'
  if (value.payer === 'Insurance' && (value.insurer.trim().length < 2 || value.member.trim().length < 3)) return 'Enter your insurer and member number.'
  if (value.payer === 'Corporate plan' && (value.employer.trim().length < 2 || value.employee.trim().length < 2)) return 'Enter your employer and employee number.'
  return ''
}

/** Card and mobile money go through the online gateway when the hospital's server has one connected. */
const isOnline = (live: Integrations | null | undefined, payer: VisitPayer) => Boolean(live?.payments) && (payer === 'Card' || payer === 'Mobile money')

function PaymentFields({ value, onChange, live }: { value: PaymentDetails; onChange: (value: PaymentDetails) => void; live: Integrations | null | undefined }) {
  const set = (patch: Partial<PaymentDetails>) => onChange({ ...value, ...patch })
  const online = isOnline(live, value.payer)
  const provider = live?.payments ? PROVIDER_NAME[live.payments.provider] : ''
  return <>
    <div className="segmented" role="radiogroup" aria-label="Pay with">{PAYERS.map((payer) => <button key={payer} type="button" role="radio" aria-checked={value.payer === payer} className={value.payer === payer ? 'on' : ''} onClick={() => set({ payer })}>{payer}</button>)}</div>
    {online ? <div className="portal-gateway">
      <ShieldCheck size={18} />
      <div><b>Pay on {provider}’s secure page</b><span>{live?.payments?.provider === 'stripe' ? 'Visa, Mastercard and other cards.' : 'telebirr, CBE Birr, M-Pesa, Amole and bank cards.'} You come back here once paid; your card number or PIN never reaches the hospital.</span></div>
      {live?.payments?.mode === 'test' && <Chip tone="warning">Test mode</Chip>}
    </div>
    : live === null && (value.payer === 'Card' || value.payer === 'Mobile money') ? <p className="portal-demo" role="note">Demo mode: no payment gateway is connected, so nothing is charged.</p> : null}
    {!online && value.payer === 'Card' && <div className="form-grid form-grid-3">
      <label className="form-field span-3"><span>Card number</span><input value={value.card} inputMode="numeric" autoComplete="cc-number" onChange={(event) => set({ card: event.target.value.replace(/[^\d ]/g, '').slice(0, 23) })} aria-label="Card number" /></label>
      <label className="form-field"><span>Expiry (MM/YY)</span><input value={value.expiry} autoComplete="cc-exp" onChange={(event) => set({ expiry: event.target.value.replace(/[^\d/]/g, '').slice(0, 5) })} aria-label="Expiry" /></label>
      <label className="form-field"><span>Security code</span><input value={value.cvc} inputMode="numeric" autoComplete="cc-csc" type="password" onChange={(event) => set({ cvc: event.target.value.replace(/\D/g, '').slice(0, 4) })} aria-label="Security code" /></label>
    </div>}
    {value.payer === 'Mobile money' && !online && <div className="form-grid form-grid-2">
      <label className="form-field"><span>Wallet</span><select value={value.wallet} onChange={(event) => set({ wallet: event.target.value })}>{['telebirr', 'M-Pesa', 'CBE Birr'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="form-field"><span>Number to charge</span><input value={value.walletPhone} inputMode="tel" onChange={(event) => set({ walletPhone: event.target.value })} aria-label="Mobile money number" /></label>
    </div>}
    {value.payer === 'Insurance' && <div className="form-grid form-grid-2">
      <label className="form-field"><span>Insurer</span><input value={value.insurer} onChange={(event) => set({ insurer: event.target.value })} aria-label="Insurer" /></label>
      <label className="form-field"><span>Member number</span><input value={value.member} onChange={(event) => set({ member: event.target.value })} aria-label="Member number" /></label>
    </div>}
    {value.payer === 'Corporate plan' && <div className="form-grid form-grid-2">
      <label className="form-field"><span>Employer</span><input value={value.employer} onChange={(event) => set({ employer: event.target.value })} aria-label="Employer" /></label>
      <label className="form-field"><span>Employee number</span><input value={value.employee} onChange={(event) => set({ employee: event.target.value })} aria-label="Employee number" /></label>
    </div>}
    {!online && <p className="record-hint"><ShieldCheck size={13} /> {value.payer === 'Card' ? 'Card details go to the payment processor and are never stored by the hospital.' : value.payer === 'Mobile money' ? 'You will get a prompt on your phone to approve the payment.' : 'We send the claim to your payer; you pay nothing now if it is approved.'}</p>}
  </>
}

/* ---------- Receipt and live queue ---------- */

function Receipt({ appointmentId, reference, amount, onDone }: { appointmentId: string; reference: string; amount: number; onDone: () => void }) {
  const { state } = useHospital()
  const apt = state.appointments.find((item) => item.id === appointmentId)
  if (!apt) return null
  return (
    <section className="join-card portal-card">
      <h1><CheckCircle2 size={22} className="portal-ok" /> {apt.payment?.payer === 'Insurance' || apt.payment?.payer === 'Corporate plan' ? 'Claim sent — you are booked' : 'Paid — you are booked'}</h1>
      <dl className="portal-receipt">
        <div><dt>Receipt</dt><dd className="mono">{reference}</dd></div>
        <div><dt>Invoice</dt><dd className="mono">{apt.payment?.invoiceId}</dd></div>
        <div><dt>Amount</dt><dd>{apt.payment?.currency ? `${amount.toFixed(2)} ${apt.payment.currency}` : formatCurrency(amount)} <small>VAT included</small></dd></div>
        {apt.payment?.provider && <div><dt>Paid with</dt><dd>{PROVIDER_NAME[apt.payment.provider] ?? apt.payment.provider}{apt.payment.method ? ` · ${apt.payment.method}` : ''}</dd></div>}
        <div><dt>Visit code</dt><dd className="mono portal-mrn">{apt.joinCode}</dd></div>
        <div><dt>When</dt><dd>{apt.onDemand ? 'Now — next available doctor' : `${formatDateTime(apt.startsAt)} with ${apt.clinician}`}</dd></div>
      </dl>
      {apt.onDemand ? <QueueStatus apt={apt} /> : <p className="record-hint">{apt.reminders?.channels.length ? `We will remind you by ${apt.reminders.channels.join(' and ')} 24 hours and 1 hour before.` : 'Add the visit to your calendar.'}</p>}
      <Button variant="secondary" onClick={onDone}>Go to my visits</Button>
    </section>
  )
}

function QueueStatus({ apt }: { apt: Appointment }) {
  const { state } = useHospital()
  const navigate = useNavigate()
  const queue = onDemandQueue(state.appointments)
  const position = queue.findIndex((item) => item.id === apt.id)
  const patient = state.patients.find((item) => item.id === apt.patientId)
  if (apt.clinician) return <div className="portal-ready" role="status"><Video size={18} /><div><b>{apt.clinician} is ready for you</b><span>Join the video room now.</span></div><Button icon={Video} onClick={() => navigate(`/join/${apt.joinCode}?name=${encodeURIComponent(patient?.name ?? '')}`)}>Join now</Button></div>
  return (
    <div className="portal-queue-hint" role="status"><Timer size={18} /><div><b>You are number {position + 1} in the queue</b><span>About {estimatedWait(Math.max(0, position), state.staff)} minutes. You can wait in the video room so the doctor can bring you straight in.</span></div><Button size="sm" icon={Video} onClick={() => navigate(`/join/${apt.joinCode}?name=${encodeURIComponent(patient?.name ?? '')}`)}>Wait in the video room</Button></div>
  )
}

/* ---------- My visits: upcoming, summaries, ratings ---------- */

function MyVisits({ patient, onFollowUp }: { patient: Patient; onFollowUp: (apt: Appointment) => void }) {
  const { state, cancelVideoVisit, setVisitPharmacy } = useHospital()
  const navigate = useNavigate()
  const mine = state.appointments.filter((item) => item.patientId === patient.id && item.mode === 'Video')
  const upcoming = mine.filter((item) => item.status === 'Scheduled' || item.status === 'In progress').sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = mine.filter((item) => item.status === 'Completed' || item.status === 'Cancelled').sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const places = pharmacies(state.network, state.connections, state.settings.name)
  const [confirming, setConfirming] = useState<string | null>(null)
  const join = (apt: Appointment) => navigate(`/join/${apt.joinCode}?name=${encodeURIComponent(patient.name)}`)
  const open = (apt: Appointment) => apt.status === 'In progress' || apt.onDemand || Date.parse(apt.startsAt) - Date.now() <= 10 * 60_000

  return (
    <div className="portal-list">
      <h2>Upcoming</h2>
      {upcoming.length === 0 && <p className="record-hint">No upcoming visits.</p>}
      {upcoming.map((apt) => {
        const refundable = apt.onDemand || Date.parse(apt.startsAt) - Date.now() > 2 * 3_600_000
        return (
          <article key={apt.id} className="portal-visit">
            <header><div><b>{apt.onDemand && !apt.clinician ? 'On-demand · next available doctor' : `${formatDateTime(apt.startsAt)} · ${apt.clinician}`}</b><small>{apt.service ?? 'Video visit'} · {apt.reason} · code <span className="mono">{apt.joinCode}</span></small></div>{apt.status === 'In progress' ? <Chip tone="accent">Doctor is in the room</Chip> : apt.onDemand && !apt.clinician ? <Chip tone="warning">In the queue</Chip> : <Chip tone="neutral">{relativeTime(apt.startsAt)}</Chip>}</header>
            {apt.onDemand && apt.status === 'Scheduled' && <QueueStatus apt={apt} />}
            <div className="portal-row">
              <label className="form-field"><span>Pharmacy</span><select value={apt.pharmacy ?? 'in-house'} onChange={(event) => setVisitPharmacy(apt.id, event.target.value)} aria-label={`Pharmacy for ${apt.id}`}>{places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
              {apt.payment && <span className="record-hint">Paid {formatCurrency(apt.payment.amount)} by {apt.payment.payer.toLowerCase()} · <span className="mono">{apt.payment.reference}</span></span>}
              {apt.reminders?.sent.length ? <span className="record-hint">Last reminder {relativeTime(apt.reminders.sent[apt.reminders.sent.length - 1].at)}</span> : null}
            </div>
            <footer>
              {!apt.onDemand && <Button size="sm" icon={Video} disabled={!open(apt)} onClick={() => join(apt)}>{open(apt) ? 'Join' : 'Join opens 10 min before'}</Button>}
              {apt.status === 'Scheduled' && (confirming === apt.id
                ? <><span className="record-hint">{refundable ? 'You will get a full refund.' : 'Less than 2 hours to go: this visit is not refundable.'}</span><Button size="sm" variant="danger" onClick={() => { cancelVideoVisit(apt.id, 'Patient'); setConfirming(null) }}>Cancel visit</Button><Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>Keep it</Button></>
                : <Button size="sm" variant="ghost" onClick={() => setConfirming(apt.id)}>Cancel…</Button>)}
            </footer>
          </article>
        )
      })}
      <h2>Past visits</h2>
      {past.length === 0 && <p className="record-hint">Your visit summaries will appear here.</p>}
      {past.map((apt) => <PastVisit key={apt.id} apt={apt} patient={patient} onFollowUp={() => onFollowUp(apt)} />)}
    </div>
  )
}

function PastVisit({ apt, patient, onFollowUp }: { apt: Appointment; patient: Patient; onFollowUp: () => void }) {
  const { state, rateVisit } = useHospital()
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const s = apt.summary
  const html = () => avsHtml(apt, patient, state.settings.name)
  return (
    <article className="portal-visit">
      <header><div><b>{formatDateTime(apt.startsAt)} · {apt.clinician || 'Video visit'}</b><small>{apt.service ?? 'Video visit'} · {apt.reason}</small></div>{apt.status === 'Cancelled' ? <Chip tone="neutral">Cancelled{apt.payment?.refundedAt ? ' · refunded' : ''}</Chip> : <Chip tone="success">Completed</Chip>}</header>
      {s && <div className="portal-avs">
        <span className="detail-heading"><ClipboardList size={13} /> After-visit summary</span>
        <p><b>Diagnosis:</b> {s.diagnosis}</p>
        <p><b>Plan:</b> {s.plan}</p>
        {s.advice && <p><b>When to get help:</b> {s.advice}</p>}
        {s.prescriptions.length > 0 && <><p><b>Prescriptions</b> — collect at {s.pharmacy ?? pharmacyName(apt.pharmacy, state)}:</p><ul>{s.prescriptions.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {s.orders.length > 0 && <><p><b>Tests ordered</b></p><ul>{s.orders.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {s.followUp && <p><b>Follow-up:</b> {s.followUp}</p>}
        <div className="portal-row"><Button size="sm" variant="secondary" icon={Printer} onClick={() => printHtml(html())}>Print</Button><Button size="sm" variant="secondary" icon={Download} onClick={() => downloadHtml(`visit-summary-${apt.id}.html`, html())}>Download</Button>{apt.status === 'Completed' && apt.clinician && <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={onFollowUp}>Book a follow-up</Button>}</div>
      </div>}
      {apt.status === 'Completed' && !s && <p className="record-hint">Your clinician has not shared a summary for this visit.</p>}
      {apt.status === 'Completed' && (apt.rating
        ? <p className="portal-rated">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} className={index < apt.rating!.stars ? 'on' : ''} />)} <span>Thank you for your feedback</span></p>
        : <div className="portal-rate">
          <span>How was your visit?</span>
          <div role="radiogroup" aria-label="Rating">{Array.from({ length: 5 }, (_, index) => <button key={index} type="button" role="radio" aria-checked={stars === index + 1} aria-label={`${index + 1} star${index ? 's' : ''}`} className={index < stars ? 'on' : ''} onClick={() => setStars(index + 1)}><Star size={18} /></button>)}</div>
          {stars > 0 && <><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Anything we could do better? (optional)" aria-label="Feedback" /><Button size="sm" onClick={() => rateVisit(apt.id, stars, comment)}>Send rating</Button></>}
        </div>)}
    </article>
  )
}

/* ---------- Secure messages ---------- */

function Messages({ patient }: { patient: Patient }) {
  const { state, openThread, patientMessage } = useHospital()
  const threads = state.messageThreads.filter((item) => item.patientId === patient.id).sort((a, b) => b.openedAt.localeCompare(a.openedAt))
  const [openId, setOpenId] = useState<string | null>(threads[0]?.id ?? null)
  const [composing, setComposing] = useState(threads.length === 0)
  const [form, setForm] = useState({ department: GP_DEPARTMENT as DepartmentId, subject: '', text: '', photos: [] as string[], confidential: false })
  const [payment, setPayment] = useState<PaymentDetails>({ payer: 'Mobile money', card: '', expiry: '', cvc: '', wallet: 'telebirr', walletPhone: patient.phone ?? '', insurer: patient.insurance && patient.insurance !== 'Self-pay' ? patient.insurance : '', member: '', employer: '', employee: '' })
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const live = useIntegrations()
  const fee = priceOf('SV-17', state.services)
  const online = isOnline(live, payment.payer)
  const amountText = online && live?.payments ? `${(live.prices['SV-17'] ?? fee.price).toFixed(2)} ${live.payments.currency}` : formatCurrency(fee.price)
  const [redirecting, setRedirecting] = useState(false)
  const thread = threads.find((item) => item.id === openId)
  useEffect(() => { if (!openId && threads[0]) setOpenId(threads[0].id) }, [openId, threads])

  const send = async () => {
    if (form.subject.trim().length < 3) { setError('Add a short subject.'); return }
    if (form.text.trim().length < 5) { setError('Write your question.'); return }
    const problem = online ? '' : paymentProblem(payment); if (problem) { setError(problem); return }
    const draft: ThreadDraft = { patientId: patient.id, department: form.department, subject: form.subject, text: form.text, photos: form.photos, payer: payment.payer, insurer: payment.payer === 'Insurance' ? payment.insurer : payment.payer === 'Corporate plan' ? payment.employer : undefined, confidential: form.confidential }
    if (online) {
      setRedirecting(true)
      try {
        const checkout = await startCheckout('SV-17', { name: patient.name, phone: payment.payer === 'Mobile money' ? payment.walletPhone : patient.phone, email: patient.email })
        savePending({ kind: 'message', reference: checkout.reference, provider: checkout.provider, amount: checkout.amount, patientId: patient.id, payload: draft, at: new Date().toISOString() })
        window.location.assign(checkout.checkoutUrl)
      } catch (failure) { setRedirecting(false); setError(failure instanceof Error ? failure.message : 'Could not start the payment.') }
      return
    }
    const id = openThread(draft)
    if (!id) { setError('Your message could not be sent.'); return }
    setError(''); setComposing(false); setOpenId(id); setForm({ department: GP_DEPARTMENT, subject: '', text: '', photos: [], confidential: false })
  }

  return (
    <div className="portal-messages">
      <aside>
        <Button icon={MessageSquareText} onClick={() => setComposing(true)}>New message</Button>
        {threads.map((item) => <button key={item.id} type="button" className={`portal-thread ${item.id === openId && !composing ? 'on' : ''}`} onClick={() => { setOpenId(item.id); setComposing(false) }}><b>{item.subject}</b><small>{item.status === 'Awaiting reply' ? `Reply by ${formatDateTime(item.dueAt)}` : item.status === 'Answered' ? `Answered by ${item.clinician}` : 'Closed'}</small></button>)}
      </aside>
      <section className="join-card portal-card">
        {composing ? <>
          <h1>Message the clinic</h1>
          <p className="record-hint">For questions that can wait a day: results, medicines, a rash or wound. A clinician replies within one working day. {formatCurrency(fee.price)} per question, VAT included.</p>
          <div className="form-grid form-grid-2">
            <label className="form-field"><span>To</span><select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} aria-label="Department">{videoCatalogue(state.departments, state.staff).map((group) => <optgroup key={group.id} label={group.label}>{group.items.filter((item) => item.doctors.length).map((item) => <option key={item.department.id} value={item.department.id}>{item.specialty.label}</option>)}</optgroup>)}</select></label>
            <label className="form-field"><span>Subject</span><input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} aria-label="Subject" /></label>
            <label className="form-field span-2"><span>Your question</span><textarea rows={4} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} aria-label="Your question" /></label>
          </div>
          <PhotoPicker photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
          <label className="remember-row"><input type="checkbox" checked={form.confidential} onChange={(event) => setForm({ ...form, confidential: event.target.checked })} />Keep this confidential (mental or sexual health)</label>
          <PaymentFields value={payment} onChange={setPayment} live={live} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button icon={Send} disabled={redirecting} onClick={() => void send()}>{redirecting ? 'Opening secure checkout…' : `Pay ${amountText} and send`}</Button>
        </> : thread ? <>
          <h1>{thread.subject}</h1>
          <p className="record-hint">{thread.status === 'Awaiting reply' ? `A clinician will reply by ${formatDateTime(thread.dueAt)}.` : thread.status === 'Answered' ? `Answered by ${thread.clinician}.` : 'This conversation is closed. Start a new message if you need more help.'}</p>
          <div className="portal-chat">{thread.messages.map((line) => <div key={line.id} className={line.from === 'Patient' ? 'me' : ''}><b>{line.name}</b><p>{line.text}</p>{line.photos?.length ? <div className="portal-photos">{line.photos.map((src, index) => <figure key={index}><img src={src} alt={`Attached photo ${index + 1}`} /></figure>)}</div> : null}<small>{formatDateTime(line.at)}</small></div>)}</div>
          {thread.status !== 'Closed' && <div className="referral-reply"><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add more detail" aria-label="Add to the message" /><Button size="sm" icon={Send} disabled={!reply.trim()} onClick={() => { patientMessage(thread.id, reply, []); setReply('') }}>Send</Button></div>}
        </> : <p className="record-hint">No messages yet.</p>}
      </section>
      <p className="record-hint portal-back"><Link to="/join">Have a visit code? Join a visit</Link></p>
    </div>
  )
}

