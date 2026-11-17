export type PatientStatus = 'Inpatient' | 'Outpatient' | 'Emergency' | 'Discharged';
export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'reserved' | 'maintenance';
export type EsiLevel = 1 | 2 | 3 | 4 | 5; // 1: Resuscitation, 2: Emergent, 3: Urgent, 4: Less Urgent, 5: Non-Urgent

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
  | 'Maternity';

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
  | 'Intensive Care (ICU/CCU)';

export type TriageCarePathway = 'Outpatient' | 'Inpatient' | 'Emergency' | 'Fast-Track';

export type TriageStatus =
  | 'Not Triaged'
  | 'In Triage'
  | 'Triage Completed'
  | 'Sent to Doctor'
  | 'In Consultation'
  | 'Consultation Completed'
  | 'Admitted'
  | 'Discharged';

export interface VitalSigns {
  heartRate: number; // bpm
  bloodPressureSystolic: number; // mmHg
  bloodPressureDiastolic: number; // mmHg
  bloodPressure?: string; // e.g. "120/80"
  respiratoryRate: number; // bpm
  oxygenSaturation: number; // %
  temperature: number; // °C
  painScale?: number; // 0-10
  painLevel?: number; // alias for painScale
  weightKg?: number; // kg
  heightCm?: number; // cm
  recordedAt: string;
}

export interface VitalReading extends VitalSigns {
  id: string;
  notes?: string;
}

export interface FocusedHistory {
  briefHpi: string;
  redFlags: string[];
  allergies: string[];
  currentMedications: string[];
  relevantPastHistory: string[];
  pregnancyStatus?: 'Negative' | 'Positive' | 'Not Applicable' | 'Unknown';
}

export interface FocusedPhysicalExam {
  generalAppearance: 'Well / Stable' | 'Mild Distress' | 'Moderate Distress' | 'Severe Distress' | 'Unresponsive / Critical';
  systemFocusedFindings: string;
  redFlagFindings: string[];
}

export interface TriageRecord {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  patientMrn?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  arrivalTime: string;
  triageStartTime?: string;
  triageCompletedTime?: string;
  chiefComplaint: string;
  vitals: VitalSigns;
  focusedHistory: FocusedHistory;
  focusedExam: FocusedPhysicalExam;
  esiLevel: EsiLevel;
  acuityRationale: string[];
  carePathway: TriageCarePathway;
  targetDepartment: HospitalDepartment;
  assignedDoctorName?: string;
  triageNurseName: string;
  triageNurseId: string;
  triageNotesForDoctor: string;
  status: TriageStatus;
  waitingTimeMinutes: number;
  // Department-specific details
  pediatricWeightKg?: number;
  pediatricImmunizationsUpToDate?: boolean;
  obstetricGestationalWeeks?: number;
  obstetricFetalHeartRate?: number;
}

export interface ClinicalNote {
  id: string;
  author: string;
  authorRole: string;
  timestamp: string;
  subject?: string;
  note?: string;
  content?: string;
  type: 'Triage' | 'Progress' | 'Consultation' | 'Nursing' | 'Discharge';
}

export interface MedicationOrder {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  status: 'Active' | 'Completed' | 'Discontinued';
  prescribedBy: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number e.g. "MRN-89412"
  name?: string;
  firstName?: string;
  lastName?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    copay: number;
  };
  status: PatientStatus;
  department: HospitalDepartment | string;
  attendingPhysician?: string;
  attendingDoctor?: string;
  admissionDate?: string;
  dischargeDate?: string;
  bedId?: string;
  assignedBed?: string;
  roomNumber?: string;
  conditions?: string[];
  diagnoses: string[];
  allergies: string[];
  vitals: VitalSigns;
  vitalsHistory: VitalReading[];
  latestTriage?: TriageRecord;
  notes: ClinicalNote[];
  activeMedications: MedicationOrder[];
  medications?: string[];
}

export interface Bed {
  id: string;
  wardId: string;
  wardName: string;
  bedNumber: string;
  type: WardType;
  status: BedStatus;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  assignedNurse?: string;
  occupiedSince?: string;
  admittedDate?: string;
  features?: string[];
  oxygenEquipped: boolean;
  ventilatorEquipped: boolean;
}

export interface Ward {
  id: string;
  name: string;
  type: WardType;
  floor: string;
  totalBeds: number;
  nurseInCharge: string;
}

export interface FormularyItem {
  id: string;
  name: string;
  genericName: string;
  category: 'Antibiotic' | 'Analgesic' | 'Cardiovascular' | 'Antidiabetic' | 'Respiratory' | 'Sedative' | 'Emergency' | string;
  dosageForm: string;
  strength: string;
  stockLevel: number;
  stock?: number;
  unit: string;
  reorderLevel: number;
  pricePerUnit: number;
  route?: string;
  controlledSubstance?: boolean;
  contraindications: string[];
  manufacturer: string;
}

export interface PrescriptionItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number;
  route?: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  mrn?: string;
  doctorName?: string;
  prescribedBy?: string;
  department?: string;
  date: string;
  priority?: 'Routine' | 'STAT' | 'Urgent';
  status: 'Pending' | 'Dispensed' | 'Cancelled';
  items: PrescriptionItem[];
  diagnosis?: string;
  notes?: string;
}

export interface LabResultItem {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Critical' | 'critical' | 'abnormal';
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  mrn: string;
  doctorName?: string;
  orderedBy?: string;
  testName: string;
  category: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Radiology' | 'Cardiology' | 'Pathology' | string;
  department?: HospitalDepartment | string;
  orderDate: string;
  priority: 'Routine' | 'STAT' | 'Urgent';
  status: 'Sample Collected' | 'In Analysis' | 'Completed' | 'Pending Collection' | 'Ordered' | 'Collected' | 'Processing' | string;
  specimenType: string;
  results?: LabResultItem[];
  technicianName?: string;
  signedOffBy?: string;
  signedBy?: string;
  reportNotes?: string;
}

export type ImagingModality =
  | 'X-Ray'
  | 'CT Scan'
  | 'MRI'
  | 'Ultrasound'
  | 'Echocardiogram'
  | 'PET-CT';

export interface ImagingScanImage {
  id: string;
  title: string;
  url: string;
  modality: ImagingModality;
  timestamp: string;
  sliceInfo?: string;
  keyFindings?: string;
}

export interface ImagingOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn?: string;
  mrn: string;
  modality: ImagingModality;
  bodyPart: string;
  department?: HospitalDepartment | string;
  indication: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  urgency?: string;
  requestedBy: string;
  requestedByRole: string;
  requestedAt: string;
  status: 'Requested' | 'In Progress' | 'Completed' | 'Report Available' | string;
  reportText?: string;
  impression?: string;
  images?: ImagingScanImage[];
  scans?: ImagingScanImage[];
  technicianName?: string;
  completedAt?: string;
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
  | 'Admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  email: string;
  licenseNumber: string;
  avatarColor: string;
}

export type PhysicalExamSystem =
  | 'General'
  | 'CVS'
  | 'RS'
  | 'CNS'
  | 'GI'
  | 'MSK'
  | 'HEENT'
  | 'Skin';

export interface SystemExamFinding {
  system: PhysicalExamSystem;
  systemName: string;
  findings: string;
  isNormal: boolean;
}

export interface DifferentialDiagnosis {
  id: string;
  condition: string;
  icd10: string;
  likelihood: 'High' | 'Moderate' | 'Low';
  isWorkingDiagnosis: boolean;
  rationale?: string;
}

export interface PatientEncounter {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  physicianId: string;
  physicianName: string;
  physicianRole: UserRole | string;
  date: string;
  status: 'In Progress' | 'Finalized';
  // Read-only Triage Reference
  triageSummaryRef?: {
    esiLevel: EsiLevel;
    triageNurse: string;
    triageTime: string;
    chiefComplaint: string;
    initialVitals: VitalSigns;
    focusedHpi: string;
    redFlags: string[];
    nurseNotes: string;
  };
  // Detailed Evaluation
  chiefComplaint: string;
  hpi: string;
  pmh: string;
  medicationHistory: string;
  allergiesReview: string;
  familyHistory: string;
  socialHistory: string;
  vitals: VitalSigns;
  physicalExam: SystemExamFinding[];
  differentialDiagnoses: DifferentialDiagnosis[];
  investigationOrderIds: string[];
  imagingOrderIds: string[];
  prescriptionIds: string[];
  treatmentPlan: string;
  followUpPlan: string;
  disposition: 'Admit to Inpatient Ward' | 'Discharge Home with Meds' | 'Transfer to ICU' | 'Specialist Follow-up';
  referrals?: string;
}

export interface BillItem {
  id: string;
  description: string;
  cptCode?: string;
  category?: 'Consultation' | 'Room & Nursing' | 'Pharmacy' | 'Laboratory' | 'Radiology' | 'Procedure' | string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  mrn?: string;
  patientMrn?: string;
  date?: string;
  issuedDate?: string;
  dueDate: string;
  items: BillItem[];
  subtotal?: number;
  tax?: number;
  insuranceDiscount?: number;
  totalAmount: number;
  patientPayable?: number;
  insuranceCovered?: number;
  paidAmount?: number;
  insuranceProvider?: string;
  status: 'Paid' | 'Pending' | 'Claim Submitted' | 'Overdue';
  insuranceClaimId?: string;
  paymentMethod?: 'Insurance' | 'Credit Card' | 'Wire Transfer' | 'Cash';
  paidDate?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  mrn?: string;
  doctorId?: string;
  doctorName: string;
  department?: string;
  dateTime?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  type: 'In-Person' | 'Telehealth Virtual' | 'Telehealth';
  status: 'Scheduled' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  chiefReason?: string;
  reason?: string;
  roomNumber?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Physician' | 'Surgeon' | 'Nurse Practitioner' | 'Head Nurse' | 'Pharmacist' | 'Lab Specialist' | 'Anesthesiologist' | string;
  department: string;
  specialty?: string;
  shift: 'Morning (07:00 - 15:00)' | 'Evening (15:00 - 23:00)' | 'Night (23:00 - 07:00)' | string;
  onDuty: boolean;
  isOnDuty?: boolean;
  pager: string;
  pagerNumber?: string;
  email: string;
  phone: string;
  activeCases?: number;
  licenseNumber?: string;
}

export interface EmergencyBroadcast {
  id: string;
  codeType: 'Code Blue' | 'Code Red' | 'Code Trauma' | 'Code Pink' | 'Code Silver' | 'code_blue' | 'trauma_code' | 'code_stroke' | 'code_stemi' | 'code_red' | 'code_amber' | string;
  location: string;
  description: string;
  initiatedAt?: string;
  initiator?: string;
  active?: boolean;
  resolvedAt?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user?: string;
  userName?: string;
  role?: string;
  userRole?: string;
  category: 'Triage' | 'EHR' | 'Pharmacy' | 'Bed Tracking' | 'Emergency' | 'Laboratory' | 'Billing' | 'Security' | 'CLINICAL' | 'TRIAGE' | 'MEDICATION' | 'ADMISSION' | 'BILLING' | 'SECURITY' | 'AUTH' | string;
  action: string;
  details: string;
  patientMrn?: string;
  ipAddress?: string;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'emergency';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  timestamp: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}
