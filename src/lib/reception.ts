import type { BillingState, ClinicalOrder, Department, Patient, Payer, ReceptionFees, VisitType } from '../types'

export const DEFAULT_FEES: ReceptionFees = { cardNew: 5, cardReturn: 2, opd: 10, specialistOpd: 20, emergency: 25, admissionDeposit: 150 }

export const PAYERS: Payer[] = ['Self-pay', 'CBHI', 'Health insurance (EHIS)', 'Private insurance', 'Employer / credit', 'Fee waiver']

/** Share of the bill the payer covers. CBHI and EHIS members are covered at public facilities. */
export const payerCover = (payer: Payer) => payer === 'CBHI' || payer === 'Health insurance (EHIS)' || payer === 'Employer / credit' ? 1 : payer === 'Private insurance' ? 0.8 : 0

export const SPECIALIST = new Set(['cardiology', 'neurology', 'oncology', 'ophthalmology', 'ent', 'dermatology', 'obgyn', 'surgery', 'endocrinology', 'orthopedics'])

export const VISIT_LABEL: Record<VisitType, string> = { OPD: 'Outpatient clinic (OPD)', Emergency: 'Emergency', Admission: 'Ward admission', Investigation: 'Lab or imaging only' }

/** Departments that run an OPD clinic: every clinical department except emergency, intensive care, the general ward and the service departments. */
export const opdDepartments = (departments: Department[]) => departments.filter((item) => item.active !== false && !['laboratory', 'radiology', 'pharmacy', 'emergency', 'icu', 'ward', 'nicu', 'or'].includes(item.id))

export const queuePrefix = (department: Department) => department.shortName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'OPD'

export function nextQueueNo(patients: Patient[], department: Department) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const today = patients.filter((p) => p.visit && p.visit.department === department.id && new Date(p.visit.checkedInAt).getTime() >= start.getTime()).length
  return `${queuePrefix(department)}-${String(today + 1).padStart(2, '0')}`
}

/** What reception charges for a visit. */
export function visitCharges(input: { returning: boolean; type: VisitType; department: string; tests: Array<{ name: string; price: number }> }, fees: ReceptionFees) {
  const lines: Array<{ description: string; category: string; price: number }> = []
  lines.push({ description: input.returning ? 'Card renewal (returning patient)' : 'New patient card', category: 'Registration', price: input.returning ? fees.cardReturn : fees.cardNew })
  if (input.type === 'OPD') lines.push({ description: `OPD consultation${SPECIALIST.has(input.department) ? ' (specialist)' : ''}`, category: 'Consultation', price: SPECIALIST.has(input.department) ? fees.specialistOpd : fees.opd })
  if (input.type === 'Emergency') lines.push({ description: 'Emergency assessment', category: 'Consultation', price: fees.emergency })
  if (input.type === 'Admission') lines.push({ description: 'Admission deposit', category: 'Room & nursing', price: fees.admissionDeposit })
  input.tests.forEach((test) => lines.push({ description: test.name, category: 'Investigation', price: test.price }))
  const total = lines.reduce((sum, line) => sum + line.price, 0)
  return { lines, total }
}

export const BILLING_TONE: Record<BillingState, 'success' | 'warning' | 'danger' | 'neutral' | 'accent'> = { Paid: 'success', Covered: 'success', Waived: 'neutral', Deferred: 'warning', Unpaid: 'danger' }

/** Outpatient orders wait for payment; inpatients, emergencies and covered payers don't. */
export function orderBilling(patient: Patient): BillingState {
  if (!patient.visit || patient.visit.type !== 'OPD') return 'Deferred'
  if (patient.visit.billing === 'Waived') return 'Waived'
  return payerCover(patient.visit.payer) >= 1 ? 'Covered' : 'Unpaid'
}

export const unpaidOrders = (orders: ClinicalOrder[], patientId?: string) => orders.filter((order) => order.billing === 'Unpaid' && (!patientId || order.patientId === patientId))
