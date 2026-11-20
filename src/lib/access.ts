import type { AccessGrant, Department, DepartmentId, Patient, Referral, RoleId, TheatreCase } from '../types'

/** Clinical roles whose view is limited to patients connected to the department they signed in with. */
export const SCOPED_ROLES: RoleId[] = ['physician', 'nurse', 'consultant', 'intern']

/** Risk factors that make another department part of the care team. */
export const COMORBIDITY_RULES: Array<[RegExp, DepartmentId]> = [
  [/coronary|atrial fibrillation|heart failure|cardiac|myocardial|arrhythm/i, 'cardiology'],
  [/diabet|copd|chronic respiratory|asthma|kidney|renal|hiv|tuberculosis|hypertension(?! in pregnancy)/i, 'internal-medicine'],
  [/pregnan|postpartum|pre-eclampsia|antenatal|labour/i, 'obgyn'],
  [/cancer|chemotherapy|carcinoma|lymphoma|leuk(a)?emia|tumou?r|neutropenia/i, 'oncology'],
  [/stroke|epilep|seizure|parkinson|dementia/i, 'neurology'],
  [/glaucoma|cataract|retinopathy/i, 'ophthalmology'],
  [/eczema|psoriasis|dermatitis/i, 'dermatology'],
  [/malnutrition/i, 'pediatrics'],
  [/diabet|thyroid|adrenal|pituitary/i, 'endocrinology'],
  [/fracture|osteo|joint replacement|spine/i, 'orthopedics'],
  [/preterm|neonat|low birth weight/i, 'nicu'],
]

export type LinkReason = 'Assigned' | 'OPD' | 'Consultation' | 'Comorbidity' | 'Shared care' | 'Theatre list' | 'Emergency access'
export interface CareLink { department: DepartmentId; reason: LinkReason; detail: string }

/** Every department connected to a patient, and why. */
export function careLinks(patient: Patient, referrals: Referral[], theatreCases: TheatreCase[] = []): CareLink[] {
  const links: CareLink[] = [{ department: patient.department, reason: 'Assigned', detail: patient.location }]
  if (patient.visit && patient.visit.department !== patient.department) links.push({ department: patient.visit.department, reason: 'OPD', detail: `${patient.visit.queueNo}` })
  referrals.filter((r) => r.patientId === patient.id && r.status !== 'declined').forEach((r) => {
    links.push({ department: r.to, reason: 'Consultation', detail: `${r.id} · ${r.status}` })
    links.push({ department: r.from, reason: 'Consultation', detail: `${r.id} · referring team` })
  })
  patient.riskFactors.forEach((factor) => COMORBIDITY_RULES.forEach(([rule, department]) => { if (rule.test(factor)) links.push({ department, reason: 'Comorbidity', detail: factor }) }))
  theatreCases.filter((c) => c.patientId === patient.id && c.stage < 4).forEach((c) => links.push({ department: 'or', reason: 'Theatre list', detail: `${c.procedure} · ${c.room}` }))
  if (patient.age < 15) links.push({ department: 'pediatrics', reason: 'Comorbidity', detail: 'Child under 15' })
  ;(patient.links ?? []).forEach((link) => links.push({ department: link.department, reason: link.reason, detail: link.note || link.by }))
  // One entry per department + reason.
  return links.filter((link, i) => links.findIndex((other) => other.department === link.department && other.reason === link.reason) === i)
}

export interface Viewer { role: RoleId | null; department: DepartmentId | undefined; name: string; canTriage: boolean; grants: AccessGrant[]; departments?: Department[] }

/** The department itself plus every unit inside it. */
export function withUnits(departmentId: DepartmentId | undefined, departments: Department[] = []): DepartmentId[] {
  if (!departmentId) return []
  return [departmentId, ...departments.filter((d) => d.parent === departmentId).map((d) => d.id)]
}

export const parentOf = (departmentId: DepartmentId, departments: Department[]) => departments.find((d) => d.id === departments.find((x) => x.id === departmentId)?.parent)

export function canSeePatient(patient: Patient, viewer: Viewer, referrals: Referral[], theatreCases: TheatreCase[] = []) {
  if (!viewer.role || !SCOPED_ROLES.includes(viewer.role)) return true
  if (!viewer.department) return true
  // Before triage nobody owns the patient yet: triage staff need to see them.
  if ((patient.status === 'awaiting-triage') && viewer.canTriage) return true
  if (viewer.grants.some((g) => g.patientId === patient.id && g.role === viewer.role && g.department === viewer.department && new Date(g.until).getTime() > Date.now())) return true
  const scope = withUnits(viewer.department, viewer.departments)
  return careLinks(patient, referrals, theatreCases).some((link) => scope.includes(link.department))
}

export const BREAK_GLASS_HOURS = 4

/** Departments ordered so each unit sits right after its parent. */
export function nested(departments: Department[]): Department[] {
  const tops = departments.filter((d) => !d.parent || !departments.some((p) => p.id === d.parent))
  return tops.flatMap((d) => [d, ...departments.filter((u) => u.parent === d.id)])
}
