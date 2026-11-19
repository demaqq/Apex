import type { AccessGrant, DepartmentId, Patient, Referral, RoleId } from '../types'

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
]

export type LinkReason = 'Assigned' | 'OPD' | 'Consultation' | 'Comorbidity' | 'Shared care' | 'Emergency access'
export interface CareLink { department: DepartmentId; reason: LinkReason; detail: string }

/** Every department connected to a patient, and why. */
export function careLinks(patient: Patient, referrals: Referral[]): CareLink[] {
  const links: CareLink[] = [{ department: patient.department, reason: 'Assigned', detail: patient.location }]
  if (patient.visit && patient.visit.department !== patient.department) links.push({ department: patient.visit.department, reason: 'OPD', detail: `${patient.visit.queueNo}` })
  referrals.filter((r) => r.patientId === patient.id && r.status !== 'declined').forEach((r) => {
    links.push({ department: r.to, reason: 'Consultation', detail: `${r.id} · ${r.status}` })
    links.push({ department: r.from, reason: 'Consultation', detail: `${r.id} · referring team` })
  })
  patient.riskFactors.forEach((factor) => COMORBIDITY_RULES.forEach(([rule, department]) => { if (rule.test(factor)) links.push({ department, reason: 'Comorbidity', detail: factor }) }))
  if (patient.age < 15) links.push({ department: 'pediatrics', reason: 'Comorbidity', detail: 'Child under 15' })
  ;(patient.links ?? []).forEach((link) => links.push({ department: link.department, reason: link.reason, detail: link.note || link.by }))
  // One entry per department + reason.
  return links.filter((link, i) => links.findIndex((other) => other.department === link.department && other.reason === link.reason) === i)
}

export interface Viewer { role: RoleId | null; department: DepartmentId | undefined; name: string; canTriage: boolean; grants: AccessGrant[] }

export function canSeePatient(patient: Patient, viewer: Viewer, referrals: Referral[]) {
  if (!viewer.role || !SCOPED_ROLES.includes(viewer.role)) return true
  if (!viewer.department) return true
  // Before triage nobody owns the patient yet: triage staff need to see them.
  if ((patient.status === 'awaiting-triage') && viewer.canTriage) return true
  if (viewer.grants.some((g) => g.patientId === patient.id && g.role === viewer.role && g.department === viewer.department && new Date(g.until).getTime() > Date.now())) return true
  return careLinks(patient, referrals).some((link) => link.department === viewer.department)
}

export const BREAK_GLASS_HOURS = 4
