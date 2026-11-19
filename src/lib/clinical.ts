import { chartAlerts } from './charts'
import { specialtyFor } from './specialty'
import type { ClinicalOrder, Consciousness, FormularyItem, OrderKind, OrderStatus, Patient, Prescription, Vitals } from '../types'

/* ---------------- NEWS2 ---------------- */

export interface News2 {
  score: number
  band: 'Low' | 'Low–medium' | 'Medium' | 'High'
  /** True when any single parameter scores 3 (triggers urgent review on its own). */
  redFlag: boolean
  detail: string[]
}

/** National Early Warning Score 2 (Royal College of Physicians, scale 1 for SpO₂). Adults only. */
export function news2(v: Vitals, onOxygen = false, consciousness: Consciousness = 'Alert'): News2 {
  const parts: Array<[string, number]> = []
  const rr = v.rr <= 8 ? 3 : v.rr <= 11 ? 1 : v.rr <= 20 ? 0 : v.rr <= 24 ? 2 : 3
  const spo2 = v.spo2 <= 91 ? 3 : v.spo2 <= 93 ? 2 : v.spo2 <= 95 ? 1 : 0
  const air = onOxygen ? 2 : 0
  const sbp = v.bpSys <= 90 ? 3 : v.bpSys <= 100 ? 2 : v.bpSys <= 110 ? 1 : v.bpSys <= 219 ? 0 : 3
  const hr = v.hr <= 40 ? 3 : v.hr <= 50 ? 1 : v.hr <= 90 ? 0 : v.hr <= 110 ? 1 : v.hr <= 130 ? 2 : 3
  const cvpu = consciousness === 'Alert' ? 0 : 3
  const temp = v.temp <= 35 ? 3 : v.temp <= 36 ? 1 : v.temp <= 38 ? 0 : v.temp <= 39 ? 1 : 2
  parts.push([`RR ${v.rr}`, rr], [`SpO₂ ${v.spo2}%`, spo2], ['Supplemental oxygen', air], [`SBP ${v.bpSys}`, sbp], [`HR ${v.hr}`, hr], [consciousness, cvpu], [`Temp ${v.temp}°C`, temp])
  const score = parts.reduce((sum, [, points]) => sum + points, 0)
  const redFlag = parts.some(([, points]) => points === 3)
  const band = score >= 7 ? 'High' : score >= 5 ? 'Medium' : redFlag ? 'Low–medium' : 'Low'
  return { score, band, redFlag, detail: parts.filter(([, points]) => points > 0).map(([label, points]) => `${label} (+${points})`) }
}

export function patientNews2(patient: Patient): News2 | null {
  if (patient.age < 16) return null
  const latest = patient.observations?.[0]
  return news2(patient.vitals, latest?.onOxygen ?? false, latest?.consciousness ?? (patient.vitals.gcs < 15 ? 'New confusion' : 'Alert'))
}

export const newsTone = (score: number) => (score >= 7 ? 'danger' : score >= 5 ? 'warning' : 'success') as 'danger' | 'warning' | 'success'

/** Response expected for a NEWS2 score (RCP guidance, simplified). */
export function newsResponse(n: News2) {
  if (n.score >= 7) return 'Emergency response: immediate review by a clinician with critical-care skills; continuous monitoring.'
  if (n.score >= 5) return 'Urgent response: urgent review by the ward doctor; observations at least hourly.'
  if (n.redFlag) return 'A single parameter scored 3: urgent ward-based review.'
  if (n.score >= 1) return 'Ward-based response: observations at least 4–6 hourly; inform the nurse in charge.'
  return 'Routine observations at least 12 hourly.'
}

/** Abnormal observation flags with paediatric limits for children under 12. */
export function observationFlags(v: Vitals, age: number) {
  const child = age < 12
  const flags: string[] = []
  if (child ? v.hr > 150 || v.hr < 70 : v.hr > 120 || v.hr < 45) flags.push(`HR ${v.hr}`)
  if (child ? v.rr > 30 || v.rr < 15 : v.rr > 24 || v.rr < 9) flags.push(`RR ${v.rr}`)
  if (v.spo2 < 94) flags.push(`SpO₂ ${v.spo2}%`)
  if (v.bpSys < (child ? 80 : 90) || v.bpSys >= 180) flags.push(`BP ${v.bpSys}/${v.bpDia}`)
  if (v.temp >= 38.5 || v.temp < 35.5) flags.push(`T ${v.temp}°C`)
  if (v.gcs < 15) flags.push(`GCS ${v.gcs}`)
  return flags
}

/* ---------------- Order stages ---------------- */

export const ORDER_STAGES: Record<OrderKind, string[]> = {
  Laboratory: ['Requested', 'Collected', 'In analysis', 'Awaiting verification', 'Verified'],
  Imaging: ['Requested', 'Scheduled', 'Acquired', 'Reported'],
  Medication: ['Prescribed', 'Verified', 'Dispensed', 'Administered'],
  Procedure: ['Requested', 'Scheduled', 'Performed'],
  Physiotherapy: ['Requested', 'Assessed', 'In treatment', 'Completed'],
  Nutrition: ['Requested', 'Assessed', 'Plan issued'],
  'Blood bank': ['Requested', 'Sample received', 'Crossmatched', 'Issued', 'Transfused'],
}

export const EXTERNAL_STAGES = ['Referred', 'Sample sent or booked', 'Result received']

/** Stages for an order: investigations sent to a referral partner follow a shorter pipeline. */
export function stagesFor(order: Pick<ClinicalOrder, 'kind' | 'externalProviderId'>) {
  return order.externalProviderId ? EXTERNAL_STAGES : ORDER_STAGES[order.kind]
}

export function orderStage(order: ClinicalOrder) {
  const stages = stagesFor(order)
  if (order.stage !== undefined) return Math.min(order.stage, stages.length - 1)
  return order.status === 'completed' ? stages.length - 1 : order.status === 'in-progress' ? 1 : 0
}

export function statusForStage(order: Pick<ClinicalOrder, 'kind' | 'externalProviderId'>, stage: number): OrderStatus {
  const last = stagesFor(order).length - 1
  return stage >= last ? 'completed' : stage === 0 ? 'ordered' : 'in-progress'
}

/** True when the next step needs a written result (the final reporting step). */
export const needsResult = (order: ClinicalOrder) => {
  const next = orderStage(order) + 1
  if (order.externalProviderId) return next === EXTERNAL_STAGES.length - 1
  const stages = ORDER_STAGES[order.kind]
  return ['Laboratory', 'Imaging'].includes(order.kind) && next === stages.length - (order.kind === 'Laboratory' ? 2 : 1)
}

export const SERVICE_KINDS: OrderKind[] = ['Physiotherapy', 'Nutrition', 'Blood bank']

/* ---------------- Medicines ---------------- */

export const INTERACTIONS: Array<[string, string, 'High' | 'Moderate', string]> = [
  ['warfarin', 'aspirin', 'High', 'Increased bleeding risk. Avoid unless clearly indicated; monitor INR and watch for bleeding.'],
  ['warfarin', 'ibuprofen', 'High', 'Increased bleeding risk, including gastrointestinal bleeding. Avoid the combination.'],
  ['enalapril', 'spironolactone', 'Moderate', 'Risk of high potassium. Monitor potassium and creatinine.'],
  ['clopidogrel', 'omeprazole', 'Moderate', 'Omeprazole may reduce the antiplatelet effect of clopidogrel. Consider pantoprazole.'],
  ['morphine', 'diazepam', 'High', 'Additive respiratory and central nervous system depression. Use the lowest doses and monitor closely.'],
  ['morphine', 'midazolam', 'High', 'Additive respiratory depression and sedation. Monitor closely and have naloxone available.'],
  ['digoxin', 'furosemide', 'Moderate', 'Diuretic-induced low potassium raises the risk of digoxin toxicity. Monitor potassium.'],
  ['metoprolol', 'labetalol', 'High', 'Two beta-blockers: risk of profound bradycardia and hypotension.'],
  ['aspirin', 'ibuprofen', 'Moderate', 'Ibuprofen can reduce aspirin’s antiplatelet effect and adds gastrointestinal bleeding risk.'],
]

export function interactionBetween(a: string, b: string) {
  return INTERACTIONS.find(([x, y]) => (x === a && y === b) || (x === b && y === a)) ?? null
}

const ALLERGY_CLASSES: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'flucloxacillin', 'penicillin'],
  cephalosporin: ['ceftriaxone'],
  aspirin: ['aspirin'],
  nsaid: ['ibuprofen', 'aspirin'],
  codeine: ['codeine', 'morphine'],
  sulfonamide: ['sulfamethoxazole'],
}

export interface PrescribingWarning { level: 'High' | 'Moderate'; text: string }

/** Allergy, interaction and duplicate-therapy checks for a new medicine. */
export function prescribingWarnings(med: FormularyItem, patient: Patient, active: Prescription[], formulary: FormularyItem[]): PrescribingWarning[] {
  const warnings: PrescribingWarning[] = []
  for (const allergy of patient.allergies) {
    const key = allergy.toLowerCase()
    if (key.includes('no known')) continue
    const hits = Object.entries(ALLERGY_CLASSES).filter(([cls]) => key.includes(cls)).flatMap(([, generics]) => generics)
    if (key.includes(med.generic) || hits.includes(med.generic)) warnings.push({ level: 'High', text: `Recorded allergy: ${allergy}. ${med.name} may cross-react.` })
  }
  const otherGenerics = active
    .filter((rx) => rx.patientId === patient.id && ['Pending', 'Verified', 'Dispensed'].includes(rx.status))
    .flatMap((rx) => rx.items.map((item) => formulary.find((f) => f.id === item.medicationId)))
    .filter((item): item is FormularyItem => Boolean(item))
  for (const other of otherGenerics) {
    if (other.generic === med.generic) warnings.push({ level: 'Moderate', text: `Duplicate therapy: ${other.name} is already prescribed.` })
    const hit = interactionBetween(med.generic, other.generic)
    if (hit) warnings.push({ level: hit[2], text: `${hit[2]} interaction with ${other.name}: ${hit[3]}` })
  }
  if (med.contraindications.length) warnings.push({ level: 'Moderate', text: `Check contraindications: ${med.contraindications.join('; ')}.` })
  return warnings
}

/* ---------------- Theatres ---------------- */

export const THEATRE_STAGES = ['Scheduled', 'Pre-op check', 'In theatre', 'Recovery', 'Handed over']
export const THEATRE_ACTIONS = ['Start pre-op check', 'Send to theatre', 'Move to recovery', 'Hand over to ward']
export const SAFETY_CHECKLIST = ['Identity, site and procedure confirmed', 'Consent signed', 'Site marked', 'Anaesthesia safety check complete', 'Allergies reviewed', 'Blood loss risk assessed']
export const ASA: Record<number, string> = { 1: 'Healthy', 2: 'Mild systemic disease', 3: 'Severe systemic disease', 4: 'Constant threat to life', 5: 'Moribund' }
export const THEATRES = ['Theatre 1', 'Theatre 2', 'Theatre 3']

/* ---------------- Clinical evaluation ---------------- */

export const EXAM_SYSTEMS = ['General appearance', 'Cardiovascular', 'Respiratory', 'Abdomen', 'Neurological', 'Musculoskeletal', 'Skin', 'Head, ears, nose and throat']

export const ICD10: Array<[string, string]> = [
  ['J18.9', 'Pneumonia, unspecified'],
  ['I21.4', 'Non-ST elevation myocardial infarction'],
  ['I50.9', 'Heart failure, unspecified'],
  ['I63.9', 'Cerebral infarction, unspecified'],
  ['J45.901', 'Asthma with acute exacerbation'],
  ['J44.1', 'COPD with acute exacerbation'],
  ['A41.9', 'Sepsis, unspecified organism'],
  ['E11.9', 'Type 2 diabetes mellitus'],
  ['E10.10', 'Diabetic ketoacidosis'],
  ['N17.9', 'Acute kidney injury'],
  ['K92.2', 'Gastrointestinal haemorrhage'],
  ['O14.9', 'Pre-eclampsia'],
  ['H66.90', 'Otitis media'],
  ['G43.909', 'Migraine'],
  ['L03.90', 'Cellulitis'],
  ['S52.509', 'Fracture of lower end of radius'],
  ['A15.0', 'Pulmonary tuberculosis'],
  ['D64.9', 'Anaemia, unspecified'],
]

/* ---------------- Growth (illustrative, not WHO data) ---------------- */

/** Approximate median weight in kg by age 1–10 years. */
export const WEIGHT_MEDIAN: Record<'Male' | 'Female', number[]> = {
  Male: [9.6, 12.2, 14.3, 16.3, 18.3, 20.5, 22.9, 25.4, 28.1, 31.2],
  Female: [8.9, 11.5, 13.9, 16.1, 18.2, 20.2, 22.4, 25.0, 28.2, 31.9],
}

/* ---------------- ED targets ---------------- */

export const ESI_TARGET_MINUTES: Record<number, number> = { 1: 0, 2: 10, 3: 30, 4: 60, 5: 120 }

/* ---------------- Who may move an order forward ---------------- */

export function canAdvanceOrder(order: ClinicalOrder, role: string) {
  const stage = orderStage(order)
  const last = stagesFor(order).length - 1
  if (stage >= last || role === 'administrator') return false
  // Referred investigations are tracked by the ward team and laboratory/radiology staff.
  if (order.externalProviderId) return ['physician', 'consultant', 'intern', 'nurse', 'diagnostics', 'receptionist'].includes(role)
  switch (order.kind) {
    case 'Laboratory': return role === 'diagnostics' || (stage === 0 && role === 'nurse')
    case 'Imaging': return role === 'diagnostics'
    case 'Medication': return stage === last - 1 ? role === 'nurse' : role === 'pharmacist'
    case 'Procedure': return ['physician', 'consultant', 'theatre'].includes(role)
    case 'Blood bank': return stage === last - 1 ? role === 'nurse' : role === 'allied' || role === 'diagnostics'
    default: return role === 'allied'
  }
}

/** Clinical alerts shown at the top of a patient record (as in Selam). */
export function patientAlerts(patient: Patient, orders: ClinicalOrder[]) {
  const alerts: Array<{ tone: 'danger' | 'warning'; text: string }> = []
  if (patient.vitals.hr) {
    const flags = observationFlags(patient.vitals, patient.age)
    if (flags.length) alerts.push({ tone: 'warning', text: `Abnormal observations: ${flags.join(', ')}` })
  }
  const score = patientNews2(patient)
  if (score && patient.vitals.hr && (score.score >= 5 || score.redFlag)) alerts.push({ tone: score.score >= 7 ? 'danger' : 'warning', text: `NEWS2 ${score.score} (${score.band}): ${newsResponse(score)}` })
  if (patient.escalation) alerts.push({ tone: 'warning', text: `Escalated to the medical team by ${patient.escalation.by} (NEWS2 ${patient.escalation.score})` })
  orders.filter((order) => order.patientId === patient.id && order.result && /\b(low|high|critical)\b/i.test(order.result)).forEach((order) => alerts.push({ tone: 'warning', text: `Abnormal result · ${order.title}: ${order.result}` }))
  specialtyFor(patient).alerts.forEach((text) => alerts.push({ tone: 'warning', text }))
  chartAlerts(patient).forEach((flag) => alerts.push({ tone: 'danger', text: flag.text }))
  const allergies = patient.allergies.filter((allergy) => !/no known|not yet/i.test(allergy))
  if (allergies.length) alerts.push({ tone: 'danger', text: `Allergy: ${allergies.join(', ')}` })
  return alerts
}
