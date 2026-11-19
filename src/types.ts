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

export interface Vitals {
  hr: number
  rr: number
  spo2: number
  bpSys: number
  bpDia: number
  temp: number
  gcs: number
  pain: number
  // Aliases for VitalSigns compatibility
  heartRate?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  temperature?: number
  painLevel?: number
  painScale?: number
}

export interface VitalSigns {
  heartRate: number
  respiratoryRate: number
  oxygenSaturation: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  temperature: number
  gcs: number
  painLevel: number
  painScale: number
  // Optional extensions from second declaration
  bloodPressure?: string
  weightKg?: number
  heightCm?: number
  recordedAt?: string
  glasgowComaScale?: number
}

export interface VitalReading {
  recordedAt: string
  notes: string
  heartRate: number
  respiratoryRate: number
  oxygenSaturation: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  temperature: number
  gcs: number
  painLevel: number
  id: string
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
  firstName?: string
  lastName?: string
  age: number
  sex: 'Female' | 'Male' | 'Non-binary'
  gender?: 'Female' | 'Male' | 'Non-binary'
  pronouns: string
  complaint: string
  history: string
  allergies: string[]
  arrival: string
  esi: 1 | 2 | 3 | 4 | 5
  esiOverride?: string
  riskFactors: string[]
  resources: number
  vitals: Vitals
  department: DepartmentId
  location: string
  roomNumber?: string
  assignedBed?: string
  status: PatientStatus
  encounterType?: 'inpatient' | 'outpatient'
  assignedTo: string
  attendingPhysician?: string
  attendingDoctor?: string
  admissionDate?: string
  diagnoses?: string[]
  conditions?: string[]
  notes?: ClinicalNote[]
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

export interface HospitalState {
  patients: Patient[]
  departments: Department[]
  referrals: Referral[]
  orders: ClinicalOrder[]
  activities: Activity[]
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
  esi: 1 | 2 | 3 | 4 | 5
  overrideReason?: string
}

export type Permission = 'triage' | 'refer' | 'transfer' | 'results' | 'notes' | 'discharge' | 'manage'

// Extended types for current project features
export type WardType =
  | 'ICU'
  | 'CCU'
  | 'Med-Surg'
  | 'Pediatrics'
  | 'Gynecology & Obstetrics'
  | 'Surgery'
  | 'Oncology'
  | 'Internal Medicine'
  | 'Emergency'
  | 'Isolation'
  | 'Maternity'

export type HospitalDepartment =
  | 'Emergency Medicine'
  | 'Internal Medicine'
  | 'Family Medicine / General Practice'
  | 'Pediatrics & Neonatology'
  | 'Obstetrics & Gynecology (OB/GYN)'
  | 'General Surgery'
  | 'Orthopedic Surgery'
  | 'Neurology'
  | 'Neurosurgery'
  | 'Cardiology'
  | 'Cardiothoracic & Vascular Surgery'
  | 'Gastroenterology'
  | 'Hepatology'
  | 'Pulmonology (Respiratory Medicine)'
  | 'Nephrology'
  | 'Endocrinology & Diabetology'
  | 'Rheumatology & Clinical Immunology'
  | 'Infectious Diseases'
  | 'Hematology'
  | 'Medical Oncology'
  | 'Radiation Oncology'
  | 'Surgical Oncology'
  | 'Dermatology'
  | 'Psychiatry & Behavioral Health'
  | 'Child & Adolescent Psychiatry'
  | 'Anesthesiology'
  | 'Critical Care (ICU, CCU, NICU, PICU)'
  | 'Ophthalmology'
  | 'Otorhinolaryngology (ENT)'
  | 'Urology'
  | 'Plastic & Reconstructive Surgery'
  | 'Maxillofacial Surgery'
  | 'Physical Medicine & Rehabilitation (PM&R)'
  | 'Radiology & Imaging'
  | 'Pathology & Laboratory Medicine'
  | 'Nuclear Medicine'
  | 'Geriatrics'
  | 'Palliative Care'
  | 'Pain Medicine'
  | 'Sleep Medicine'
  | 'Allergy & Clinical Immunology'
  | 'Genetic Medicine'
  | 'Physiotherapy'
  | 'Occupational Therapy'
  | 'Nutrition & Dietetics'
  | 'Respiratory Therapy'
  | 'Speech & Language Therapy'
  | 'Clinical Psychology'
  | 'Social Work'
  | 'Prosthetics & Orthotics'
  | 'Pediatrics'
  | 'Gynecology & Obstetrics'
  | 'Obstetrics & Gynecology'
  | 'General & Trauma Surgery'
  | 'General Surgery & Trauma'
  | 'Emergency & Trauma'
  | 'Oncology'
  | 'Medical & Surgical Oncology'
  | 'Orthopedics'
  | 'Intensive Care Unit (ICU)'
  | 'Intensive Care (ICU/CCU)'

export type TriageCarePathway = 'Outpatient' | 'Inpatient' | 'Emergency' | 'Fast-Track'

export type TriageStatus =
  | 'Not Triaged'
  | 'In Triage'
  | 'Triage Completed'
  | 'Sent to Doctor'
  | 'In Consultation'
  | 'Consultation Completed'
  | 'Admitted'
  | 'Discharged'

export interface FocusedHistory {
  briefHpi: string
  redFlags: string[]
  allergies: string[]
  currentMedications: string[]
  relevantPastHistory: string[]
  pregnancyStatus?: 'Negative' | 'Positive' | 'Not Applicable' | 'Unknown'
}

export interface FocusedPhysicalExam {
  generalAppearance: 'Well / Stable' | 'Mild Distress' | 'Moderate Distress' | 'Severe Distress' | 'Unresponsive / Critical'
  systemFocusedFindings: string
  redFlagFindings: string[]
}

export interface TriageRecord {
  id: string
  patientId: string
  patientName: string
  mrn: string
  patientMrn?: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  arrivalTime: string
  triageStartTime?: string
  triageCompletedTime?: string
  chiefComplaint: string
  vitals: VitalSigns
  focusedHistory: FocusedHistory
  focusedExam: FocusedPhysicalExam
  esiLevel: 1 | 2 | 3 | 4 | 5
  acuityRationale: string[]
  carePathway: TriageCarePathway
  targetDepartment: HospitalDepartment
  assignedDoctorName?: string
  triageNurseName: string
  triageNurseId: string
  triageNotesForDoctor: string
  status: TriageStatus
  waitingTimeMinutes: number
  pediatricWeightKg?: number
  pediatricImmunizationsUpToDate?: boolean
  obstetricGestationalWeeks?: number
  obstetricFetalHeartRate?: number
}

export interface ClinicalNote {
  id: string
  author: string
  authorRole: string
  timestamp: string
  subject?: string
  note?: string
  content?: string
  type: 'Triage' | 'Progress' | 'Consultation' | 'Nursing' | 'Discharge'
}

export interface MedicationOrder {
  id: string
  name: string
  dosage: string
  frequency: string
  route: string
  startDate: string
  status: 'Active' | 'Completed' | 'Discontinued'
  prescribedBy: string
}

export interface ExtendedPatient {
  id: string
  mrn: string
  name?: string
  firstName?: string
  lastName?: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  dob: string
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  phone: string
  email: string
  address: string
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  insurance: {
    provider: string
    policyNumber: string
    groupNumber: string
    copay: number
  }
  status: PatientStatus
  department: HospitalDepartment | string
  attendingPhysician?: string
  attendingDoctor?: string
  admissionDate?: string
  dischargeDate?: string
  bedId?: string
  assignedBed?: string
  roomNumber?: string
  conditions?: string[]
  diagnoses: string[]
  allergies: string[]
  vitals: Vitals
  vitalsHistory: (Vitals & { id: string; recordedAt: string; notes: string })[]
  latestTriage?: TriageRecord
  notes: ClinicalNote[]
  activeMedications: MedicationOrder[]
  medications?: string[]
}

export interface Bed {
  id: string
  wardId: string
  wardName: string
  bedNumber: string
  type: WardType
  status: 'available' | 'occupied' | 'cleaning' | 'reserved' | 'maintenance'
  patientId?: string
  patientName?: string
  patientMrn?: string
  assignedNurse?: string
  occupiedSince?: string
  admittedDate?: string
  features?: string[]
  oxygenEquipped: boolean
  ventilatorEquipped: boolean
}

export interface Ward {
  id: string
  name: string
  type: WardType
  floor: string
  totalBeds: number
  nurseInCharge: string
}

export interface FormularyItem {
  id: string
  name: string
  genericName: string
  category: 'Antibiotic' | 'Analgesic' | 'Cardiovascular' | 'Antidiabetic' | 'Respiratory' | 'Sedative' | 'Emergency' | string
  dosageForm: string
  strength: string
  stockLevel: number
  stock?: number
  unit: string
  reorderLevel: number
  pricePerUnit: number
  route?: string
  controlledSubstance?: boolean
  contraindications: string[]
  manufacturer: string
}

export interface PrescriptionItem {
  medicationId: string
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  quantity?: number
  route?: string
  instructions?: string
}

export interface Prescription {
  id: string
  rxNumber: string
  patientId: string
  patientName: string
  patientMrn?: string
  mrn?: string
  doctorName?: string
  prescribedBy?: string
  department?: string
  date: string
  priority?: 'Routine' | 'STAT' | 'Urgent'
  status: 'Pending' | 'Dispensed' | 'Cancelled'
  items: PrescriptionItem[]
  diagnosis?: string
  notes?: string
}

export interface LabResultItem {
  parameter: string
  value: string
  unit: string
  referenceRange: string
  flag: 'Normal' | 'High' | 'Low' | 'Critical' | 'critical' | 'abnormal'
}

export interface LabOrder {
  id: string
  orderNumber: string
  patientId: string
  patientName: string
  patientMrn?: string
  mrn: string
  doctorName?: string
  orderedBy?: string
  testName: string
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Radiology' | 'Cardiology' | 'Pathology' | string
  department?: HospitalDepartment | string
  orderDate: string
  priority: 'Routine' | 'STAT' | 'Urgent'
  status: 'Sample Collected' | 'In Analysis' | 'Completed' | 'Pending Collection' | 'Ordered' | 'Collected' | 'Processing' | string
  specimenType: string
  results?: LabResultItem[]
  technicianName?: string
  signedOffBy?: string
  signedBy?: string
  reportNotes?: string
}

export type ImagingModality =
  | 'X-Ray'
  | 'CT Scan'
  | 'MRI'
  | 'Ultrasound'
  | 'Echocardiogram'
  | 'PET-CT'

export interface ImagingScanImage {
  id: string
  title: string
  url: string
  modality: ImagingModality
  timestamp: string
  sliceInfo?: string
  keyFindings?: string
}

export interface ImagingOrder {
  id: string
  orderNumber: string
  patientId: string
  patientName: string
  patientMrn?: string
  mrn: string
  modality: ImagingModality
  bodyPart: string
  department?: HospitalDepartment | string
  indication: string
  priority: 'Routine' | 'Urgent' | 'STAT'
  urgency?: string
  requestedBy: string
  requestedByRole: string
  requestedAt: string
  status: 'Requested' | 'In Progress' | 'Completed' | 'Report Available' | string
  reportText?: string
  impression?: string
  images?: ImagingScanImage[]
  scans?: ImagingScanImage[]
  technicianName?: string
  completedAt?: string
}

export type UserRole =
  | 'GP'
  | 'Resident'
  | 'Senior Specialist'
  | 'Sub-Specialist'
  | 'Triage Nurse'
  | 'Ward Nurse'
  | 'ICU Nurse'
  | 'OT Nurse'
  | 'Lab Technician'
  | 'Imaging Technician'
  | 'Radiologist'
  | 'Physiotherapist'
  | 'Occupational Therapist'
  | 'Nutritionist'
  | 'Respiratory Therapist'
  | 'Speech Pathologist'
  | 'Pharmacist'
  | 'Pharmacy Technician'
  | 'Receptionist'
  | 'Billing Officer'
  | 'Records Officer'
  | 'Admin'

export interface User {
  id: string
  name: string
  role: UserRole
  title: string
  department: string
  email: string
  licenseNumber: string
  avatarColor: string
}

export type PhysicalExamSystem =
  | 'General'
  | 'CVS'
  | 'RS'
  | 'CNS'
  | 'GI'
  | 'MSK'
  | 'HEENT'
  | 'Skin'

export interface SystemExamFinding {
  system: PhysicalExamSystem
  systemName: string
  findings: string
  isNormal: boolean
}

export interface DifferentialDiagnosis {
  id: string
  condition: string
  icd10: string
  likelihood: 'High' | 'Moderate' | 'Low'
  isWorkingDiagnosis: boolean
  rationale?: string
}

export interface PatientEncounter {
  id: string
  patientId: string
  patientName: string
  mrn: string
  physicianId: string
  physicianName: string
  physicianRole: UserRole | string
  date: string
  status: 'In Progress' | 'Finalized'
  triageSummaryRef?: {
    esiLevel: 1 | 2 | 3 | 4 | 5
    triageNurse: string
    triageTime: string
    chiefComplaint: string
    initialVitals: VitalSigns
    focusedHpi: string
    redFlags: string[]
    nurseNotes: string
  }
  chiefComplaint: string
  hpi: string
  pmh: string
  medicationHistory: string
  allergiesReview: string
  familyHistory: string
  socialHistory: string
  vitals: VitalSigns
  physicalExam: SystemExamFinding[]
  differentialDiagnoses: DifferentialDiagnosis[]
  investigationOrderIds: string[]
  imagingOrderIds: string[]
  prescriptionIds: string[]
  treatmentPlan: string
  followUpPlan: string
  disposition: 'Admit to Inpatient Ward' | 'Discharge Home with Meds' | 'Transfer to ICU' | 'Specialist Follow-up'
  referrals?: string
}

export interface BillItem {
  id: string
  description: string
  cptCode?: string
  category?: 'Consultation' | 'Room & Nursing' | 'Pharmacy' | 'Laboratory' | 'Radiology' | 'Procedure' | string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  patientId: string
  patientName: string
  mrn?: string
  patientMrn?: string
  date?: string
  issuedDate?: string
  dueDate: string
  items: BillItem[]
  subtotal?: number
  tax?: number
  insuranceDiscount?: number
  totalAmount: number
  patientPayable?: number
  insuranceCovered?: number
  paidAmount?: number
  insuranceProvider?: string
  status: 'Paid' | 'Pending' | 'Claim Submitted' | 'Overdue'
  insuranceClaimId?: string
  paymentMethod?: 'Insurance' | 'Credit Card' | 'Wire Transfer' | 'Cash'
  paidDate?: string
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  mrn?: string
  doctorId?: string
  doctorName: string
  department?: string
  dateTime?: string
  date?: string
  time?: string
  durationMinutes?: number
  type: 'In-Person' | 'Telehealth Virtual' | 'Telehealth'
  status: 'Scheduled' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled'
  chiefReason?: string
  reason?: string
  roomNumber?: string
}

export interface StaffMember {
  id: string
  name: string
  role: 'Physician' | 'Surgeon' | 'Nurse Practitioner' | 'Head Nurse' | 'Pharmacist' | 'Lab Specialist' | 'Anesthesiologist' | string
  department: string
  specialty?: string
  shift: 'Morning (07:00 - 15:00)' | 'Evening (15:00 - 23:00)' | 'Night (23:00 - 07:00)' | string
  onDuty: boolean
  isOnDuty?: boolean
  pager: string
  pagerNumber?: string
  email: string
  phone: string
  activeCases?: number
  licenseNumber?: string
}

export interface EmergencyBroadcast {
  id: string
  codeType: 'Code Blue' | 'Code Red' | 'Code Trauma' | 'Code Pink' | 'Code Silver' | 'code_blue' | 'trauma_code' | 'code_stroke' | 'code_stemi' | 'code_red' | 'code_amber' | string
  location: string
  description: string
  initiatedAt?: string
  initiator?: string
  active?: boolean
  resolvedAt?: string
}

export interface AuditEvent {
  id: string
  timestamp: string
  user?: string
  userName?: string
  role?: string
  userRole?: string
  category: 'Triage' | 'EHR' | 'Pharmacy' | 'Bed Tracking' | 'Emergency' | 'Laboratory' | 'Billing' | 'Security' | 'CLINICAL' | 'TRIAGE' | 'MEDICATION' | 'ADMISSION' | 'BILLING' | 'SECURITY' | 'AUTH' | string
  action: string
  details: string
  patientMrn?: string
  ipAddress?: string
}

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'emergency'

export interface ToastNotification {
  id: string
  title: string
  message: string
  type: ToastType
  timestamp: string
  duration?: number
  actionLabel?: string
  onAction?: () => void
}