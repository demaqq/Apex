import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Patient,
  Bed,
  Ward,
  TriageRecord,
  TriageStatus,
  TriageCarePathway,
  HospitalDepartment,
  FormularyItem,
  Prescription,
  PrescriptionItem,
  LabOrder,
  LabResultItem,
  ImagingOrder,
  ImagingScanImage,
  Invoice,
  BillItem,
  Appointment,
  StaffMember,
  AuditEvent,
  EmergencyBroadcast,
  User,
  UserRole,
  PatientEncounter,
  VitalSigns,
  VitalReading,
  ClinicalNote,
  EsiLevel,
  ToastNotification,
  ToastType,
} from '../types';
import {
  initialPatients,
  initialBeds,
  initialWards,
  initialTriageRecords,
  initialFormulary,
  initialPrescriptions,
  initialLabOrders,
  initialImagingOrders,
  initialInvoices,
  initialAppointments,
  initialStaff,
  initialAuditEvents,
  initialUsers,
  initialEncounters,
} from '../data/mockData';

interface HospitalContextType {
  // Authentication & RBAC User State
  currentUser: User;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  isPhysician: boolean;
  isTriageNurse: boolean;
  isPharmacist: boolean;
  isTechnician: boolean;
  isBillingOfficer: boolean;

  // Triage Module State (UNIVERSAL ENTRANCE: All patients start here)
  triageRecords: TriageRecord[];
  registerNewIntake: (data: Partial<TriageRecord>) => TriageRecord;
  startTriageSession: (triageId: string) => void;
  completeTriageAndSendToDoctor: (
    triageId: string,
    vitals: VitalSigns,
    focusedHistory: TriageRecord['focusedHistory'],
    focusedExam: TriageRecord['focusedExam'],
    esiLevel: EsiLevel,
    acuityRationale: string[],
    carePathway: TriageCarePathway,
    targetDepartment: HospitalDepartment,
    assignedDoctorName?: string,
    notesForDoctor?: string
  ) => void;

  // Doctor's Queue (Filtered: Only patients with Completed Triage)
  doctorQueue: TriageRecord[];
  startDoctorConsultation: (triageId: string) => void;

  // Longitudinal EHR Patients
  patients: Patient[];
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
  updatePatient: (patientId: string, updates: Partial<Patient>) => void;
  dischargePatient: (patientId: string, dischargeSummary: string) => void;
  addClinicalNote: (patientId: string, note: Omit<ClinicalNote, 'id' | 'timestamp'>) => void;
  recordPatientVitals: (patientId: string, vitals: VitalSigns, notes?: string) => void;

  // Physician Evaluation & Encounters (SOAP, Physical Exam, DDx)
  patientEncounters: PatientEncounter[];
  savePatientEncounter: (encounter: PatientEncounter) => void;

  // Ward & Bed Management
  beds: Bed[];
  wards: Ward[];
  updateBedStatus: (bedId: string, status: Bed['status']) => void;
  transferPatientBed: (patientId: string, currentBedId: string, newBedId: string, reason: string) => void;
  assignBedToPatient: (bedId: string, patient: Patient) => void;
  releaseBed: (bedId: string) => void;

  // Pharmacy & E-Prescriptions (CPOE)
  formulary: FormularyItem[];
  prescriptions: Prescription[];
  createPrescription: (data: Omit<Prescription, 'id' | 'rxNumber' | 'status' | 'date'>) => Prescription;
  dispensePrescription: (prescriptionId: string) => void;
  updateFormularyStock: (medicationId: string, delta: number) => void;

  // Diagnostic Laboratory (LIS)
  labOrders: LabOrder[];
  createLabOrder: (orderData: Omit<LabOrder, 'id' | 'orderNumber' | 'status' | 'orderDate'>) => LabOrder;
  recordLabResults: (orderId: string, results: LabResultItem[], reportNotes: string, signedBy: string) => void;

  // Radiology & Imaging (PACS/RIS)
  imagingOrders: ImagingOrder[];
  createImagingOrder: (data: Omit<ImagingOrder, 'id' | 'orderNumber' | 'status' | 'requestedAt'>) => ImagingOrder;
  uploadImagingResult: (orderId: string, reportText: string, impression: string, images?: ImagingScanImage[], technicianName?: string) => void;
  updateImagingStatus: (orderId: string, status: ImagingOrder['status']) => void;

  // Revenue Cycle & Invoices
  invoices: Invoice[];
  createInvoice: (patientId: string, items: BillItem[]) => Invoice;
  submitInsuranceClaim: (invoiceId: string) => void;
  recordInvoicePayment: (invoiceId: string, method: Invoice['paymentMethod']) => void;

  // Telehealth & Appointments
  appointments: Appointment[];
  scheduleAppointment: (data: Omit<Appointment, 'id' | 'status'>) => Appointment;
  updateAppointmentStatus: (appointmentId: string, status: Appointment['status']) => void;
  activeTelehealthCall: Appointment | null;
  setActiveTelehealthCall: (appointment: Appointment | null) => void;

  // Staff & Digital Pagers
  staff: StaffMember[];
  toggleStaffOnDuty: (staffId: string) => void;
  pageStaffMember: (staffId: string, message: string, priority: 'Normal' | 'Urgent' | 'STAT') => void;

  // Emergency Codes
  emergencyBroadcasts: EmergencyBroadcast[];
  activeBroadcast: EmergencyBroadcast | null;
  triggerEmergencyBroadcast: (codeType: EmergencyBroadcast['codeType'], location: string, description: string) => void;
  resolveEmergencyBroadcast: (broadcastId: string) => void;

  // HIPAA Audit Logging
  auditEvents: AuditEvent[];
  logAuditEvent: (category: AuditEvent['category'], action: string, details: string, patientMrn?: string) => void;

  // Audio Controls & Sound Synthesis
  audioAlertsEnabled: boolean;
  toggleAudioAlerts: () => void;
  playAlertSound: (type: 'beep' | 'code' | 'pager' | 'success') => void;

  // Centralized Toast Notifications
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;

  // Reset to Factory Demonstration Defaults
  resetToDefaults: () => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current Authenticated User & Roles
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('apex_user');
    return saved ? JSON.parse(saved) : initialUsers[0]; // Dr. Gregory House (Senior Specialist)
  });
  const [allUsers] = useState<User[]>(initialUsers);

  // Triage Records
  const [triageRecords, setTriageRecords] = useState<TriageRecord[]>(() => {
    const saved = localStorage.getItem('apex_triage');
    return saved ? JSON.parse(saved) : initialTriageRecords;
  });

  // Longitudinal Patients
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('apex_patients');
    return saved ? JSON.parse(saved) : initialPatients;
  });

  // Wards & Beds
  const [wards] = useState<Ward[]>(initialWards);
  const [beds, setBeds] = useState<Bed[]>(() => {
    const saved = localStorage.getItem('apex_beds');
    return saved ? JSON.parse(saved) : initialBeds;
  });

  // Clinical Encounters (SOAP, Physical Exam, DDx)
  const [patientEncounters, setPatientEncounters] = useState<PatientEncounter[]>(() => {
    const saved = localStorage.getItem('apex_encounters');
    return saved ? JSON.parse(saved) : initialEncounters;
  });

  // Pharmacy & Formulary
  const [formulary, setFormulary] = useState<FormularyItem[]>(() => {
    const saved = localStorage.getItem('apex_formulary');
    return saved ? JSON.parse(saved) : initialFormulary;
  });
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem('apex_prescriptions');
    return saved ? JSON.parse(saved) : initialPrescriptions;
  });

  // Diagnostics (LIS & PACS)
  const [labOrders, setLabOrders] = useState<LabOrder[]>(() => {
    const saved = localStorage.getItem('apex_labs');
    return saved ? JSON.parse(saved) : initialLabOrders;
  });
  const [imagingOrders, setImagingOrders] = useState<ImagingOrder[]>(() => {
    const saved = localStorage.getItem('apex_imaging');
    return saved ? JSON.parse(saved) : initialImagingOrders;
  });

  // Billing
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('apex_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  // Telehealth & Appointments
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('apex_appointments');
    return saved ? JSON.parse(saved) : initialAppointments;
  });
  const [activeTelehealthCall, setActiveTelehealthCall] = useState<Appointment | null>(null);

  // Staff & Audit
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const saved = localStorage.getItem('apex_staff');
    return saved ? JSON.parse(saved) : initialStaff;
  });
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    const saved = localStorage.getItem('apex_audit');
    return saved ? JSON.parse(saved) : initialAuditEvents;
  });

  // Emergency Broadcasts
  const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<EmergencyBroadcast[]>(() => {
    const saved = localStorage.getItem('apex_broadcasts');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(true);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('apex_user', JSON.stringify(currentUser));
  }, [currentUser]);
  useEffect(() => {
    localStorage.setItem('apex_triage', JSON.stringify(triageRecords));
  }, [triageRecords]);
  useEffect(() => {
    localStorage.setItem('apex_patients', JSON.stringify(patients));
  }, [patients]);
  useEffect(() => {
    localStorage.setItem('apex_beds', JSON.stringify(beds));
  }, [beds]);
  useEffect(() => {
    localStorage.setItem('apex_encounters', JSON.stringify(patientEncounters));
  }, [patientEncounters]);
  useEffect(() => {
    localStorage.setItem('apex_formulary', JSON.stringify(formulary));
  }, [formulary]);
  useEffect(() => {
    localStorage.setItem('apex_prescriptions', JSON.stringify(prescriptions));
  }, [prescriptions]);
  useEffect(() => {
    localStorage.setItem('apex_labs', JSON.stringify(labOrders));
  }, [labOrders]);
  useEffect(() => {
    localStorage.setItem('apex_imaging', JSON.stringify(imagingOrders));
  }, [imagingOrders]);
  useEffect(() => {
    localStorage.setItem('apex_invoices', JSON.stringify(invoices));
  }, [invoices]);
  useEffect(() => {
    localStorage.setItem('apex_appointments', JSON.stringify(appointments));
  }, [appointments]);
  useEffect(() => {
    localStorage.setItem('apex_staff', JSON.stringify(staff));
  }, [staff]);
  useEffect(() => {
    localStorage.setItem('apex_audit', JSON.stringify(auditEvents));
  }, [auditEvents]);
  useEffect(() => {
    localStorage.setItem('apex_broadcasts', JSON.stringify(emergencyBroadcasts));
  }, [emergencyBroadcasts]);

  // Derived RBAC Permissions
  const isPhysician =
    currentUser.role === 'GP' ||
    currentUser.role === 'Resident' ||
    currentUser.role === 'Senior Specialist' ||
    currentUser.role === 'Sub-Specialist';
  const isTriageNurse = currentUser.role === 'Triage Nurse';
  const isPharmacist = currentUser.role === 'Pharmacist';
  const isTechnician = currentUser.role === 'Lab Technician';
  const isBillingOfficer = currentUser.role === 'Billing Officer';

  // Active Broadcast
  const activeBroadcast = emergencyBroadcasts.find(b => b.active) || null;

  // Sound Synthesizer via Web Audio API
  const playAlertSound = (type: 'beep' | 'code' | 'pager' | 'success') => {
    if (!audioAlertsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'code') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'pager') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // browser audio policy ignore
    }
  };

  const toggleAudioAlerts = () => setAudioAlertsEnabled(prev => !prev);

  // HIPAA Audit Event Logger
  const logAuditEvent = (
    category: AuditEvent['category'],
    action: string,
    details: string,
    patientMrn?: string
  ) => {
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user: currentUser.name,
      role: `${currentUser.role} (${currentUser.title})`,
      category,
      action,
      details,
      patientMrn,
    };
    setAuditEvents(prev => [newEvent, ...prev]);
  };

  // -------------------------------------------------------------
  // CENTRALIZED TOAST NOTIFICATIONS SYSTEM
  // -------------------------------------------------------------
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const addToast = (
    toast: Omit<ToastNotification, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp =
      toast.timestamp ||
      new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const duration = toast.duration ?? (toast.type === 'emergency' ? 9000 : 4500);

    const newToast: ToastNotification = {
      id,
      title: toast.title,
      message: toast.message,
      type: toast.type,
      timestamp,
      duration,
      actionLabel: toast.actionLabel,
      onAction: toast.onAction,
    };

    setToasts(prev => [newToast, ...prev.slice(0, 5)]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  // -------------------------------------------------------------
  // UNIVERSAL TRIAGE CENTER WORKFLOWS
  // Rule: "No patient appears in the doctor's queue until triage is completed."
  // -------------------------------------------------------------

  const registerNewIntake = (data: Partial<TriageRecord>): TriageRecord => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const mrnNumber = Math.floor(89450 + Math.random() * 500);
    const newMrn = data.mrn || `MRN-${mrnNumber}`;
    const patientId = data.patientId || `p-${Date.now()}`;

    const defaultVitals: VitalSigns = data.vitals || {
      heartRate: 78,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      temperature: 37.0,
      painScale: 0,
      weightKg: data.pediatricWeightKg || 70,
      recordedAt: timestamp,
    };

    const newRecord: TriageRecord = {
      id: `trg-${Date.now()}`,
      patientId,
      patientName: data.patientName || 'Anonymous Intake',
      mrn: newMrn,
      age: data.age || 35,
      gender: data.gender || 'Other',
      arrivalTime: timestamp,
      chiefComplaint: data.chiefComplaint || 'Pending nurse triage evaluation',
      vitals: defaultVitals,
      focusedHistory: data.focusedHistory || {
        briefHpi: 'Awaiting triage intake nurse history documentation.',
        redFlags: [],
        allergies: ['NKDA'],
        currentMedications: [],
        relevantPastHistory: [],
        pregnancyStatus: 'Unknown',
      },
      focusedExam: data.focusedExam || {
        generalAppearance: 'Well / Stable',
        systemFocusedFindings: 'Pending focused examination by triage nurse.',
        redFlagFindings: [],
      },
      esiLevel: data.esiLevel || 3,
      acuityRationale: data.acuityRationale || ['Initial intake registration pending full assessment'],
      carePathway: data.carePathway || 'Outpatient',
      targetDepartment: data.targetDepartment || 'Internal Medicine',
      assignedDoctorName: data.assignedDoctorName,
      triageNurseName: currentUser.role === 'Triage Nurse' ? currentUser.name : 'Sister Sarah Jenkins, RN, CEN',
      triageNurseId: currentUser.id,
      triageNotesForDoctor: data.triageNotesForDoctor || 'Patient registered at triage desk.',
      status: 'Not Triaged',
      waitingTimeMinutes: 0,
      pediatricWeightKg: data.pediatricWeightKg,
      pediatricImmunizationsUpToDate: data.pediatricImmunizationsUpToDate,
      obstetricGestationalWeeks: data.obstetricGestationalWeeks,
      obstetricFetalHeartRate: data.obstetricFetalHeartRate,
    };

    setTriageRecords(prev => [newRecord, ...prev]);

    // Also register or sync in the longitudinal patient registry if not already present
    setPatients(prev => {
      const exists = prev.some(p => p.mrn === newMrn || p.id === patientId);
      if (exists) return prev;
      const newPatient: Patient = {
        id: patientId,
        mrn: newMrn,
        name: data.patientName || 'Anonymous Patient',
        firstName: (data.patientName || 'Anonymous').split(' ')[0],
        lastName: (data.patientName || 'Patient').split(' ').slice(1).join(' ') || 'Patient',
        age: data.age || 35,
        gender: data.gender || 'Other',
        dob: '1991-01-01',
        bloodGroup: 'O+',
        phone: '+1 (555) 000-0000',
        email: 'patient@apexhealth.org',
        address: 'Hospital District',
        emergencyContact: { name: 'Emergency Next of Kin', relationship: 'Relative', phone: '+1 (555) 000-0001' },
        insurance: { provider: 'Hospital Self-Pay / Direct Payer', policyNumber: 'APX-990', groupNumber: 'GRP-1', copay: 20 },
        status: data.carePathway === 'Inpatient' ? 'Inpatient' : data.carePathway === 'Emergency' ? 'Emergency' : 'Outpatient',
        department: data.targetDepartment || 'Internal Medicine',
        attendingPhysician: data.assignedDoctorName || 'Dr. Gregory House, MD',
        admissionDate: timestamp,
        diagnoses: [data.chiefComplaint || 'Under Clinical Triage Assessment'],
        allergies: ['NKDA'],
        vitals: defaultVitals,
        vitalsHistory: [{ ...defaultVitals, id: `vh-${Date.now()}` }],
        notes: [],
        activeMedications: [],
      };
      return [newPatient, ...prev];
    });

    logAuditEvent(
      'Triage',
      'Patient Check-In at Triage Desk',
      `Registered ${newRecord.patientName} (${newRecord.mrn}) for ${newRecord.carePathway} pathway. Status: Not Triaged.`,
      newRecord.mrn
    );

    addToast({
      type: 'info',
      title: 'Patient Intake Registered',
      message: `${newRecord.patientName} (${newRecord.mrn}) queued for nurse triage (${newRecord.carePathway}).`,
    });

    playAlertSound('beep');
    return newRecord;
  };

  const startTriageSession = (triageId: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setTriageRecords(prev =>
      prev.map(tr =>
        tr.id === triageId
          ? {
              ...tr,
              status: 'In Triage',
              triageStartTime: timestamp,
              triageNurseName: currentUser.name,
              triageNurseId: currentUser.id,
            }
          : tr
      )
    );
    logAuditEvent('Triage', 'Nurse Commenced Triage Session', `Triage assessment session opened for ID ${triageId}`);
  };

  const completeTriageAndSendToDoctor = (
    triageId: string,
    vitals: VitalSigns,
    focusedHistory: TriageRecord['focusedHistory'],
    focusedExam: TriageRecord['focusedExam'],
    esiLevel: EsiLevel,
    acuityRationale: string[],
    carePathway: TriageCarePathway,
    targetDepartment: HospitalDepartment,
    assignedDoctorName?: string,
    notesForDoctor?: string
  ) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const target = triageRecords.find(t => t.id === triageId);
    if (!target) return;

    const completedRecord: TriageRecord = {
      ...target,
      vitals,
      focusedHistory,
      focusedExam,
      esiLevel,
      acuityRationale,
      carePathway,
      targetDepartment,
      assignedDoctorName: assignedDoctorName || target.assignedDoctorName || 'Dr. Gregory House, MD',
      triageNotesForDoctor: notesForDoctor || target.triageNotesForDoctor,
      status: 'Sent to Doctor', // Enforces availability in Doctor's Queue!
      triageCompletedTime: timestamp,
    };

    setTriageRecords(prev => prev.map(t => (t.id === triageId ? completedRecord : t)));

    // Update patient EHR chart with latest vitals and triage history
    setPatients(prev =>
      prev.map(p => {
        if (p.id === target.patientId || p.mrn === target.mrn) {
          const triageNote: ClinicalNote = {
            id: `cn-${Date.now()}`,
            author: currentUser.name,
            authorRole: 'Triage Nurse Specialist',
            timestamp,
            subject: `Triage Assessment (ESI ${esiLevel} - ${targetDepartment})`,
            note: `Vitals: HR ${vitals.heartRate} bpm, BP ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}, SpO2 ${vitals.oxygenSaturation}%, Temp ${vitals.temperature}°C. Focused HPI: ${focusedHistory.briefHpi}. Findings: ${focusedExam.systemFocusedFindings}. Red flags: ${focusedExam.redFlagFindings.join(', ') || 'None'}. Disposition: Sent to ${assignedDoctorName || 'attending physician'}.`,
            type: 'Triage',
          };

          return {
            ...p,
            vitals,
            allergies: focusedHistory.allergies.length > 0 ? focusedHistory.allergies : p.allergies,
            department: targetDepartment,
            attendingPhysician: assignedDoctorName || p.attendingPhysician,
            latestTriage: completedRecord,
            notes: [triageNote, ...p.notes],
            vitalsHistory: [{ ...vitals, id: `vh-${Date.now()}`, notes: `Mandatory Triage Vitals (ESI ${esiLevel})` }, ...p.vitalsHistory],
          };
        }
        return p;
      })
    );

    logAuditEvent(
      'Triage',
      'Completed Triage & Routed to Doctor',
      `Patient ${target.patientName} (${target.mrn}) triaged as ESI ${esiLevel}. Routed to ${targetDepartment} -> Doctor ${assignedDoctorName || 'Queue'}.`,
      target.mrn
    );

    addToast({
      type: esiLevel <= 2 ? 'emergency' : 'success',
      title: 'Triage Record Saved',
      message: `${target.patientName} (${target.mrn}) assigned ESI Level ${esiLevel} and forwarded to ${targetDepartment}.`,
      duration: esiLevel <= 2 ? 8000 : 5000,
    });

    if (esiLevel <= 2) {
      playAlertSound('code');
    } else {
      playAlertSound('success');
    }
  };

  // DOCTOR'S QUEUE: Strictly patients whose triage is Completed or In Consultation!
  const doctorQueue = triageRecords.filter(
    r => r.status === 'Sent to Doctor' || r.status === 'In Consultation' || r.status === 'Triage Completed'
  );

  const startDoctorConsultation = (triageId: string) => {
    setTriageRecords(prev =>
      prev.map(tr => (tr.id === triageId ? { ...tr, status: 'In Consultation' } : tr))
    );
    logAuditEvent('EHR', 'Doctor Opened Consultation', `Physician ${currentUser.name} opened patient chart from triage queue (Triage ID: ${triageId})`);
  };

  // -------------------------------------------------------------
  // PHYSICIAN CLINICAL EVALUATION & SOAP ENCOUNTERS
  // -------------------------------------------------------------

  const savePatientEncounter = (encounter: PatientEncounter) => {
    setPatientEncounters(prev => {
      const idx = prev.findIndex(e => e.id === encounter.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = encounter;
        return copy;
      }
      return [encounter, ...prev];
    });

    // Update the patient record
    setPatients(prev =>
      prev.map(p => {
        if (p.id === encounter.patientId || p.mrn === encounter.mrn) {
          const workingDdx = encounter.differentialDiagnoses.find(d => d.isWorkingDiagnosis);
          const consultNote: ClinicalNote = {
            id: `cn-${Date.now()}`,
            author: encounter.physicianName,
            authorRole: encounter.physicianRole,
            timestamp: encounter.date,
            subject: `Physician SOAP Encounter (${encounter.status})`,
            note: `Assessment: ${workingDdx?.condition || encounter.chiefComplaint} (ICD-10: ${workingDdx?.icd10 || 'R69'}). Plan: ${encounter.treatmentPlan}. Disposition: ${encounter.disposition}.`,
            type: 'Consultation',
          };

          return {
            ...p,
            diagnoses: workingDdx
              ? [workingDdx.condition, ...p.diagnoses.filter(d => d !== workingDdx.condition)]
              : p.diagnoses,
            vitals: encounter.vitals,
            status: encounter.disposition === 'Admit to Inpatient Ward' || encounter.disposition === 'Transfer to ICU' ? 'Inpatient' : p.status,
            notes: [consultNote, ...p.notes],
            vitalsHistory: [{ ...encounter.vitals, id: `vh-${Date.now()}`, notes: `Documented by ${encounter.physicianName}` }, ...p.vitalsHistory],
          };
        }
        return p;
      })
    );

    // Update corresponding triage record to consultation completed
    setTriageRecords(prev =>
      prev.map(tr =>
        tr.patientId === encounter.patientId || tr.mrn === encounter.mrn
          ? { ...tr, status: 'Consultation Completed' }
          : tr
      )
    );

    logAuditEvent(
      'EHR',
      'Clinical SOAP Encounter Finalized',
      `Physician ${encounter.physicianName} finalized evaluation for ${encounter.patientName} (${encounter.mrn}). Plan: ${encounter.disposition}.`,
      encounter.mrn
    );

    addToast({
      type: 'success',
      title: 'Clinical Evaluation Finalized',
      message: `Physician SOAP encounter documented for ${encounter.patientName} (${encounter.mrn}). Plan: ${encounter.disposition}.`,
    });

    playAlertSound('success');
  };

  // -------------------------------------------------------------
  // PATIENT EHR & DIRECTORY OPERATIONS
  // -------------------------------------------------------------

  const updatePatient = (patientId: string, updates: Partial<Patient>) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.id === patientId) {
          const updated = { ...p, ...updates };
          if (selectedPatient?.id === patientId) {
            setSelectedPatient(updated);
          }
          return updated;
        }
        return p;
      })
    );
    logAuditEvent('EHR', 'Patient Profile Updated', `Patient record updated for ID: ${patientId}`);
  };

  const dischargePatient = (patientId: string, dischargeSummary: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const targetPatient = patients.find(p => p.id === patientId);
    if (!targetPatient) return;

    if (targetPatient.bedId) {
      setBeds(prev =>
        prev.map(b =>
          b.id === targetPatient.bedId
            ? {
                ...b,
                status: 'cleaning',
                patientId: undefined,
                patientName: undefined,
                patientMrn: undefined,
                occupiedSince: undefined,
              }
            : b
        )
      );
    }

    const dischargeNote: ClinicalNote = {
      id: `cn-${Date.now()}`,
      author: currentUser.name,
      authorRole: `${currentUser.role} (${currentUser.title})`,
      timestamp,
      subject: 'Formal Discharge Summary & Clearance',
      note: dischargeSummary || 'Patient medically cleared and discharged in stable condition. Discharge medications and follow-up plan confirmed.',
      type: 'Discharge',
    };

    setPatients(prev =>
      prev.map(p =>
        p.id === patientId
          ? {
              ...p,
              status: 'Discharged',
              dischargeDate: timestamp,
              bedId: undefined,
              roomNumber: undefined,
              notes: [dischargeNote, ...p.notes],
            }
          : p
      )
    );

    logAuditEvent(
      'Bed Tracking',
      'Patient Formally Discharged',
      `${targetPatient.firstName} ${targetPatient.lastName} (${targetPatient.mrn}) discharged. Bed released to housekeeping.`,
      targetPatient.mrn
    );

    addToast({
      type: 'warning',
      title: 'Patient Discharged',
      message: `${targetPatient.firstName} ${targetPatient.lastName} (${targetPatient.mrn}) discharged from hospital care.`,
    });
  };

  const addClinicalNote = (patientId: string, note: Omit<ClinicalNote, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newNote: ClinicalNote = { ...note, id: `cn-${Date.now()}`, timestamp };

    setPatients(prev =>
      prev.map(p => (p.id === patientId ? { ...p, notes: [newNote, ...p.notes] } : p))
    );
    logAuditEvent('EHR', 'Clinical Note Added', `${note.type} note by ${note.author} (${note.subject})`);
  };

  const recordPatientVitals = (patientId: string, vitals: VitalSigns, notes?: string) => {
    const newReading: VitalReading = { ...vitals, id: `vh-${Date.now()}`, notes };

    setPatients(prev =>
      prev.map(p => {
        if (p.id === patientId) {
          const updated = {
            ...p,
            vitals,
            vitalsHistory: [newReading, ...p.vitalsHistory],
          };
          if (selectedPatient?.id === patientId) {
            setSelectedPatient(updated);
          }
          return updated;
        }
        return p;
      })
    );
    logAuditEvent('EHR', 'Telemetry Vitals Logged', `HR: ${vitals.heartRate} bpm, BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}, SpO2: ${vitals.oxygenSaturation}%`);
  };

  // -------------------------------------------------------------
  // WARD & BED MANAGEMENT
  // -------------------------------------------------------------

  const updateBedStatus = (bedId: string, status: Bed['status']) => {
    setBeds(prev => prev.map(b => (b.id === bedId ? { ...b, status } : b)));
    logAuditEvent('Bed Tracking', 'Bed Status Updated', `Bed ${bedId} shifted to ${status}`);
  };

  const transferPatientBed = (
    patientId: string,
    currentBedId: string,
    newBedId: string,
    reason: string
  ) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const patient = patients.find(p => p.id === patientId);
    const newBed = beds.find(b => b.id === newBedId);
    if (!patient || !newBed) return;

    setBeds(prev =>
      prev.map(b => {
        if (b.id === currentBedId) {
          return {
            ...b,
            status: 'cleaning',
            patientId: undefined,
            patientName: undefined,
            patientMrn: undefined,
            occupiedSince: undefined,
          };
        }
        if (b.id === newBedId) {
          return {
            ...b,
            status: 'occupied',
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            patientMrn: patient.mrn,
            occupiedSince: timestamp,
          };
        }
        return b;
      })
    );

    setPatients(prev =>
      prev.map(p =>
        p.id === patientId
          ? {
              ...p,
              bedId: newBed.id,
              roomNumber: newBed.bedNumber,
              department: newBed.wardName,
            }
          : p
      )
    );

    logAuditEvent(
      'Bed Tracking',
      'Patient Transferred Between Beds',
      `Transferred ${patient.firstName} ${patient.lastName} to ${newBed.bedNumber} (${newBed.wardName}). Rationale: ${reason}`,
      patient.mrn
    );

    addToast({
      type: 'info',
      title: 'Bed Transfer Completed',
      message: `Transferred ${patient.firstName} ${patient.lastName} to ${newBed.bedNumber} (${newBed.wardName}).`,
    });
  };

  const assignBedToPatient = (bedId: string, patient: Patient) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;

    setBeds(prev =>
      prev.map(b =>
        b.id === bedId
          ? {
              ...b,
              status: 'occupied',
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              patientMrn: patient.mrn,
              occupiedSince: timestamp,
            }
          : b
      )
    );

    setPatients(prev =>
      prev.map(p =>
        p.id === patient.id
          ? {
              ...p,
              bedId: bed.id,
              roomNumber: bed.bedNumber,
              status: 'Inpatient',
              department: bed.wardName,
            }
          : p
      )
    );

    logAuditEvent('Bed Tracking', 'Bed Allocated to Inpatient', `Bed ${bed.bedNumber} allocated to ${patient.firstName} ${patient.lastName}`, patient.mrn);

    addToast({
      type: 'info',
      title: 'Bed Allocated',
      message: `Bed ${bed.bedNumber} (${bed.wardName}) allocated to ${patient.firstName} ${patient.lastName}.`,
    });
  };

  const releaseBed = (bedId: string) => {
    setBeds(prev =>
      prev.map(b =>
        b.id === bedId
          ? {
              ...b,
              status: 'cleaning',
              patientId: undefined,
              patientName: undefined,
              patientMrn: undefined,
              occupiedSince: undefined,
            }
          : b
      )
    );
    logAuditEvent('Bed Tracking', 'Bed Marked for Cleaning', `Bed ${bedId} queued for terminal disinfection.`);

    addToast({
      type: 'info',
      title: 'Bed Released',
      message: `Bed marked for housekeeping terminal disinfection.`,
    });
  };

  // -------------------------------------------------------------
  // PHARMACY & E-PRESCRIPTIONS (CPOE)
  // -------------------------------------------------------------

  const createPrescription = (
    data: Omit<Prescription, 'id' | 'rxNumber' | 'status' | 'date'>
  ): Prescription => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newRx: Prescription = {
      ...data,
      id: `rx-${Date.now()}`,
      rxNumber: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: timestamp,
      status: 'Pending',
    };

    setPrescriptions(prev => [newRx, ...prev]);

    // Append to active medications in patient EHR
    setPatients(prev =>
      prev.map(p => {
        if (p.id === data.patientId || p.mrn === data.mrn) {
          const newMedOrders = data.items.map(item => ({
            id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            route: 'Prescribed',
            startDate: timestamp.split(' ')[0],
            status: 'Active' as const,
            prescribedBy: data.doctorName || 'Attending Physician',
          }));
          return { ...p, activeMedications: [...newMedOrders, ...p.activeMedications] };
        }
        return p;
      })
    );

    logAuditEvent('Pharmacy', 'CPOE Prescription Transmitted', `Prescription ${newRx.rxNumber} created for ${newRx.patientName}`, newRx.mrn);

    addToast({
      type: 'success',
      title: 'Pharmacy Order Submitted',
      message: `CPOE Prescription ${newRx.rxNumber} submitted with ${newRx.items.length} item(s) for ${newRx.patientName}.`,
    });

    return newRx;
  };

  const dispensePrescription = (prescriptionId: string) => {
    const targetRx = prescriptions.find(p => p.id === prescriptionId);
    if (!targetRx) return;

    setPrescriptions(prev =>
      prev.map(p => (p.id === prescriptionId ? { ...p, status: 'Dispensed' } : p))
    );

    // Decrement stock in formulary
    targetRx.items.forEach(item => {
      setFormulary(prev =>
        prev.map(f =>
          f.id === item.medicationId
            ? { ...f, stockLevel: Math.max(0, f.stockLevel - (item.quantity || 1)) }
            : f
        )
      );
    });

    logAuditEvent(
      'Pharmacy',
      'Prescription Dispensed by Pharmacist',
      `Dispensed ${targetRx.rxNumber} for ${targetRx.patientName} (${targetRx.items.length} items)`,
      targetRx.mrn
    );

    addToast({
      type: 'success',
      title: 'Prescription Dispensed',
      message: `Order ${targetRx.rxNumber} for ${targetRx.patientName} dispensed. Stock updated.`,
    });
  };

  const updateFormularyStock = (medicationId: string, delta: number) => {
    setFormulary(prev =>
      prev.map(f => (f.id === medicationId ? { ...f, stockLevel: Math.max(0, f.stockLevel + delta) } : f))
    );
    logAuditEvent('Pharmacy', 'Formulary Stock Adjusted', `Adjusted stock for ${medicationId} by ${delta}`);
  };

  // -------------------------------------------------------------
  // DIAGNOSTIC LABORATORY (LIS)
  // -------------------------------------------------------------

  const createLabOrder = (
    orderData: Omit<LabOrder, 'id' | 'orderNumber' | 'status' | 'orderDate'>
  ): LabOrder => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newOrder: LabOrder = {
      ...orderData,
      id: `lab-${Date.now()}`,
      orderNumber: `LAB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      orderDate: timestamp,
      status: 'Sample Collected',
    };

    setLabOrders(prev => [newOrder, ...prev]);
    logAuditEvent('Laboratory', 'Diagnostic Lab Requisition Created', `Ordered ${newOrder.testName} for ${newOrder.patientName}`, newOrder.mrn);

    addToast({
      type: 'info',
      title: 'Lab Order Submitted',
      message: `${newOrder.testName} (${newOrder.orderNumber}) requisition placed for ${newOrder.patientName}.`,
    });

    return newOrder;
  };

  const recordLabResults = (
    orderId: string,
    results: LabResultItem[],
    reportNotes: string,
    signedBy: string
  ) => {
    setLabOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'Completed',
              results,
              reportNotes,
              signedOffBy: signedBy,
            }
          : o
      )
    );

    const hasCritical = results.some(r => r.flag === 'Critical');
    if (hasCritical) {
      playAlertSound('pager');
    }

    logAuditEvent(
      'Laboratory',
      'Laboratory Results Uploaded & Signed',
      `LIS report finalized for Order ${orderId}. Critical panic alerts: ${hasCritical ? 'YES' : 'No'}`
    );

    addToast({
      type: hasCritical ? 'warning' : 'success',
      title: hasCritical ? 'Critical Lab Value Alert' : 'Lab Results Finalized',
      message: `LIS report signed by ${signedBy}. ${hasCritical ? 'PANIC VALUE detected!' : 'All parameters verified.'}`,
    });
  };

  // -------------------------------------------------------------
  // RADIOLOGY & IMAGING (PACS/RIS)
  // -------------------------------------------------------------

  const createImagingOrder = (
    data: Omit<ImagingOrder, 'id' | 'orderNumber' | 'status' | 'requestedAt'>
  ): ImagingOrder => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newOrder: ImagingOrder = {
      ...data,
      id: `img-${Date.now()}`,
      orderNumber: `RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requestedAt: timestamp,
      status: 'Requested',
    };

    setImagingOrders(prev => [newOrder, ...prev]);
    logAuditEvent(
      'Laboratory',
      'Diagnostic Imaging Scan Requested',
      `Requested ${newOrder.modality} of ${newOrder.bodyPart} for ${newOrder.patientName} (${newOrder.priority})`,
      newOrder.mrn
    );

    addToast({
      type: 'info',
      title: 'Radiology Scan Requested',
      message: `${newOrder.modality} (${newOrder.orderNumber}) order transmitted for ${newOrder.patientName}.`,
    });

    return newOrder;
  };

  const uploadImagingResult = (
    orderId: string,
    reportText: string,
    impression: string,
    images?: ImagingScanImage[],
    technicianName?: string
  ) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setImagingOrders(prev =>
      prev.map(img =>
        img.id === orderId
          ? {
              ...img,
              status: 'Report Available',
              reportText,
              impression,
              images: images || img.images,
              technicianName: technicianName || currentUser.name,
              completedAt: timestamp,
            }
          : img
      )
    );

    logAuditEvent(
      'Laboratory',
      'Technician Uploaded Radiology Report & PACS Images',
      `Imaging findings & impression finalized for Order ID ${orderId}`
    );

    addToast({
      type: 'success',
      title: 'Radiology Report Finalized',
      message: `PACS findings and impression signed off for Order ID ${orderId}.`,
    });
  };

  const updateImagingStatus = (orderId: string, status: ImagingOrder['status']) => {
    setImagingOrders(prev => prev.map(img => (img.id === orderId ? { ...img, status } : img)));
    logAuditEvent('Laboratory', 'Radiology Order Status Shift', `Imaging order ${orderId} updated to ${status}`);
  };

  // -------------------------------------------------------------
  // BILLING, CLAIMS & PAYMENTS
  // -------------------------------------------------------------

  const createInvoice = (patientId: string, items: BillItem[]): Invoice => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 10);
    const targetPatient = patients.find(p => p.id === patientId);
    if (!targetPatient) throw new Error('Patient not found');

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const insuranceDiscount = Math.round(subtotal * 0.45);
    const totalAmount = subtotal - insuranceDiscount;
    const insuranceCovered = Math.round(totalAmount * 0.85);
    const patientPayable = totalAmount - insuranceCovered;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: targetPatient.id,
      patientName: `${targetPatient.firstName} ${targetPatient.lastName}`,
      mrn: targetPatient.mrn,
      date: timestamp,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      subtotal,
      tax: 0,
      insuranceDiscount,
      totalAmount,
      insuranceCovered,
      patientPayable,
      status: 'Pending',
    };

    setInvoices(prev => [newInvoice, ...prev]);
    logAuditEvent('Billing', 'Clinical Bill Generated', `Invoice ${newInvoice.invoiceNumber} for ${newInvoice.patientName} ($${newInvoice.totalAmount})`, newInvoice.mrn);
    return newInvoice;
  };

  const submitInsuranceClaim = (invoiceId: string) => {
    const claimId = `CLM-EDI-${Math.floor(100000 + Math.random() * 900000)}`;
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'Claim Submitted',
              insuranceClaimId: claimId,
            }
          : inv
      )
    );
    logAuditEvent('Billing', 'ANSI 837 EDI Insurance Claim Transmitted', `Claim ${claimId} submitted for invoice ${invoiceId}`);

    addToast({
      type: 'success',
      title: 'Insurance Claim Transmitted',
      message: `ANSI 837 EDI claim ${claimId} successfully submitted.`,
    });
  };

  const recordInvoicePayment = (invoiceId: string, method: Invoice['paymentMethod']) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'Paid',
              paymentMethod: method || 'Credit Card',
              paidDate: timestamp,
            }
          : inv
      )
    );
    logAuditEvent('Billing', 'Patient Co-Pay Settled', `Invoice ${invoiceId} marked Paid via ${method}`);

    addToast({
      type: 'success',
      title: 'Co-Pay Settled',
      message: `Invoice ${invoiceId} marked Paid via ${method}.`,
    });
  };

  // -------------------------------------------------------------
  // TELEHEALTH & APPOINTMENTS
  // -------------------------------------------------------------

  const scheduleAppointment = (data: Omit<Appointment, 'id' | 'status'>): Appointment => {
    const newApt: Appointment = {
      ...data,
      id: `apt-${Date.now()}`,
      status: 'Scheduled',
    };

    setAppointments(prev => [newApt, ...prev]);
    logAuditEvent('EHR', 'Outpatient Appointment Booked', `${data.type} with ${data.doctorName} for ${data.patientName} on ${data.dateTime}`, data.mrn);

    addToast({
      type: 'success',
      title: 'Appointment Booked',
      message: `${data.type} appointment with ${data.doctorName} confirmed for ${data.patientName}.`,
    });

    return newApt;
  };

  const updateAppointmentStatus = (appointmentId: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => (a.id === appointmentId ? { ...a, status } : a)));
    logAuditEvent('EHR', 'Appointment Status Change', `Appointment ${appointmentId} updated to ${status}`);
  };

  // -------------------------------------------------------------
  // STAFF, PAGERS & CODES
  // -------------------------------------------------------------

  const toggleStaffOnDuty = (staffId: string) => {
    setStaff(prev =>
      prev.map(s => {
        if (s.id === staffId) {
          const nextDuty = !s.onDuty;
          logAuditEvent('Security', 'Staff Shift Duty Toggled', `${s.name} marked ${nextDuty ? 'ON DUTY' : 'OFF DUTY'}`);
          return { ...s, onDuty: nextDuty };
        }
        return s;
      })
    );
  };

  const pageStaffMember = (staffId: string, message: string, priority: 'Normal' | 'Urgent' | 'STAT') => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    playAlertSound('pager');
    logAuditEvent('Security', `Sent ${priority} Clinician Page`, `Paged ${member.name} (${member.pager}): "${message}"`);

    addToast({
      type: priority === 'STAT' ? 'warning' : 'info',
      title: `Clinician Paged (${priority})`,
      message: `Dispatched to ${member.name} (${member.pager}): "${message}"`,
    });
  };

  const triggerEmergencyBroadcast = (
    codeType: EmergencyBroadcast['codeType'],
    location: string,
    description: string
  ) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newBroadcast: EmergencyBroadcast = {
      id: `bc-${Date.now()}`,
      codeType,
      location,
      description,
      initiatedAt: timestamp,
      initiator: currentUser.name,
      active: true,
    };

    setEmergencyBroadcasts(prev => [newBroadcast, ...prev]);
    playAlertSound('code');
    logAuditEvent('Emergency', `HOSPITAL-WIDE ${codeType.toUpperCase()} INITIATED`, `Location: ${location}. Details: ${description}`);

    addToast({
      type: 'emergency',
      title: `EMERGENCY CODE TRIGGERED: ${codeType.toUpperCase()}`,
      message: `Location: ${location}. ${description}`,
      duration: 12000,
    });
  };

  const resolveEmergencyBroadcast = (broadcastId: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setEmergencyBroadcasts(prev =>
      prev.map(b => (b.id === broadcastId ? { ...b, active: false, resolvedAt: timestamp } : b))
    );
    logAuditEvent('Emergency', 'Hospital Emergency Code Cleared', `Code ${broadcastId} marked resolved.`);

    addToast({
      type: 'info',
      title: 'Emergency Code Cleared',
      message: `Hospital-wide alert cleared and logged to HIPAA audit trail.`,
    });
  };

  const resetToDefaults = () => {
    localStorage.clear();
    setPatients(initialPatients);
    setBeds(initialBeds);
    setTriageRecords(initialTriageRecords);
    setFormulary(initialFormulary);
    setPrescriptions(initialPrescriptions);
    setLabOrders(initialLabOrders);
    setImagingOrders(initialImagingOrders);
    setPatientEncounters(initialEncounters);
    setInvoices(initialInvoices);
    setAppointments(initialAppointments);
    setStaff(initialStaff);
    setAuditEvents(initialAuditEvents);
    setEmergencyBroadcasts([]);
    setCurrentUser(initialUsers[0]);
    setSelectedPatient(null);
    setActiveTelehealthCall(null);
    clearAllToasts();
  };

  return (
    <HospitalContext.Provider
      value={{
        currentUser,
        allUsers,
        setCurrentUser,
        isPhysician,
        isTriageNurse,
        isPharmacist,
        isTechnician,
        isBillingOfficer,

        triageRecords,
        registerNewIntake,
        startTriageSession,
        completeTriageAndSendToDoctor,

        doctorQueue,
        startDoctorConsultation,

        patients,
        selectedPatient,
        setSelectedPatient,
        updatePatient,
        dischargePatient,
        addClinicalNote,
        recordPatientVitals,

        patientEncounters,
        savePatientEncounter,

        beds,
        wards,
        updateBedStatus,
        transferPatientBed,
        assignBedToPatient,
        releaseBed,

        formulary,
        prescriptions,
        createPrescription,
        dispensePrescription,
        updateFormularyStock,

        labOrders,
        createLabOrder,
        recordLabResults,

        imagingOrders,
        createImagingOrder,
        uploadImagingResult,
        updateImagingStatus,

        invoices,
        createInvoice,
        submitInsuranceClaim,
        recordInvoicePayment,

        appointments,
        scheduleAppointment,
        updateAppointmentStatus,
        activeTelehealthCall,
        setActiveTelehealthCall,

        staff,
        toggleStaffOnDuty,
        pageStaffMember,

        emergencyBroadcasts,
        activeBroadcast,
        triggerEmergencyBroadcast,
        resolveEmergencyBroadcast,

        auditEvents,
        logAuditEvent,

        audioAlertsEnabled,
        toggleAudioAlerts,
        playAlertSound,

        toasts,
        addToast,
        removeToast,
        clearAllToasts,

        resetToDefaults,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};
