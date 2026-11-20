import type { Assessment, AssessmentTool, Entrustment, HospitalState, Profession, RoleId, StaffMember } from '../types'
import { rankOf } from './grades'

export interface Level { id: string; rank: number; trainee: boolean }

/** Training ladders, most junior first. A person can assess anyone in their profession with a lower rank. */
export const LADDERS: Record<Profession, Level[]> = {
  Medicine: [
    { id: 'Intern', rank: 1, trainee: true },
    { id: 'GP', rank: 2, trainee: false },
    ...[1, 2, 3, 4, 5].map((year) => ({ id: `Resident (R${year})`, rank: 3 + year / 10, trainee: true })),
    { id: 'Chief resident', rank: 4, trainee: true },
    { id: 'Senior specialist', rank: 5, trainee: false },
    { id: 'Consultant', rank: 6, trainee: false },
    { id: 'Subspecialist', rank: 7, trainee: false },
    { id: 'Super-specialist', rank: 8, trainee: false },
    { id: 'Professor', rank: 9, trainee: false },
  ],
  Nursing: [
    { id: 'Student nurse', rank: 1, trainee: true },
    { id: 'Intern nurse', rank: 2, trainee: true },
    { id: 'Junior nurse', rank: 3, trainee: true },
    { id: 'Staff nurse', rank: 4, trainee: false },
    { id: 'Senior nurse', rank: 5, trainee: false },
    { id: 'Nurse educator', rank: 6, trainee: false },
  ],
  Pharmacy: [
    { id: 'Pharmacy student', rank: 1, trainee: true },
    { id: 'Pharmacy intern', rank: 2, trainee: true },
    { id: 'Pharmacist', rank: 3, trainee: false },
    { id: 'Senior pharmacist', rank: 4, trainee: false },
    { id: 'Pharmacy manager', rank: 5, trainee: false },
  ],
  Laboratory: [
    { id: 'Laboratory student', rank: 1, trainee: true },
    { id: 'Laboratory intern', rank: 2, trainee: true },
    { id: 'Laboratory technologist', rank: 3, trainee: false },
    { id: 'Senior technologist', rank: 4, trainee: false },
    { id: 'Pathology resident', rank: 4.5, trainee: true },
    { id: 'Pathologist', rank: 6, trainee: false },
  ],
  Imaging: [
    { id: 'Radiography student', rank: 1, trainee: true },
    { id: 'Radiography intern', rank: 2, trainee: true },
    { id: 'Radiographer', rank: 3, trainee: false },
    { id: 'Senior radiographer', rank: 4, trainee: false },
    { id: 'Radiology resident', rank: 4.5, trainee: true },
    { id: 'Radiologist', rank: 6, trainee: false },
  ],
}
export const PROFESSIONS = Object.keys(LADDERS) as Profession[]

/** Which profession a staff member trains or teaches in. */
export function professionOf(member: Pick<StaffMember, 'roleId' | 'role' | 'grade' | 'level'>): Profession | undefined {
  if (member.level) return PROFESSIONS.find((profession) => LADDERS[profession].some((level) => level.id === member.level))
  if (member.grade || ['physician', 'consultant', 'intern'].includes(member.roleId ?? '')) return 'Medicine'
  if (member.roleId === 'nurse' || /nurse/i.test(member.role)) return 'Nursing'
  if (member.roleId === 'pharmacist' || /pharmac/i.test(member.role)) return 'Pharmacy'
  if (member.roleId === 'laboratory' || /patholog|laborator/i.test(member.role)) return 'Laboratory'
  if (member.roleId === 'diagnostics' || member.roleId === 'radiographer' || /radiolog|radiograph/i.test(member.role)) return 'Imaging'
  if (/consultant|physician|surgeon|doctor|officer|neonatolog|oncolog|ophthalmolog|endocrinolog/i.test(member.role)) return 'Medicine'
  return undefined
}

/** A person's level on their ladder. Doctors' levels come from their grade and residency year. */
export function levelOf(member: Pick<StaffMember, 'roleId' | 'role' | 'grade' | 'residentYear' | 'level'>): Level | undefined {
  const profession = professionOf(member)
  if (!profession) return undefined
  const ladder = LADDERS[profession]
  if (member.level) return ladder.find((level) => level.id === member.level)
  if (profession === 'Medicine') {
    const grade = member.grade ?? (member.roleId === 'intern' ? 'Intern' : member.roleId === 'consultant' || /consultant/i.test(member.role) ? 'Consultant' : 'Senior specialist')
    if (grade === 'Resident') return ladder.find((level) => level.id === `Resident (R${member.residentYear ?? 1})`)
    return ladder.find((level) => level.id === grade) ?? { id: grade, rank: rankOf(grade), trainee: false }
  }
  return ladder.find((level) => !level.trainee)
}

/** Assessors must be in the same profession and more senior. */
export function canAssess(assessor: ReturnType<typeof levelOf>, assessorProfession: Profession | undefined, trainee: StaffMember) {
  const level = levelOf(trainee)
  return Boolean(assessor && level && assessorProfession && professionOf(trainee) === assessorProfession && level.trainee && assessor.rank > level.rank)
}

export const TOOLS: Array<{ id: AssessmentTool; text: string }> = [
  { id: 'Mini-CEX', text: 'Observed clinical encounter' },
  { id: 'DOPS', text: 'Directly observed procedure or technical skill' },
  { id: 'Case-based discussion', text: 'Discussion of a patient they managed' },
  { id: 'Multi-source feedback', text: 'Feedback gathered from the team' },
  { id: 'Logbook review', text: 'Review of their logbook and records' },
  { id: 'End-of-rotation', text: 'Summary at the end of a rotation' },
]

export const COMPETENCIES: Record<Profession, string[]> = {
  Medicine: ['History & examination', 'Clinical reasoning', 'Management plan', 'Procedures', 'Documentation', 'Communication', 'Professionalism'],
  Nursing: ['Assessment & observations', 'Medication safety', 'Care planning', 'Infection prevention', 'Documentation', 'Communication', 'Professionalism'],
  Pharmacy: ['Prescription verification', 'Dispensing accuracy', 'Counselling & drug information', 'Stock & controlled drugs', 'Documentation', 'Professionalism'],
  Laboratory: ['Specimen handling', 'Analytical accuracy', 'Quality control', 'Result verification', 'Biosafety', 'Professionalism'],
  Imaging: ['Patient preparation & safety', 'Positioning & technique', 'Radiation protection', 'Image quality', 'Communication', 'Professionalism'],
}

export const SCALE = ['', 'Below expectations', 'Borderline', 'Meets expectations', 'Above expectations', 'Excellent']

export const ENTRUSTMENT: Record<Entrustment, string> = {
  1: 'Observes only',
  2: 'Acts under direct supervision',
  3: 'Acts under indirect supervision',
  4: 'Acts independently',
  5: 'Can supervise others',
}

export const average = (assessment: Pick<Assessment, 'scores'>) => {
  const values = Object.values(assessment.scores).filter((value) => value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

const DAY = 86_400_000

/** What a person actually did in the records over the last 30 days: the evidence beside each assessment. */
export function evidenceFor(name: string, state: Pick<HospitalState, 'patients' | 'activities' | 'prescriptions' | 'orders'>, now = Date.now()) {
  const since = now - 30 * DAY
  const recent = (at?: string) => Boolean(at) && new Date(at!).getTime() >= since
  const entries = state.patients.flatMap((patient) => patient.timeline.filter((event) => event.author === name && recent(event.at)).map((event) => ({ patientId: patient.id, type: event.type })))
  const rounds = state.patients.flatMap((patient) => (patient.rounds ?? []).filter((round) => round.by === name && recent(round.at)).map((round) => ({ ...round, patientId: patient.id })))
  const reviewed = rounds.filter((round) => round.reviews?.length)
  const agreed = reviewed.filter((round) => round.reviews!.every((review) => review.outcome === 'Agreed')).length
  const observations = state.patients.reduce((sum, patient) => sum + (patient.observations ?? []).filter((set) => set.by === name && recent(set.at)).length, 0)
  const actions = state.activities.filter((activity) => activity.actor === name && recent(activity.at))
  const observed = state.patients.filter((patient) => (patient.observations ?? []).some((set) => set.by === name && recent(set.at))).map((patient) => patient.id)
  const patients = new Set([...entries.map((entry) => entry.patientId), ...rounds.map((round) => round.patientId), ...observed, ...actions.map((activity) => activity.patientId).filter(Boolean) as string[]])
  return {
    patients: patients.size,
    notes: entries.filter((entry) => entry.type === 'note').length + rounds.length,
    rounds: rounds.length,
    observations,
    orders: entries.filter((entry) => entry.type === 'order').length,
    actions: actions.length,
    agreement: reviewed.length ? Math.round(agreed / reviewed.length * 100) : undefined,
    reviewed: reviewed.length,
  }
}

/** Levels a non-doctor sign-in can choose, and the profession they belong to. */
export const ROLE_LEVELS: Partial<Record<RoleId, { profession: Profession; levels: string[] }>> = {
  nurse: { profession: 'Nursing', levels: LADDERS.Nursing.map((level) => level.id) },
  pharmacist: { profession: 'Pharmacy', levels: LADDERS.Pharmacy.map((level) => level.id) },
  laboratory: { profession: 'Laboratory', levels: LADDERS.Laboratory.map((level) => level.id) },
  diagnostics: { profession: 'Imaging', levels: ['Radiology resident', 'Radiologist'] },
  radiographer: { profession: 'Imaging', levels: ['Radiography student', 'Radiography intern', 'Radiographer', 'Senior radiographer'] },
}

/** Professions offered when requesting access; doctors then choose a grade, others a level. */
export const PROFESSION_OPTIONS: Array<{ id: string; label: string; role?: RoleId; levels?: string[]; doctor?: boolean }> = [
  { id: 'doctor', label: 'Doctor (medical)', doctor: true },
  { id: 'nurse', label: 'Nurse or midwife', role: 'nurse', levels: ROLE_LEVELS.nurse!.levels },
  { id: 'pharmacist', label: 'Pharmacy', role: 'pharmacist', levels: ROLE_LEVELS.pharmacist!.levels },
  { id: 'laboratory', label: 'Laboratory', role: 'laboratory', levels: ROLE_LEVELS.laboratory!.levels },
  { id: 'radiographer', label: 'Radiography (imaging technologist)', role: 'radiographer', levels: ROLE_LEVELS.radiographer!.levels },
  { id: 'radiologist', label: 'Radiology (doctor)', role: 'diagnostics', levels: ROLE_LEVELS.diagnostics!.levels },
  { id: 'theatre', label: 'Anaesthesia and theatre', role: 'theatre' },
  { id: 'allied', label: 'Physiotherapy, nutrition and blood bank', role: 'allied' },
  { id: 'receptionist', label: 'Reception and records', role: 'receptionist' },
  { id: 'billing', label: 'Billing and finance', role: 'billing' },
  { id: 'coordinator', label: 'Bed and patient-flow coordination', role: 'coordinator' },
]
