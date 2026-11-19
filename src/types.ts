export type RoleId = 'physician' | 'nurse' | 'consultant' | 'diagnostics' | 'coordinator' | 'administrator' | 'intern' | 'pharmacist' | 'receptionist' | 'theatre' | 'allied' | 'billing'

/** Built-in department ids; administrators can add more, so any string is allowed. */
export type CoreDepartmentId =
  | 'emergency' | 'cardiology' | 'neurology' | 'radiology' | 'laboratory' | 'icu' | 'surgery' | 'ward'
  | 'pharmacy' | 'pediatrics' | 'obgyn' | 'internal-medicine' | 'ent' | 'dermatology' | 'oncology'
export type DepartmentId = CoreDepartmentId | (string & {})

export type PatientStatus = 'awaiting-triage' | 'waiting' | 'in-treatment' | 'observation' | 'admitted' | 'discharged'
export type Priority = 'routine' | 'urgent' | 'emergent'
export type ReferralStatus = 'pending' | 'accepted' | 'completed' | 'declined'
export type OrderStatus = 'ordered' | 'in-progress' | 'completed'
export type EsiLevel = 1 | 2 | 3 | 4 | 5
export type Permission = 'triage' | 'refer' | 'transfer' | 'results' | 'notes' | 'discharge' | 'manage' | 'cosign' | 'vitals' | 'administer' | 'dispense' | 'register' | 'theatre' | 'anaesthesia' | 'services' | 'billing' | 'beds' | 'prescribe'

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

export type Consciousness = 'Alert' | 'New confusion' | 'Voice' | 'Pain' | 'Unresponsive'

export type ObservationContext = 'Triage' | 'Ward round' | 'Bedside' | 'Clinic' | 'Recovery'
export const OBSERVATION_CONTEXTS: ObservationContext[] = ['Triage', 'Ward round', 'Bedside', 'Clinic', 'Recovery']

export interface ObservationSet extends Vitals {
  at: string
  by: string
  onOxygen: boolean
  consciousness: Consciousness
  /** Where the set was taken: at triage, on the ward round, at the bedside… */
  context?: ObservationContext
}

/** A daily ward-round progress note (SOAP). */
export interface RoundNote {
  id: string
  at: string
  by: string
  subjective: string
  examination: string
  assessment: string
  plan: string
  status: 'Improving' | 'Stable' | 'Deteriorating'
}

export interface Evaluation {
  id: string
  at: string
  by: string
  hpi: string
  history: { medical: string; medication: string; family: string; social: string }
  exam: Array<{ system: string; normal: boolean; findings: string }>
  differentials: Array<{ condition: string; icd10?: string; working: boolean }>
  plan: string
}

export interface DischargeSummary {
  at: string
  by: string
  diagnosis: string
  condition: 'Recovered' | 'Improved' | 'Stable' | 'Unchanged'
  course: string
  medicines: Array<{ name: string; decision: 'Continue' | 'Change' | 'Stop'; note: string }>
  newMedicines: string
  followUp: string
  followUpDate: string
  instructions: string
}

export interface TimelineEvent {
  id: string
  at: string
  type: 'arrival' | 'triage' | 'note' | 'referral' | 'order' | 'transfer' | 'discharge' | 'result'
  title: string
  detail: string
  author: string
  department: DepartmentId
  /** Links order and result events to their order so the thread can show live progress. */
  orderId?: string
}

/* ---------- Specialty charts ---------- */

interface ChartStamp { id: string; at: string; by: string }

export type Oedema = '0' | '+' | '++' | '+++'
export type SamPhase = 'Stabilisation' | 'Transition' | 'Rehabilitation'

/** Daily severe acute malnutrition (SAM) monitoring. */
export interface SamEntry extends ChartStamp {
  phase: SamPhase
  weightKg: number
  oedema: Oedema
  muacCm?: number
  temp?: number
  feed: 'F-75' | 'F-100' | 'RUTF' | 'Breastfeeding only'
  feedsTaken?: number
  feedsPlanned?: number
  appetite?: 'Pass' | 'Fail' | 'Not done'
  complications: string[]
  note?: string
}

/** One partograph observation in labour; any field may be left out at a given time. */
export interface LabourEntry extends ChartStamp {
  dilationCm?: number
  /** Fifths of the head palpable above the brim (5 → 0). */
  descentFifths?: number
  contractions?: number
  contractionSeconds?: number
  fhr?: number
  liquor?: 'I' | 'C' | 'M' | 'B' | 'A'
  moulding?: Oedema
  pulse?: number
  bpSys?: number
  bpDia?: number
  temp?: number
  oxytocinDrops?: number
  urine?: string
  note?: string
}

export interface AncVisit extends ChartStamp {
  gaWeeks: number
  weightKg?: number
  bpSys: number
  bpDia: number
  fundalCm?: number
  fhr?: number
  presentation?: string
  urineProtein?: '-' | 'Trace' | '+' | '++' | '+++'
  hb?: number
  note?: string
}

/** Postpartum / gynaecology bleeding and uterine monitoring. */
export interface PostpartumEntry extends ChartStamp {
  uterus: 'Well contracted' | 'Boggy'
  lochia: 'Light' | 'Moderate' | 'Heavy' | 'Clots'
  padsSoaked?: number
  bloodLossMl: number
  pulse?: number
  bpSys?: number
  bpDia?: number
  note?: string
}

export interface FluidEntry extends ChartStamp {
  direction: 'In' | 'Out'
  route: string
  ml: number
}

export interface GlucoseEntry extends ChartStamp {
  /** mg/dL. */
  mgdl: number
  timing: string
  insulinUnits?: number
}

export interface PatientCharts {
  sam?: SamEntry[]
  labour?: LabourEntry[]
  anc?: AncVisit[]
  postpartum?: PostpartumEntry[]
  fluids?: FluidEntry[]
  glucose?: GlucoseEntry[]
}
export type ChartKey = keyof PatientCharts
export type ChartEntry<K extends ChartKey> = NonNullable<PatientCharts[K]>[number]
export type ChartEntryInput<K extends ChartKey> = Omit<ChartEntry<K>, 'id' | 'at' | 'by'> & { at?: string }

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
  observations?: ObservationSet[]
  escalation?: { at: string; by: string; score: number }
  insurance?: string
  phone?: string
  weightKg?: number
  growth?: Array<{ at: string; ageYears: number; weightKg: number; heightCm: number; muacCm?: number; headCm?: number }>
  /** Time-series specialty charts (oldest first). */
  charts?: PatientCharts
  evaluations?: Evaluation[]
  /** Daily ward-round notes, newest first. */
  rounds?: RoundNote[]
  /** Department-specific assessments (obstetric, cardiac, audiometry…), newest first. */
  assessments?: Array<{ id: string; at: string; by: string; values: Record<string, string> }>
  discharge?: DischargeSummary
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
  /** Deactivated departments are hidden from new work but kept for history. */
  active?: boolean
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

export type OrderKind = 'Laboratory' | 'Imaging' | 'Medication' | 'Procedure' | 'Physiotherapy' | 'Nutrition' | 'Blood bank'

export interface ClinicalOrder {
  id: string
  patientId: string
  title: string
  kind: OrderKind
  /** Index into ORDER_STAGES[kind]; status is derived from it. */
  stage?: number
  specimen?: { id: string; type: string; collectedBy: string; collectedAt: string }
  /** Set when the test or study is performed by an outside provider. */
  externalProviderId?: string
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
  /** Lower-case generic key used for interaction and contraindication checks. */
  generic: string
  contraindications: string[]
  category: string
  dosageForm: string
  strength: string
  stock: number
  unit: string
  reorderLevel: number
  pricePerUnit: number
  route: string
  controlled?: boolean
  batch?: string
  expiry?: string
  supplier?: string
}

export interface StockMovement {
  id: string
  medicationId: string
  at: string
  by: string
  type: 'Received' | 'Dispensed' | 'Adjusted' | 'Written off'
  quantity: number
  note?: string
}

export type RxPriority = 'Routine' | 'Urgent' | 'STAT'
export type RxStatus = 'Pending' | 'Verified' | 'Dispensed' | 'Administered' | 'Cancelled'

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
  administrations?: Array<{ at: string; by: string }>
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
  payments?: Array<{ at: string; by: string; method: 'Cash' | 'Card' | 'Mobile money' | 'Bank transfer' | 'Insurer'; amount: number }>
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
  roleId?: RoleId
  suspended?: boolean
  /** Accounts start as requests and only work once an administrator approves them. */
  status?: 'Pending approval' | 'Active'
  /** Access granted by the administrator; falls back to the role's defaults. */
  permissions?: Permission[]
}

/* ---------- Administration ---------- */

export interface FacilitySettings {
  name: string
  type: 'Hospital' | 'Clinic' | 'Health centre'
  tagline: string
  city: string
  country: string
  phone: string
  email: string
  currency: 'ETB' | 'USD' | 'EUR' | 'GBP' | 'KES'
  /** Paths of modules switched off for this facility. */
  disabledModules: string[]
}

export interface InvestigationItem {
  id: string
  name: string
  kind: 'Laboratory' | 'Imaging'
  /** Available in this facility; otherwise it must be referred to an external provider. */
  inHouse: boolean
  price: number
  active: boolean
}

export interface ExternalProvider {
  id: string
  name: string
  services: Array<'Laboratory' | 'Imaging'>
  notes: string
  phone: string
  address: string
  active: boolean
}

/* ---------- Wards, beds, handover, pagers ---------- */

export type BedState = 'Available' | 'Reserved' | 'Blocked' | 'Cleaning' | 'Out of service'

export interface Ward {
  id: string
  name: string
  department: DepartmentId
  beds: number
}

export interface Bed {
  id: string
  wardId: string
  number: number
  state: BedState
  patientId?: string
}

export interface Handover {
  id: string
  patientId: string
  from: string
  to: string
  note: string
  at: string
  acknowledgedAt?: string
}

export interface Page {
  id: string
  from: string
  toStaffId: string
  message: string
  urgent: boolean
  at: string
  acknowledgedAt?: string
}

/* ---------- Theatres ---------- */

export interface TheatreCase {
  id: string
  patientId: string
  procedure: string
  surgeon: string
  room: string
  time: string
  /** 0 Scheduled, 1 Pre-op check, 2 In theatre, 3 Recovery, 4 Handed over */
  stage: number
  checklist: boolean[]
  anaesthesia?: {
    asa: 1 | 2 | 3 | 4 | 5
    technique: string
    airway: string
    by: string
    log: Array<{ at: string; hr: number; sbp: number; spo2: number; note: string }>
  }
}

/* ---------- Notes awaiting co-signature ---------- */

export interface CosignNote {
  id: string
  patientId: string
  author: string
  at: string
  text: string
  status: 'Pending review' | 'Co-signed'
  cosignedBy?: string
  evaluationId?: string
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
  wards: Ward[]
  beds: Bed[]
  handovers: Handover[]
  pages: Page[]
  theatreCases: TheatreCase[]
  cosignNotes: CosignNote[]
  settings: FacilitySettings
  investigations: InvestigationItem[]
  providers: ExternalProvider[]
  stockMovements: StockMovement[]
}
