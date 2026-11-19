export type RoleId = 'physician' | 'nurse' | 'consultant' | 'diagnostics' | 'coordinator' | 'administrator'

export type DepartmentId =
  | 'emergency'
  | 'cardiology'
  | 'neurology'
  | 'radiology'
  | 'laboratory'
  | 'icu'
  | 'surgery'
  | 'ward'
  | 'pharmacy'
  | 'pediatrics'
  | 'obgyn'
  | 'internal-medicine'
  | 'ent'
  | 'dermatology'

export type PatientStatus = 'awaiting-triage' | 'waiting' | 'in-treatment' | 'observation' | 'admitted' | 'discharged'
export type Priority = 'routine' | 'urgent' | 'emergent'
export type ReferralStatus = 'pending' | 'accepted' | 'completed' | 'declined'
export type OrderStatus = 'ordered' | 'in-progress' | 'completed'
export type EsiLevel = 1 | 2 | 3 | 4 | 5
export type Permission = 'triage' | 'refer' | 'transfer' | 'results' | 'notes' | 'discharge' | 'manage'

export interface Vitals {
  hr: number
  rr: number
  spo2: number
  bpSys: number
  bpDia: number
  temp: number
  gcs: number
  pain: number
}

export interface TimelineEvent {
  id: string
  at: string
  type: 'arrival' | 'triage' | 'note' | 'referral' | 'order' | 'transfer' | 'discharge' | 'result'
  title: string
  detail: string
  author: string
  department: DepartmentId
}

export interface Patient {
  id: string
  mrn: string
  name: string
  age: number
  sex: 'Female' | 'Male' | 'Non-binary'
  pronouns: string
  complaint: string
  history: string
  allergies: string[]
  arrival: string
  esi: EsiLevel
  esiOverride?: string
  riskFactors: string[]
  resources: number
  vitals: Vitals
  department: DepartmentId
  location: string
  status: PatientStatus
  encounterType?: 'inpatient' | 'outpatient'
  assignedTo: string
  timeline: TimelineEvent[]
}

export interface Department {
  id: DepartmentId
  name: string
  shortName: string
  lead: string
  onCall: string
  phone: string
  capacity: number
  occupied: number
  targetWait: number
  averageWait: number
  color: string
  description: string
  services: string[]
  zone: string
}

export interface Referral {
  id: string
  patientId: string
  from: DepartmentId
  to: DepartmentId
  reason: string
  priority: Priority
  status: ReferralStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  owner?: string
  recommendation?: string
}

export interface ClinicalOrder {
  id: string
  patientId: string
  title: string
  kind: 'Laboratory' | 'Imaging' | 'Medication' | 'Procedure'
  department: DepartmentId
  priority: Priority
  status: OrderStatus
  createdAt: string
  createdBy: string
  result?: string
}

export interface Activity {
  id: string
  at: string
  actor: string
  action: string
  patientId?: string
  department: DepartmentId
}

export interface RoleProfile {
  id: RoleId
  name: string
  title: string
  shortTitle: string
  employeeId: string
  department: DepartmentId
  initials: string
  shift: string
  workspace: string
  headline: string
  description: string
  focus: string[]
  accent: string
}

export interface TriageInput {
  name: string
  age: number
  sex: Patient['sex']
  complaint: string
  history: string
  allergies: string[]
  vitals: Vitals
  resources: number
  riskFactors: string[]
  esi: EsiLevel
  overrideReason?: string
}

/* ---------- Pharmacy ---------- */

export interface FormularyItem {
  id: string
  name: string
  genericName: string
  category: string
  dosageForm: string
  strength: string
  stock: number
  unit: string
  reorderLevel: number
  pricePerUnit: number
  route: string
  controlled?: boolean
}

export type RxPriority = 'Routine' | 'Urgent' | 'STAT'
export type RxStatus = 'Pending' | 'Verified' | 'Dispensed' | 'Cancelled'

export interface PrescriptionItem {
  medicationId: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
}

export interface Prescription {
  id: string
  patientId: string
  prescriber: string
  department: DepartmentId
  createdAt: string
  priority: RxPriority
  status: RxStatus
  items: PrescriptionItem[]
  diagnosis?: string
  verifiedBy?: string
  dispensedBy?: string
}

/* ---------- Billing ---------- */

export type InvoiceStatus = 'Pending' | 'Claim submitted' | 'Paid' | 'Overdue'

export interface BillItem {
  id: string
  description: string
  code: string
  category: string
  quantity: number
  unitPrice: number
}

export interface Invoice {
  id: string
  patientId: string
  issuedAt: string
  dueAt: string
  items: BillItem[]
  tax: number
  discount: number
  insuranceCovered: number
  insuranceProvider?: string
  claimId?: string
  status: InvoiceStatus
  paidAt?: string
}

/* ---------- Telehealth ---------- */

export type AppointmentStatus = 'Scheduled' | 'In progress' | 'Completed' | 'Cancelled'

export interface Appointment {
  id: string
  patientId: string
  clinician: string
  department: DepartmentId
  startsAt: string
  durationMinutes: number
  mode: 'Video' | 'In person'
  status: AppointmentStatus
  reason: string
}

/* ---------- Staff ---------- */

export interface StaffMember {
  id: string
  name: string
  role: string
  department: DepartmentId
  specialty: string
  shift: 'Day · 07:00–15:00' | 'Evening · 15:00–23:00' | 'Night · 23:00–07:00'
  onDuty: boolean
  pager: string
  email: string
  phone: string
  license: string
}

/* ---------- Emergency codes ---------- */

export interface EmergencyCode {
  id: string
  label: string
  description: string
  responders: string
  tone: 'blue' | 'red' | 'trauma' | 'stroke' | 'stemi' | 'amber'
  active: boolean
  location?: string
  activatedAt?: string
  activatedBy?: string
}

export interface HospitalState {
  patients: Patient[]
  departments: Department[]
  referrals: Referral[]
  orders: ClinicalOrder[]
  activities: Activity[]
  formulary: FormularyItem[]
  prescriptions: Prescription[]
  invoices: Invoice[]
  appointments: Appointment[]
  staff: StaffMember[]
  codes: EmergencyCode[]
}
