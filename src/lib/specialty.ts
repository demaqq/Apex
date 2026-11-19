import type { Patient } from '../types'

/** One field in a specialty assessment form. */
export interface SpecialtyField {
  key: string
  label: string
  type: 'number' | 'date' | 'select' | 'text'
  options?: string[]
  min?: number
  max?: number
  required?: boolean
}

export type Values = Record<string, string>
type Tone = 'accent' | 'danger' | 'warning' | 'success' | 'neutral'

export interface SpecialtyConfig {
  title: string
  worklist: string
  fields: SpecialtyField[]
  /** Returns an error message when the values don't make sense. */
  check?: (values: Values) => string | undefined
  calc: (values: Values, patient: Patient) => { chips: Array<[string, Tone]>; alerts: string[] }
  summary: (values: Values) => string
}

const num = (value: string | undefined) => (value === undefined || value === '' ? undefined : Number(value))
const daysSince = (date: string) => Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86_400_000)
const addDays = (date: string, days: number) => new Date(new Date(`${date}T00:00:00`).getTime() + days * 86_400_000).toISOString().slice(0, 10)
const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
const hearing = (db: number) => (db <= 25 ? 'normal' : db <= 40 ? 'mild' : db <= 55 ? 'moderate' : db <= 70 ? 'moderately severe' : db <= 90 ? 'severe' : 'profound')
const VA = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'Counting fingers', 'Hand movements', 'Light perception', 'No light perception']

const obstetric: SpecialtyConfig = {
  title: 'Obstetric assessment',
  worklist: 'Antenatal and maternity patients: gestational age, due date and high-risk alerts',
  fields: [
    { key: 'lmp', label: 'Last menstrual period', type: 'date', required: true },
    { key: 'gravida', label: 'Gravida', type: 'number', min: 1, max: 20, required: true },
    { key: 'para', label: 'Para', type: 'number', min: 0, max: 20, required: true },
    { key: 'fundal', label: 'Fundal height (cm)', type: 'number', min: 5, max: 50 },
    { key: 'fhr', label: 'Fetal heart rate (bpm)', type: 'number', min: 60, max: 220, required: true },
    { key: 'presentation', label: 'Presentation', type: 'select', options: ['Cephalic', 'Breech', 'Transverse', 'Not assessed'] },
    { key: 'dilation', label: 'Cervical dilation (cm)', type: 'number', min: 0, max: 10 },
    { key: 'contractions', label: 'Contractions per 10 min', type: 'number', min: 0, max: 10 },
  ],
  check: (v) => {
    const days = daysSince(v.lmp)
    if (Number.isNaN(days) || days < 0) return 'The last menstrual period cannot be in the future.'
    if (days > 315) return 'That date gives more than 45 weeks. Check the date.'
    return undefined
  },
  calc: (v, patient) => {
    const days = daysSince(v.lmp)
    const weeks = Math.floor(days / 7)
    const chips: Array<[string, Tone]> = [[`GA ${weeks}w${days % 7}d`, 'accent'], [`EDD ${addDays(v.lmp, 280)}`, 'accent'], [`G${v.gravida}P${v.para}`, 'neutral']]
    const alerts: string[] = []
    const fhr = num(v.fhr) ?? 140
    const contractions = num(v.contractions) ?? 0
    const dilation = num(v.dilation)
    if (patient.vitals.bpSys >= 140 || patient.vitals.bpDia >= 90) alerts.push(`Hypertension in pregnancy (${patient.vitals.bpSys}/${patient.vitals.bpDia}): assess for pre-eclampsia.`)
    if (fhr < 110 || fhr > 160) alerts.push(`Abnormal fetal heart rate (${fhr} bpm).`)
    if (weeks >= 41) alerts.push(`Post-term pregnancy (${weeks} weeks).`)
    if (weeks < 37 && contractions >= 4) alerts.push('Contractions before 37 weeks: possible preterm labour.')
    if (weeks >= 36 && v.presentation && !['Cephalic', 'Not assessed'].includes(v.presentation)) alerts.push('Non-cephalic presentation at term.')
    if (patient.age < 18 || patient.age >= 35) alerts.push(`Maternal age risk factor (${patient.age} years).`)
    if (dilation !== undefined && dilation >= 4) chips.push([`Labour: ${dilation} cm`, 'warning'])
    return { chips, alerts }
  },
  summary: (v) => `GA ${Math.floor(daysSince(v.lmp) / 7)}w, FHR ${v.fhr}${v.dilation ? `, dilation ${v.dilation} cm` : ''}`,
}

const cardiac: SpecialtyConfig = {
  title: 'Cardiac assessment',
  worklist: 'ECG, echocardiography and heart-failure monitoring',
  fields: [
    { key: 'rhythm', label: 'ECG rhythm', type: 'select', options: ['Sinus rhythm', 'Sinus tachycardia', 'Sinus bradycardia', 'Atrial fibrillation', 'ST elevation', 'ST depression', 'Other'], required: true },
    { key: 'rate', label: 'ECG rate (bpm)', type: 'number', min: 20, max: 250, required: true },
    { key: 'qtc', label: 'QTc (ms)', type: 'number', min: 300, max: 700 },
    { key: 'ef', label: 'Ejection fraction (%)', type: 'number', min: 10, max: 80 },
    { key: 'nyha', label: 'NYHA class', type: 'select', options: ['I', 'II', 'III', 'IV'] },
  ],
  calc: (v) => {
    const alerts: string[] = []
    const chips: Array<[string, Tone]> = [[v.rhythm, v.rhythm === 'ST elevation' ? 'danger' : 'accent']]
    const ef = num(v.ef)
    if (ef !== undefined) chips.push([`EF ${ef}%`, ef < 40 ? 'danger' : 'success'])
    if (v.nyha) chips.push([`NYHA ${v.nyha}`, 'neutral'])
    if (v.rhythm === 'ST elevation') alerts.push('ST elevation on ECG: start the acute coronary pathway now.')
    if (v.rhythm === 'Atrial fibrillation' && (num(v.rate) ?? 0) > 110) alerts.push(`Rapid atrial fibrillation (rate ${v.rate}).`)
    if ((num(v.qtc) ?? 0) > 500) alerts.push('QTc above 500 ms: review QT-prolonging medicines.')
    if (ef !== undefined && ef < 40) alerts.push(`Reduced ejection fraction (${ef}%).`)
    if (v.nyha === 'III' || v.nyha === 'IV') alerts.push(`Advanced heart-failure symptoms (NYHA ${v.nyha}).`)
    return { chips, alerts }
  },
  summary: (v) => `${v.rhythm}, rate ${v.rate}${v.ef ? `, EF ${v.ef}%` : ''}`,
}

const critical: SpecialtyConfig = {
  title: 'Emergency and critical care assessment',
  worklist: 'Resuscitation, ED and ICU patients',
  fields: [
    { key: 'arrival', label: 'Arrival mode', type: 'select', options: ['Walk-in', 'Ambulance', 'Referred'] },
    { key: 'avpu', label: 'Consciousness (AVPU)', type: 'select', options: ['Alert', 'Voice', 'Pain', 'Unresponsive'], required: true },
    { key: 'gcs', label: 'Glasgow Coma Scale', type: 'number', min: 3, max: 15, required: true },
    { key: 'oxygen', label: 'Oxygen support', type: 'select', options: ['Room air', 'Supplemental O₂', 'Ventilated'], required: true },
    { key: 'disposition', label: 'Disposition', type: 'select', options: ['Under treatment', 'Admit ICU', 'Admit ward', 'Discharge', 'Transfer out'] },
  ],
  calc: (v) => {
    const gcs = num(v.gcs) ?? 15
    const alerts = gcs <= 8 ? [`GCS ${gcs}: airway at risk.`] : []
    const chips: Array<[string, Tone]> = [[`GCS ${gcs}`, gcs <= 8 ? 'danger' : 'accent'], [v.avpu, v.avpu === 'Alert' ? 'success' : 'warning'], [v.oxygen, v.oxygen === 'Ventilated' ? 'danger' : 'neutral']]
    if (v.disposition) chips.push([v.disposition, 'neutral'])
    return { chips, alerts }
  },
  summary: (v) => `${v.avpu}, GCS ${v.gcs}, ${v.oxygen}`,
}

const fracture: SpecialtyConfig = {
  title: 'Fracture and cast assessment',
  worklist: 'Fracture clinic, plaster room and orthopaedic patients',
  fields: [
    { key: 'site', label: 'Injury site', type: 'text', required: true },
    { key: 'side', label: 'Side', type: 'select', options: ['Left', 'Right', 'Both', 'Midline'], required: true },
    { key: 'type', label: 'Fracture type', type: 'select', options: ['Closed', 'Open', 'Pathological', 'Stress'], required: true },
    { key: 'management', label: 'Management', type: 'select', options: ['Plaster cast', 'Surgery', 'Traction', 'Observation'] },
    { key: 'review', label: 'Review due', type: 'date' },
    { key: 'nv', label: 'Neurovascular status', type: 'select', options: ['Intact', 'Compromised'], required: true },
    { key: 'pain', label: 'Pain (0–10)', type: 'number', min: 0, max: 10 },
  ],
  calc: (v) => {
    const alerts: string[] = []
    const chips: Array<[string, Tone]> = [[`${v.site} (${v.side})`, 'accent'], [v.type, v.type === 'Open' ? 'danger' : 'neutral']]
    if (v.management) chips.push([v.management, 'neutral'])
    if (v.nv === 'Compromised') alerts.push('Neurovascular compromise: urgent review (pain, pallor, pulse, paraesthesia, paralysis).')
    if (v.type === 'Open') alerts.push('Open fracture: antibiotics and surgical debridement pathway.')
    if (v.review && daysSince(v.review) > 0) alerts.push(`Cast review overdue (due ${v.review}).`)
    if ((num(v.pain) ?? 0) >= 8) alerts.push(`Severe pain (${v.pain}/10): reassess analgesia and look for compartment syndrome.`)
    return { chips, alerts }
  },
  summary: (v) => `${v.site} ${v.side}, ${v.type}${v.management ? `, ${v.management}` : ''}`,
}

const hz = ['500', '1000', '2000', '4000']
const audiometry: SpecialtyConfig = {
  title: 'Audiometry and ENT assessment',
  worklist: 'ENT clinic and audiology: hearing thresholds and otoscopy',
  fields: [
    ...hz.map((f) => ({ key: `r${f}`, label: `Right ${f} Hz (dB)`, type: 'number' as const, min: -10, max: 120, required: true })),
    ...hz.map((f) => ({ key: `l${f}`, label: `Left ${f} Hz (dB)`, type: 'number' as const, min: -10, max: 120, required: true })),
    { key: 'otoscopy', label: 'Otoscopy', type: 'select', options: ['Normal', 'Wax', 'Effusion', 'Perforation', 'Infection'] },
  ],
  calc: (v) => {
    const right = average(hz.map((f) => Number(v[`r${f}`])))
    const left = average(hz.map((f) => Number(v[`l${f}`])))
    const alerts: string[] = []
    if (Math.abs(right - left) >= 15) alerts.push(`Asymmetric hearing loss (${right} vs ${left} dB): consider further work-up.`)
    if (Math.max(right, left) >= 70) alerts.push('Severe or profound hearing loss: refer for audiology and rehabilitation.')
    const chips: Array<[string, Tone]> = [[`Right ${right} dB, ${hearing(right)}`, right > 25 ? 'warning' : 'success'], [`Left ${left} dB, ${hearing(left)}`, left > 25 ? 'warning' : 'success']]
    if (v.otoscopy) chips.push([v.otoscopy, v.otoscopy === 'Normal' ? 'neutral' : 'warning'])
    return { chips, alerts }
  },
  summary: (v) => `Pure-tone average right ${average(hz.map((f) => Number(v[`r${f}`])))} dB, left ${average(hz.map((f) => Number(v[`l${f}`])))} dB`,
}

const eye: SpecialtyConfig = {
  title: 'Eye examination',
  worklist: 'Eye clinic: visual acuity and intraocular pressure',
  fields: [
    { key: 'var', label: 'Visual acuity, right', type: 'select', options: VA, required: true },
    { key: 'val', label: 'Visual acuity, left', type: 'select', options: VA, required: true },
    { key: 'iopr', label: 'IOP right (mmHg)', type: 'number', min: 3, max: 70 },
    { key: 'iopl', label: 'IOP left (mmHg)', type: 'number', min: 3, max: 70 },
    { key: 'notes', label: 'Anterior segment notes', type: 'text' },
  ],
  calc: (v) => {
    const alerts: string[] = []
    const chips: Array<[string, Tone]> = [[`VA R ${v.var}`, 'accent'], [`VA L ${v.val}`, 'accent']]
    const r = num(v.iopr)
    const l = num(v.iopl)
    if (r !== undefined) chips.push([`IOP R ${r}`, r > 21 ? 'danger' : 'success'])
    if (l !== undefined) chips.push([`IOP L ${l}`, l > 21 ? 'danger' : 'success'])
    const high = Math.max(r ?? 0, l ?? 0)
    if (high >= 30) alerts.push('Very high intraocular pressure: urgent review.')
    else if (high > 21) alerts.push('Raised intraocular pressure (above 21 mmHg).')
    if (VA.indexOf(v.var) >= 6 || VA.indexOf(v.val) >= 6) alerts.push('Severe visual impairment in at least one eye.')
    return { chips, alerts }
  },
  summary: (v) => `VA ${v.var} / ${v.val}${v.iopr ? `, IOP ${v.iopr}/${v.iopl || '–'}` : ''}`,
}

const nutrition: SpecialtyConfig = {
  title: 'Paediatric nutrition screen',
  worklist: 'Children on the ward and SAM unit: growth, MUAC and oedema',
  fields: [
    { key: 'weight', label: 'Weight (kg)', type: 'number', min: 0.5, max: 120, required: true },
    { key: 'height', label: 'Height / length (cm)', type: 'number', min: 30, max: 200 },
    { key: 'muac', label: 'MUAC (cm)', type: 'number', min: 5, max: 35 },
    { key: 'oedema', label: 'Bilateral pitting oedema', type: 'select', options: ['None', '+', '++', '+++'], required: true },
    { key: 'appetite', label: 'RUTF appetite test', type: 'select', options: ['Not done', 'Pass', 'Fail'] },
  ],
  calc: (v, patient) => {
    const chips: Array<[string, Tone]> = [[`${v.weight} kg`, 'accent']]
    const alerts: string[] = []
    const muac = num(v.muac)
    if (muac !== undefined) chips.push([`MUAC ${muac} cm`, muac < 11.5 ? 'danger' : muac < 12.5 ? 'warning' : 'success'])
    if (v.oedema && v.oedema !== 'None') chips.push([`Oedema ${v.oedema}`, 'danger'])
    const sam = (muac !== undefined && muac < 11.5 && patient.age < 5) || (v.oedema && v.oedema !== 'None')
    if (sam) alerts.push(v.appetite === 'Pass' && v.oedema !== '+++' ? 'Meets SAM criteria: outpatient programme if no medical complications, otherwise admit and start the SAM chart.' : 'Meets SAM criteria with failed or untested appetite or severe oedema: admit and start the SAM chart.')
    else if (muac !== undefined && muac < 12.5 && patient.age < 5) alerts.push('Moderate acute malnutrition: targeted supplementary feeding.')
    return { chips, alerts }
  },
  summary: (v) => `${v.weight} kg${v.muac ? `, MUAC ${v.muac} cm` : ''}, oedema ${v.oedema}`,
}

/** Specialty assessment for each department id; administrators can add “ophthalmology” to enable the eye exam. */
export const SPECIALTY: Record<string, SpecialtyConfig> = {
  obgyn: obstetric,
  pediatrics: nutrition,
  cardiology: cardiac,
  emergency: critical,
  icu: critical,
  surgery: fracture,
  ent: audiometry,
  ophthalmology: eye,
  eye: eye,
}

export function specialtyFor(patient: Patient) {
  const config = SPECIALTY[patient.department]
  const latest = patient.assessments?.[0]
  if (!config || !latest) return { config, latest, chips: [] as Array<[string, Tone]>, alerts: [] as string[] }
  try {
    return { config, latest, ...config.calc(latest.values, patient) }
  } catch {
    return { config, latest, chips: [] as Array<[string, Tone]>, alerts: [] as string[] }
  }
}
