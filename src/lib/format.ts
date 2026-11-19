import type { Patient, PatientStatus } from '../types'

export function minutesSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
}

export function formatWait(iso: string, now = Date.now()) {
  const minutes = minutesSince(iso, now)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = Math.round((new Date(iso).getTime() - now) / 60_000)
  const minutes = Math.abs(diff)
  const future = diff > 0
  if (minutes < 1) return 'just now'
  const amount = minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`
  return future ? `in ${amount}` : `${amount} ago`
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))
export const formatCurrency = (value: number) => currencyFormat2.format(value)

export function getEncounterType(patient: Patient): 'inpatient' | 'outpatient' {
  if (patient.encounterType) return patient.encounterType
  return ['admitted', 'observation'].includes(patient.status) ? 'inpatient' : 'outpatient'
}

export const statusLabels: Record<PatientStatus, string> = {
  'awaiting-payment': 'At reception — billing',
  'awaiting-triage': 'Awaiting triage',
  waiting: 'Waiting',
  'in-treatment': 'In treatment',
  observation: 'Observation',
  admitted: 'Admitted',
  discharged: 'Discharged',
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, rows: Array<Array<string | number | undefined>>) {
  // Prefix cells that spreadsheets would evaluate as formulas.
  const cell = (value: string | number | undefined) => {
    const text = String(value ?? '')
    const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }
  downloadFile(filename, rows.map((row) => row.map(cell).join(',')).join('\n'), 'text/csv;charset=utf-8;')
}

export const today = () => new Date().toISOString().slice(0, 10)

export function patientCsv(patients: Patient[], departmentNames: Record<string, string>) {
  downloadCsv(`patient-census-${today()}.csv`, [
    ['MRN', 'Patient', 'Age', 'Sex', 'Encounter', 'Presenting complaint', 'Department', 'Location', 'Status', 'Assigned clinician', 'Arrival'],
    ...patients.map((patient) => [patient.mrn, patient.name, patient.age, patient.sex, getEncounterType(patient), patient.complaint, departmentNames[patient.department] ?? patient.department, patient.location, statusLabels[patient.status], patient.assignedTo, formatDate(patient.arrival)]),
  ])
}

export function downloadPatientSummary(patient: Patient, departmentName: string) {
  const { vitals } = patient
  const notes = patient.timeline.length
    ? patient.timeline.map((event) => `${formatDate(event.at)} ${formatTime(event.at)} — ${event.title}\n${event.detail} (${event.author})`).join('\n\n')
    : 'No clinical events recorded.'
  const content = [
    'NORTHSTAR CAREOS',
    'Clinical episode summary',
    '',
    `${patient.name} (${patient.mrn})`,
    `${patient.age} years · ${patient.sex}`,
    `Department: ${departmentName}`,
    `Location: ${patient.location}`,
    `Encounter: ${getEncounterType(patient)}`,
    `Status: ${statusLabels[patient.status]}`,
    '',
    'PRESENTING COMPLAINT',
    patient.complaint,
    '',
    'HISTORY',
    patient.history || 'No additional history recorded.',
    '',
    'ALLERGIES',
    patient.allergies.join(', '),
    '',
    'LATEST VITALS',
    `HR ${vitals.hr}/min · RR ${vitals.rr}/min · SpO2 ${vitals.spo2}%`,
    `BP ${vitals.bpSys}/${vitals.bpDia} mmHg · Temp ${vitals.temp}°C · GCS ${vitals.gcs}/15 · Pain ${vitals.pain}/10`,
    '',
    'CLINICAL TIMELINE',
    notes,
    '',
    `Exported ${new Date().toLocaleString('en-GB')}`,
  ].join('\n')
  downloadFile(`${patient.mrn}-episode-summary.txt`, content, 'text/plain;charset=utf-8')
}

let currencyFormat2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
let currentCurrency = 'USD'
/** Sets the facility currency used by formatCurrency (called by the store from settings). */
export function setCurrency(code: string) {
  if (code === currentCurrency) return
  currentCurrency = code
  try { currencyFormat2 = new Intl.NumberFormat(code === 'ETB' ? 'en-ET' : 'en-US', { style: 'currency', currency: code }) } catch { /* keep previous */ }
}
