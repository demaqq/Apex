import { TELE_PRICES } from './telePrices'
import type { Appointment, Connection, Department, HospitalService, HospitalState, Invoice, NetworkFacility, StaffMember, TeleService, VisitPayer } from '../types'

/* ---------- Screening questionnaires (public domain) ---------- */

export const PHQ9 = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading or watching television',
  'Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself',
]

export const GAD7 = [
  'Feeling nervous, anxious or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
]

export const FREQUENCY = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']

export const total = (answers?: number[]) => (answers ?? []).reduce((sum, value) => sum + value, 0)

export function phqBand(score: number) {
  return score >= 20 ? 'Severe' : score >= 15 ? 'Moderately severe' : score >= 10 ? 'Moderate' : score >= 5 ? 'Mild' : 'Minimal'
}
export function gadBand(score: number) {
  return score >= 15 ? 'Severe' : score >= 10 ? 'Moderate' : score >= 5 ? 'Mild' : 'Minimal'
}
/** PHQ-9 item 9 (thoughts of self-harm) answered above "not at all" needs a same-day safety check. */
export const selfHarmFlag = (phq9?: number[]) => Boolean(phq9 && phq9[8] > 0)

/* ---------- Fees ---------- */

export const MESSAGE_SERVICE = 'SV-17'

/** The hospital service a video visit is billed under. */
export function serviceFor(service: TeleService, onDemand: boolean) {
  if (service === 'Mental health') return 'SV-16'
  if (onDemand) return 'SV-15'
  return service === 'Specialist' ? 'SV-02' : 'SV-14'
}

const FALLBACK = TELE_PRICES

export function priceOf(id: string, services: HospitalService[]) {
  const service = services.find((item) => item.id === id && item.active && item.status === 'Live')
  return service ? { name: service.name, price: service.price } : FALLBACK[id] ?? { name: 'Consultation', price: 25 }
}

export const PAYERS: VisitPayer[] = ['Card', 'Mobile money', 'Insurance', 'Corporate plan']

/** A paid (or claimed) invoice for a telehealth service. Prices are VAT inclusive. */
export function visitInvoice(id: string, patientId: string, serviceId: string, description: string, amount: number, payer: VisitPayer, insurer?: string, at = new Date().toISOString()): Invoice {
  const claimed = payer === 'Insurance' || payer === 'Corporate plan'
  return {
    id, patientId, issuedAt: at, dueAt: at, tax: 0, discount: 0,
    items: [{ id: `${id}-1`, description, code: serviceId, category: 'Consultation', quantity: 1, unitPrice: amount }],
    insuranceCovered: claimed ? amount : 0,
    insuranceProvider: claimed ? (insurer || payer) : undefined,
    status: claimed ? 'Claim submitted' : 'Paid',
    paidAt: claimed ? undefined : at,
    payments: claimed ? [] : [{ at, by: 'Patient portal', method: payer === 'Card' ? 'Card' : 'Mobile money', amount }],
  }
}

export const paymentReference = () => `PAY-${Array.from(crypto.getRandomValues(new Uint8Array(5)), (byte) => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[byte % 31]).join('')}`

/* ---------- Specialties offered by video ---------- */

export type TeleCategory = 'primary' | 'women' | 'children' | 'mind' | 'medicine' | 'surgery' | 'senses' | 'other'

export const TELE_CATEGORIES: Array<{ id: TeleCategory; label: string; blurb: string }> = [
  { id: 'primary', label: 'Everyday care', blurb: 'Common illnesses, check-ups, results and repeat medicines' },
  { id: 'women', label: "Women's health", blurb: 'Gynaecology, pregnancy and contraception' },
  { id: 'children', label: 'Children and newborns', blurb: 'Babies, children and teenagers' },
  { id: 'mind', label: 'Mental health', blurb: 'Confidential care for mood, anxiety, stress and sleep' },
  { id: 'medicine', label: 'Medical specialties', blurb: 'Heart, hormones, brain and cancer follow-up' },
  { id: 'surgery', label: 'Surgery and bones', blurb: 'Before and after operations, injuries and joints' },
  { id: 'senses', label: 'Skin, eyes, ear, nose and throat', blurb: 'Photos help: rashes, red eyes, ear and throat problems' },
  { id: 'other', label: 'Other clinics', blurb: 'More services from this hospital' },
]

export interface TeleSpecialty { category: TeleCategory; label: string; examples: string; notFor?: string; service: TeleService }

/** Departments that suit video care, with what patients can be seen for. Emergency, intensive care, theatres, imaging and laboratory are not offered by video. */
export const TELE_SPECIALTIES: Record<string, TeleSpecialty> = {
  'internal-medicine': { category: 'primary', service: 'General practice', label: 'General practice and internal medicine', examples: 'Fever, cough and colds, stomach upsets, blood pressure and diabetes check-ins, results, repeat medicines' },
  obgyn: { category: 'women', service: 'Specialist', label: 'Gynaecology and obstetrics', examples: 'Period problems, contraception, fertility questions, antenatal and postnatal check-ins, menopause', notFor: 'Bleeding in pregnancy, severe tummy pain or fewer baby movements — go to the maternity unit now.' },
  pediatrics: { category: 'children', service: 'Specialist', label: 'Paediatrics', examples: 'Fever, rashes, feeding and growth, coughs, asthma and allergy follow-up', notFor: 'A child who is floppy, hard to wake, struggling to breathe or has a rash that does not fade when pressed — go to emergency now.' },
  nicu: { category: 'children', service: 'Specialist', label: 'Newborn follow-up', examples: 'After neonatal care: feeding, weight gain, jaundice and development check-ins' },
  psychiatry: { category: 'mind', service: 'Mental health', label: 'Psychiatry and counselling', examples: 'Low mood, anxiety, stress, sleep problems, medication reviews, child and adolescent mental health', notFor: 'If you might act on thoughts of harming yourself or someone else, call 907 or go to emergency now.' },
  cardiology: { category: 'medicine', service: 'Specialist', label: 'Cardiology', examples: 'Palpitations, blood pressure, after a heart attack or stent, heart medicine reviews', notFor: 'Chest pain or tightness now — call 907.' },
  endocrinology: { category: 'medicine', service: 'Specialist', label: 'Diabetes and thyroid', examples: 'Sugar readings and insulin, thyroid problems, weight and hormone questions' },
  neurology: { category: 'medicine', service: 'Specialist', label: 'Neurology', examples: 'Headaches and migraine, epilepsy, after a stroke, numbness and tingling', notFor: 'Sudden weakness, a drooping face or slurred speech — call 907 now.' },
  oncology: { category: 'medicine', service: 'Specialist', label: 'Oncology follow-up', examples: 'Side effects during treatment, results, follow-up after cancer care', notFor: 'Fever during chemotherapy — come to emergency now.' },
  surgery: { category: 'surgery', service: 'Specialist', label: 'General surgery', examples: 'Wound checks, after an operation, hernia, gallbladder and lump advice' },
  orthopedics: { category: 'surgery', service: 'Specialist', label: 'Orthopaedics', examples: 'After a fracture or joint operation, back, knee and shoulder pain' },
  dermatology: { category: 'senses', service: 'Specialist', label: 'Dermatology', examples: 'Rashes, acne, eczema, psoriasis, hair and nail problems, moles (send photos)' },
  ophthalmology: { category: 'senses', service: 'Specialist', label: 'Eye care', examples: 'Red, itchy or sticky eyes, glasses questions, glaucoma follow-up', notFor: 'Sudden loss of vision or an eye injury — go to emergency now.' },
  ent: { category: 'senses', service: 'Specialist', label: 'Ear, nose and throat', examples: 'Ear pain, sinus problems, sore throat, snoring, hearing' },
}

/** Departments never offered by video. */
export const NOT_BY_VIDEO = ['emergency', 'icu', 'or', 'radiology', 'laboratory', 'pharmacy', 'ward']

export function specialtyOf(department: Department): TeleSpecialty {
  return TELE_SPECIALTIES[department.id] ?? { category: 'other', service: 'Specialist', label: department.name, examples: department.description }
}

/** Whether the department offers video visits: the administrator's choice, else whether the specialty suits video. */
export const offersVideo = (department: Department) => department.active !== false && !NOT_BY_VIDEO.includes(department.id) && (department.telemedicine ?? Boolean(TELE_SPECIALTIES[department.id]))

/** Video departments grouped by category, each with its bookable doctors. */
export function videoCatalogue(departments: Department[], staff: StaffMember[]) {
  const entries = departments.filter(offersVideo).map((department) => ({ department, specialty: specialtyOf(department), doctors: staff.filter((member) => member.department === department.id && bookable(member)) }))
  return TELE_CATEGORIES.map((category) => ({ ...category, items: entries.filter((entry) => entry.specialty.category === category.id) })).filter((group) => group.items.length)
}

/* ---------- Clinicians, slots, queue ---------- */

/** Approved, active doctors (any grade above intern) whom patients can book. */
export const bookable = (member: StaffMember) => Boolean(member.grade) && member.grade !== 'Intern' && !member.suspended && member.status !== 'Pending approval'

export function cliniciansFor(staff: StaffMember[], department?: string) {
  const all = staff.filter(bookable)
  const here = department ? all.filter((member) => member.department === department) : all
  return here.length ? here : all
}

const SLOT_MINUTES = 30

/** Free 30-minute video slots (09:00–16:30, Monday to Friday) over the next `days` days. */
export function freeSlots(clinician: string, appointments: Appointment[], days = 7, now = new Date()) {
  const busy = appointments.filter((item) => item.clinician === clinician && item.status !== 'Cancelled').map((item) => [Date.parse(item.startsAt), Date.parse(item.startsAt) + item.durationMinutes * 60_000])
  const slots: Date[] = []
  for (let day = 0; day <= days; day += 1) {
    const date = new Date(now); date.setDate(now.getDate() + day); date.setHours(9, 0, 0, 0)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    for (let slot = 0; slot < 16; slot += 1) {
      const start = new Date(date.getTime() + slot * SLOT_MINUTES * 60_000)
      if (start.getTime() < now.getTime() + 60 * 60_000) continue
      const end = start.getTime() + SLOT_MINUTES * 60_000
      if (busy.some(([from, to]) => start.getTime() < to && end > from)) continue
      slots.push(start)
    }
  }
  return slots
}

/** Patients waiting for the next free clinician, oldest first. */
export const onDemandQueue = (appointments: Appointment[]) => appointments.filter((item) => item.onDemand && item.status === 'Scheduled' && !item.clinician).sort((a, b) => (a.queuedAt ?? a.startsAt).localeCompare(b.queuedAt ?? b.startsAt))

/** About 8 minutes per patient ahead, shared across clinicians on duty for video. */
export function estimatedWait(position: number, staff: StaffMember[]) {
  const onDuty = Math.max(1, cliniciansFor(staff).filter((member) => member.onDuty).length)
  return Math.max(2, Math.round(((position + 1) * 8) / Math.min(onDuty, 4)))
}

/* ---------- Pharmacies ---------- */

export const IN_HOUSE = 'in-house'

export function pharmacies(network: NetworkFacility[], connections: Connection[], facility: string) {
  const connected = network.filter((item) => item.kind === 'Pharmacy' && connections.some((link) => link.facilityId === item.id && link.status === 'Active' && link.services.includes('Pharmacy')))
  return [{ id: IN_HOUSE, name: `${facility} pharmacy`, detail: 'Collect at the hospital pharmacy' }, ...connected.map((item) => ({ id: item.id, name: item.name, detail: `${item.city} · ${item.capabilities}` }))]
}

export function pharmacyName(id: string | undefined, state: Pick<HospitalState, 'network' | 'settings'>) {
  if (!id || id === IN_HOUSE) return `${state.settings.name} pharmacy`
  return state.network.find((item) => item.id === id)?.name ?? 'Chosen pharmacy'
}

/* ---------- Reminders ---------- */

export function reminderText(apt: Appointment, facility: string) {
  const when = new Date(apt.startsAt).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return `${facility}: reminder of your video visit${apt.clinician ? ` with ${apt.clinician}` : ''} on ${when}. Visit code ${apt.joinCode}. Find a quiet, private place and join 5 minutes early.`
}

/** Reminders go 24 hours and 1 hour before the visit; returns those now due and not yet sent. */
export function dueReminders(apt: Appointment, now = Date.now()) {
  if (!apt.reminders || apt.status !== 'Scheduled') return []
  const start = Date.parse(apt.startsAt)
  // A mark that passed before the visit was booked is skipped: the booking confirmation already covered it.
  const bookedAt = Date.parse(apt.payment?.at ?? '') || 0
  const marks = [start - 24 * 3_600_000, start - 3_600_000].filter((mark) => mark <= now && now < start && mark > bookedAt)
  const lastSent = Math.max(0, ...apt.reminders.sent.map((item) => Date.parse(item.at)))
  return marks.filter((mark) => lastSent < mark)
}

/* ---------- Photos ---------- */

/** Shrinks a photo to at most 900 px and JPEG quality 0.72 so it can travel with the record. */
export function downscalePhoto(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unreadable image')) }
    image.src = url
  })
}

/* ---------- Ratings ---------- */

export function averageRating(appointments: Appointment[]) {
  const rated = appointments.filter((item) => item.rating)
  return rated.length ? { average: rated.reduce((sum, item) => sum + item.rating!.stars, 0) / rated.length, count: rated.length } : null
}

/* ---------- After-visit summary document ---------- */

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function avsHtml(apt: Appointment, patient: { name: string; mrn: string }, facility: string) {
  const s = apt.summary
  if (!s) return ''
  const list = (items: string[]) => items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>None</p>'
  return `<!doctype html><html><head><meta charset="utf-8"><title>After-visit summary</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#16312f}h1{font-size:22px;margin:0}h2{font-size:15px;margin:20px 0 4px;color:#2f6f68}small{color:#5b6f6d}.box{border:1px solid #cfe0dd;border-radius:10px;padding:12px 14px;margin-top:14px}</style></head><body>
<h1>${esc(facility)} · After-visit summary</h1><small>${esc(patient.name)} · ${esc(patient.mrn)} · Video visit ${esc(apt.id)} with ${esc(s.by)} · ${esc(new Date(s.sharedAt).toLocaleString())}</small>
<div class="box"><h2>Diagnosis</h2><p>${esc(s.diagnosis)}</p><h2>Plan</h2><p>${esc(s.plan)}</p>${s.advice ? `<h2>When to get help</h2><p>${esc(s.advice)}</p>` : ''}</div>
<h2>Prescriptions</h2>${list(s.prescriptions)}${s.pharmacy && s.prescriptions.length ? `<p>Collect at <b>${esc(s.pharmacy)}</b> with the code above.</p>` : ''}
<h2>Tests ordered</h2>${list(s.orders)}${s.followUp ? `<h2>Follow-up</h2><p>${esc(s.followUp)}</p>` : ''}
<p><small>In an emergency go to the nearest emergency department or call 907.</small></p></body></html>`
}
