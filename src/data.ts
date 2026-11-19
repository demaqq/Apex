import type {
  ExternalProvider,
  FacilitySettings,
  InvestigationItem,
  Appointment,
  Bed,
  CosignNote,
  Handover,
  ObservationSet,
  RoundNote,
  LabourEntry,
  SamEntry,
  AncVisit,
  PatientCharts,
  FluidEntry,
  Page,
  TheatreCase,
  Ward,
  ClinicalOrder,
  Department,
  DepartmentId,
  EmergencyCode,
  FormularyItem,
  HospitalState,
  Invoice,
  Patient,
  Prescription,
  Referral,
  RoleId,
  RoleProfile,
  StaffMember,
  Vitals,
} from './types'

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export const roleProfiles: Record<RoleId, RoleProfile> = {
  physician: {
    id: 'physician',
    name: 'Dr. Maya Chen',
    title: 'Emergency Physician',
    shortTitle: 'Physician',
    employeeId: 'EP-1048',
    department: 'emergency',
    initials: 'MC',
    shift: '07:00 – 19:00',
    workspace: 'Clinical command',
    headline: 'Your sickest patients, first.',
    description: 'Prioritised clinical queue, active decision points and diagnostics in one view.',
    focus: ['High-acuity census', 'Diagnostic turnaround', 'Specialist decisions'],
    accent: '#147d73',
  },
  nurse: {
    id: 'nurse',
    name: 'Sarah Okafor, RN',
    title: 'Senior Triage Nurse',
    shortTitle: 'Nurse',
    employeeId: 'TR-2216',
    department: 'emergency',
    initials: 'SO',
    shift: '07:00 – 15:30',
    workspace: 'Triage workspace',
    headline: 'Every arrival, safely assessed.',
    description: 'A rapid intake flow with explainable ESI scoring and a live waiting-room view.',
    focus: ['Arrivals awaiting triage', 'Reassessment timers', 'Waiting-room risk'],
    accent: '#9b5c37',
  },
  consultant: {
    id: 'consultant',
    name: 'Dr. Amir Rahman',
    title: 'Cardiology Consultant',
    shortTitle: 'Consultant',
    employeeId: 'CA-0872',
    department: 'cardiology',
    initials: 'AR',
    shift: '08:00 – 18:00',
    workspace: 'Consultation inbox',
    headline: 'Decisions without the phone tag.',
    description: 'Structured referrals, complete clinical context and trackable recommendations.',
    focus: ['New specialist referrals', 'Accepted consultations', 'Recommendations due'],
    accent: '#5367a8',
  },
  diagnostics: {
    id: 'diagnostics',
    name: 'Leah Morgan, FRCR',
    title: 'Imaging & Laboratory Specialist',
    shortTitle: 'Imaging / Lab',
    employeeId: 'RA-3304',
    department: 'radiology',
    initials: 'LM',
    shift: '08:00 – 16:00',
    workspace: 'Diagnostic worklist',
    headline: 'Move critical answers forward.',
    description: 'A modality-focused worklist with prioritisation, reporting and result handback.',
    focus: ['Urgent diagnostics', 'Studies in progress', 'Unreported results'],
    accent: '#72569a',
  },
  coordinator: {
    id: 'coordinator',
    name: 'Jon Bell',
    title: 'Bed & Flow Coordinator',
    shortTitle: 'Flow coordinator',
    employeeId: 'FC-1190',
    department: 'ward',
    initials: 'JB',
    shift: '06:30 – 18:30',
    workspace: 'Capacity command',
    headline: 'The right bed, without delay.',
    description: 'Live capacity, patient movement and interdepartmental handoffs across the hospital.',
    focus: ['Available capacity', 'Pending transfers', 'Discharge blockers'],
    accent: '#2b7592',
  },
  administrator: {
    id: 'administrator',
    name: 'Elena Rossi',
    title: 'Hospital Administrator',
    shortTitle: 'Administrator',
    employeeId: 'AD-0014',
    department: 'emergency',
    initials: 'ER',
    shift: '08:00 – 17:00',
    workspace: 'Hospital overview',
    headline: 'See the system, not the silos.',
    description: 'Operational performance, capacity pressure and cross-department flow at a glance.',
    focus: ['Hospital occupancy', 'Flow performance', 'Department pressure'],
    accent: '#243e46',
  },

  intern: {
    id: 'intern',
    name: 'Dr. Leo Park',
    title: 'Foundation Doctor (FY1)',
    shortTitle: 'Intern',
    employeeId: 'FY-2207',
    department: 'internal-medicine',
    initials: 'LP',
    shift: '08:00 – 20:00',
    workspace: 'Ward round',
    headline: 'Your ward, reviewed and signed off.',
    description: 'Inpatient list, observations and notes that your supervising consultant co-signs.',
    focus: ['Ward round', 'Notes for co-signature', 'Results to review'],
    accent: '#3d6f8f',
  },
  pharmacist: {
    id: 'pharmacist',
    name: 'Nina Wallace, PharmD',
    title: 'Clinical Pharmacist',
    shortTitle: 'Pharmacist',
    employeeId: 'PH-0311',
    department: 'pharmacy',
    initials: 'NW',
    shift: '07:00 – 15:00',
    workspace: 'Pharmacy',
    headline: 'Safe medicines, verified first time.',
    description: 'Verification, dispensing, stock and interaction checks.',
    focus: ['Verification queue', 'Stock levels', 'Interactions'],
    accent: '#5f7f3f',
  },
  receptionist: {
    id: 'receptionist',
    name: 'Grace Mwangi',
    title: 'Front Desk Coordinator',
    shortTitle: 'Front desk',
    employeeId: 'FD-0118',
    department: 'emergency',
    initials: 'GM',
    shift: '07:00 – 19:00',
    workspace: 'Front desk',
    headline: 'Every arrival, registered and routed.',
    description: 'Registration, appointments and the triage queue.',
    focus: ['Registration', 'Triage queue', 'Appointments'],
    accent: '#8a6a2f',
  },
  theatre: {
    id: 'theatre',
    name: 'Dr. Ines Duarte',
    title: 'Consultant Anaesthetist',
    shortTitle: 'Theatres',
    employeeId: 'AN-0442',
    department: 'surgery',
    initials: 'ID',
    shift: '07:30 – 17:30',
    workspace: 'Operating theatres',
    headline: 'Safe surgery, step by step.',
    description: 'Today’s theatre list, safety checklist and anaesthesia records.',
    focus: ['Theatre list', 'Safety checklist', 'Anaesthesia'],
    accent: '#7a4f8f',
  },
  allied: {
    id: 'allied',
    name: 'Sam Oduya, PT',
    title: 'Physiotherapist',
    shortTitle: 'Allied health',
    employeeId: 'AH-0207',
    department: 'ward',
    initials: 'SO',
    shift: '08:00 – 16:00',
    workspace: 'Service worklist',
    headline: 'Rehabilitation, nutrition and transfusion.',
    description: 'Physiotherapy, nutrition and blood bank requests from every ward.',
    focus: ['Physiotherapy', 'Nutrition', 'Blood bank'],
    accent: '#2f7f73',
  },
  billing: {
    id: 'billing',
    name: 'Priya Desai',
    title: 'Billing Officer',
    shortTitle: 'Billing',
    employeeId: 'BL-0093',
    department: 'emergency',
    initials: 'PD',
    shift: '08:30 – 17:00',
    workspace: 'Billing & claims',
    headline: 'Accurate bills, paid on time.',
    description: 'Invoices generated from orders, payments and insurance claims.',
    focus: ['Invoices', 'Claims', 'Payments'],
    accent: '#6b5b2f',
  },
}

export const departmentSeed: Department[] = [
  { id: 'emergency', name: 'Emergency Medicine', shortName: 'Emergency', lead: 'Dr. Helena Ward', onCall: 'Dr. Maya Chen', phone: 'x2100', capacity: 34, occupied: 29, targetWait: 15, averageWait: 22, color: '#d86151', zone: 'Level 1 · East', description: '24/7 emergency assessment, resuscitation and acute observation.', services: ['Resuscitation', 'Acute assessment', 'Short-stay observation'] },
  { id: 'cardiology', name: 'Cardiology', shortName: 'Cardiology', lead: 'Prof. David Osei', onCall: 'Dr. Amir Rahman', phone: 'x2240', capacity: 22, occupied: 18, targetWait: 30, averageWait: 26, color: '#5367a8', zone: 'Level 3 · North', description: 'Acute cardiac care, diagnostics and post-intervention monitoring.', services: ['CCU', 'Echocardiography', 'Cardiac catheterisation'] },
  { id: 'neurology', name: 'Neurology & Stroke', shortName: 'Neurology', lead: 'Dr. Ingrid Voss', onCall: 'Dr. Tomas Reid', phone: 'x2280', capacity: 18, occupied: 13, targetWait: 10, averageWait: 14, color: '#7a5d9d', zone: 'Level 3 · West', description: 'Rapid stroke response and specialist neurological inpatient care.', services: ['Hyperacute stroke', 'Neuro observation', 'Seizure service'] },
  { id: 'radiology', name: 'Radiology & Imaging', shortName: 'Radiology', lead: 'Dr. Leah Morgan', onCall: 'Dr. Noah Williams', phone: 'x2320', capacity: 12, occupied: 8, targetWait: 45, averageWait: 38, color: '#2f8290', zone: 'Level 2 · Central', description: 'Emergency and inpatient CT, MRI, ultrasound and plain film imaging.', services: ['CT', 'MRI', 'Ultrasound', 'Plain film'] },
  { id: 'laboratory', name: 'Clinical Laboratory', shortName: 'Laboratory', lead: 'Dr. Priya Nair', onCall: 'Dr. Felix Adeyemi', phone: 'x2350', capacity: 16, occupied: 10, targetWait: 60, averageWait: 52, color: '#378777', zone: 'Level 2 · South', description: 'Round-the-clock pathology, biochemistry and blood bank services.', services: ['Biochemistry', 'Haematology', 'Microbiology', 'Blood bank'] },
  { id: 'icu', name: 'Intensive Care', shortName: 'ICU', lead: 'Dr. Marcus Lind', onCall: 'Dr. Ana Costa', phone: 'x2400', capacity: 16, occupied: 15, targetWait: 20, averageWait: 31, color: '#b65464', zone: 'Level 4 · North', description: 'Level 3 critical care with advanced organ support and monitoring.', services: ['Critical care', 'Ventilation', 'Post-operative HDU'] },
  { id: 'surgery', name: 'Surgery & Theatre', shortName: 'Surgery', lead: 'Mr. Robert Hale', onCall: 'Ms. Keiko Sato', phone: 'x2460', capacity: 28, occupied: 21, targetWait: 90, averageWait: 76, color: '#9b6a3c', zone: 'Level 4 · Central', description: 'Emergency theatre, surgical assessment and post-operative inpatient care.', services: ['Emergency theatre', 'Orthopaedics', 'General surgery'] },
  { id: 'ward', name: 'General Medical Ward', shortName: 'General ward', lead: 'Dr. June Ellis', onCall: 'Dr. Peter Hall', phone: 'x2520', capacity: 46, occupied: 38, targetWait: 120, averageWait: 98, color: '#487a9a', zone: 'Level 5 · South', description: 'General internal medicine, rehabilitation and discharge coordination.', services: ['Internal medicine', 'Step-down care', 'Discharge planning'] },
  { id: 'pharmacy', name: 'Pharmacy', shortName: 'Pharmacy', lead: 'Nina Wallace, PharmD', onCall: 'Samir Patel, PharmD', phone: 'x2580', capacity: 10, occupied: 5, targetWait: 30, averageWait: 24, color: '#67864a', zone: 'Level 1 · Central', description: 'Clinical verification, inpatient dispensing and discharge medicines.', services: ['Clinical verification', 'STAT dispensing', 'Discharge prescriptions'] },
  { id: 'pediatrics', name: 'Paediatrics', shortName: 'Paediatrics', lead: 'Dr. Elise Martin', onCall: 'Dr. Isaac Green', phone: 'x2600', capacity: 20, occupied: 12, targetWait: 20, averageWait: 18, color: '#c5824f', zone: 'Level 2 · West', description: 'Dedicated paediatric emergency, assessment and inpatient services.', services: ['Paediatric assessment', "Children's ward", 'Family-centred care'] },
  { id: 'obgyn', name: 'Obstetrics & Gynaecology', shortName: 'OB/GYN', lead: 'Dr. Leila Thompson', onCall: 'Dr. Hannah Reid', phone: 'x2640', capacity: 24, occupied: 17, targetWait: 20, averageWait: 19, color: '#ad6682', zone: 'Level 3 · South', description: 'Integrated maternity, obstetric emergency and gynaecology services for inpatient and outpatient care.', services: ['Maternity triage', 'Antenatal care', 'Gynaecology clinic'] },
  { id: 'oncology', name: 'Oncology', shortName: 'Oncology', lead: 'Dr. Mahlet Assefa', onCall: 'Dr. Mahlet Assefa', phone: 'x2720', capacity: 16, occupied: 9, targetWait: 30, averageWait: 24, color: '#8b6cc4', zone: 'Level 4 · East', description: 'Cancer diagnosis, chemotherapy day unit, inpatient oncology and palliative care.', services: ['Chemotherapy day unit', 'Tumour board', 'Palliative care', 'Oncology clinic'] },
  { id: 'internal-medicine', name: 'Internal Medicine', shortName: 'Internal Medicine', lead: 'Dr. Victor Owens', onCall: 'Dr. Rachel Stein', phone: 'x2680', capacity: 38, occupied: 30, targetWait: 60, averageWait: 47, color: '#477e71', zone: 'Level 5 · North', description: 'Comprehensive adult medical assessment, complex inpatient care and outpatient follow-up.', services: ['Acute medicine', 'Complex care', 'Medical outpatient clinic'] },
  { id: 'ent', name: 'Ear, Nose & Throat', shortName: 'ENT', lead: 'Mr. Adrian Cole', onCall: 'Ms. Prianka Shah', phone: 'x2720', capacity: 14, occupied: 8, targetWait: 35, averageWait: 29, color: '#597d9c', zone: 'Level 2 · East', description: 'Specialist otolaryngology assessment, procedures, inpatient reviews and outpatient clinics.', services: ['ENT clinic', 'Airway assessment', 'Audiology'] },
  { id: 'dermatology', name: 'Dermatology', shortName: 'Dermatology', lead: 'Dr. Miriam Klein', onCall: 'Dr. Anthony Ford', phone: 'x2760', capacity: 12, occupied: 6, targetWait: 45, averageWait: 34, color: '#a57558', zone: 'Level 2 · South', description: 'Medical dermatology, urgent skin assessment, minor procedures and longitudinal outpatient care.', services: ['Medical dermatology', 'Minor procedures', 'Phototherapy'] },
]

const baseVitals: Vitals = { hr: 82, rr: 16, spo2: 98, bpSys: 122, bpDia: 76, temp: 36.8, gcs: 15, pain: 3 }
const v = (changes: Partial<Vitals>): Vitals => ({ ...baseVitals, ...changes })

const patientSeed = (): Patient[] => [
  { id: 'p1001', mrn: 'NS-008421', name: 'Evelyn Parker', age: 67, sex: 'Female', pronouns: 'she/her', complaint: 'Central chest pressure radiating to left arm', history: 'Hypertension, type 2 diabetes. Symptoms began 50 minutes before arrival while gardening. Aspirin 300 mg administered in ED.', allergies: ['Penicillin'], arrival: ago(46), esi: 2, riskFactors: ['Cardiac chest pain', 'Age over 65'], resources: 3, vitals: v({ hr: 108, rr: 22, spo2: 95, bpSys: 158, bpDia: 94, pain: 7 }), department: 'emergency', location: 'Resus 02', status: 'in-treatment', assignedTo: 'Dr. Maya Chen', timeline: [ { id: uid('ev'), at: ago(46), type: 'arrival', title: 'Arrived by ambulance', detail: 'Pre-alert received for suspected acute coronary syndrome.', author: 'Control desk', department: 'emergency' }, { id: uid('ev'), at: ago(41), type: 'triage', title: 'Triaged ESI 2', detail: 'High-risk cardiac presentation. Immediate physician review requested.', author: 'Sarah Okafor, RN', department: 'emergency' }, { id: uid('ev'), at: ago(28), type: 'order', title: '12-lead ECG completed', detail: 'ST depression in V4–V6. Troponin and cardiology review requested.', author: 'Dr. Maya Chen', department: 'emergency' } ] },
  { id: 'p1002', mrn: 'NS-008422', name: 'Mateo Rodriguez', age: 34, sex: 'Male', pronouns: 'he/him', complaint: 'Open distal forearm fracture after cycling fall', history: 'No loss of consciousness. Neurovascularly intact distally. Tetanus status confirmed.', allergies: ['No known allergies'], arrival: ago(74), esi: 3, riskFactors: ['Open fracture'], resources: 3, vitals: v({ hr: 94, pain: 8 }), department: 'emergency', location: 'ED Bed 08', status: 'in-treatment', assignedTo: 'Dr. Maya Chen', timeline: [ { id: uid('ev'), at: ago(74), type: 'arrival', title: 'Walk-in arrival', detail: 'Right forearm deformity with 2 cm open wound.', author: 'Reception', department: 'emergency' }, { id: uid('ev'), at: ago(65), type: 'triage', title: 'Triaged ESI 3', detail: 'Stable vital signs; multiple resources anticipated.', author: 'Sarah Okafor, RN', department: 'emergency' }, { id: uid('ev'), at: ago(31), type: 'referral', title: 'Orthopaedic review requested', detail: 'Urgent operative assessment for open fracture.', author: 'Dr. Maya Chen', department: 'surgery' } ] },
  { id: 'p1003', mrn: 'NS-008371', name: 'Amina Yusuf', age: 45, sex: 'Female', pronouns: 'she/her', complaint: 'Sudden right-sided weakness and expressive aphasia', history: 'Last known well 08:12. Atrial fibrillation, anticoagulation adherence uncertain. NIHSS 11 on arrival.', allergies: ['No known allergies'], arrival: ago(33), esi: 2, riskFactors: ['Stroke symptoms', 'Time-critical'], resources: 4, vitals: v({ hr: 91, rr: 18, spo2: 97, bpSys: 174, bpDia: 96, pain: 1 }), department: 'neurology', location: 'Stroke Bay 01', status: 'in-treatment', assignedTo: 'Dr. Tomas Reid', timeline: [ { id: uid('ev'), at: ago(33), type: 'arrival', title: 'Stroke pre-alert', detail: 'Fast-positive with last known well confirmed by family.', author: 'Ambulance control', department: 'emergency' }, { id: uid('ev'), at: ago(24), type: 'order', title: 'CT head completed', detail: 'No intracranial haemorrhage identified. CTA requested.', author: 'Dr. Leah Morgan', department: 'radiology' }, { id: uid('ev'), at: ago(18), type: 'transfer', title: 'Moved to Stroke Bay 01', detail: 'Neurology team at bedside; thrombolysis assessment underway.', author: 'Jon Bell', department: 'neurology' } ] },
  { id: 'p1004', mrn: 'NS-008426', name: 'Daniel Kim', age: 29, sex: 'Male', pronouns: 'he/him', complaint: 'Acute asthma exacerbation, incomplete response to inhaler', history: 'Known asthma, previous ICU admission in 2023. Salbutamol nebuliser started; speaking in short phrases.', allergies: ['Latex'], arrival: ago(39), esi: 2, riskFactors: ['Respiratory distress', 'Previous critical care'], resources: 2, vitals: v({ hr: 124, rr: 30, spo2: 92, bpSys: 132, bpDia: 82, pain: 4 }), department: 'emergency', location: 'ED Bed 04', status: 'in-treatment', assignedTo: 'Dr. Maya Chen', timeline: [ { id: uid('ev'), at: ago(39), type: 'arrival', title: 'Walk-in arrival', detail: 'Audible wheeze and increased work of breathing at reception.', author: 'Reception', department: 'emergency' }, { id: uid('ev'), at: ago(36), type: 'triage', title: 'Triaged ESI 2', detail: 'High-risk respiratory presentation; immediate bed allocation.', author: 'Sarah Okafor, RN', department: 'emergency' } ] },
  { id: 'p1005', mrn: 'NS-007914', name: 'Grace Bennett', age: 78, sex: 'Female', pronouns: 'she/her', complaint: 'Day 2 following right total hip replacement', history: 'Procedure uncomplicated. Mobilising with physiotherapy; mild post-operative nausea resolving.', allergies: ['Codeine'], arrival: ago(2900), esi: 3, riskFactors: ['Post-operative'], resources: 1, vitals: v({ hr: 78, bpSys: 136, bpDia: 78, pain: 4 }), department: 'surgery', location: 'Surgical 3B · Bed 12', status: 'admitted', assignedTo: 'Ms. Keiko Sato', timeline: [ { id: uid('ev'), at: ago(110), type: 'note', title: 'Ward round completed', detail: 'Wound clean and dry. Plan for discharge tomorrow if mobility goals met.', author: 'Ms. Keiko Sato', department: 'surgery' }, { id: uid('ev'), at: ago(48), type: 'order', title: 'Discharge prescription requested', detail: 'Pharmacy to verify analgesia and venous thromboembolism prophylaxis.', author: 'Grace Liu, RN', department: 'pharmacy' } ] },
  { id: 'p1006', mrn: 'NS-008429', name: 'Lucas Meyer', age: 8, sex: 'Male', pronouns: 'he/him', complaint: 'Fever and right ear pain for two days', history: 'Drinking normally, no rash or respiratory distress. Accompanied by parent. Immunisations up to date.', allergies: ['No known allergies'], arrival: ago(27), esi: 4, riskFactors: [], resources: 1, vitals: v({ hr: 112, rr: 20, temp: 38.1, pain: 5 }), department: 'pediatrics', location: 'Paeds Assessment 02', status: 'waiting', assignedTo: 'Dr. Isaac Green', timeline: [ { id: uid('ev'), at: ago(27), type: 'arrival', title: 'Arrived with parent', detail: 'Alert and interactive; no red-flag symptoms at initial assessment.', author: 'Paeds reception', department: 'pediatrics' }, { id: uid('ev'), at: ago(20), type: 'triage', title: 'Triaged ESI 4', detail: 'Single resource anticipated. Age-appropriate observations recorded.', author: 'Megan Shaw, RN', department: 'pediatrics' } ] },
  { id: 'p1007', mrn: 'NS-008419', name: 'Nadia Hassan', age: 52, sex: 'Female', pronouns: 'she/her', complaint: 'Fever on day 9 after cytotoxic chemotherapy', history: 'Breast cancer, recent chemotherapy. Neutropenic sepsis pathway activated; first-line antibiotics prescribed.', allergies: ['Sulfonamides'], arrival: ago(68), esi: 2, riskFactors: ['Immunosuppression', 'Possible sepsis'], resources: 4, vitals: v({ hr: 118, rr: 24, spo2: 96, bpSys: 102, bpDia: 62, temp: 38.7, pain: 3 }), department: 'icu', location: 'HDU 03', status: 'observation', assignedTo: 'Dr. Ana Costa', timeline: [ { id: uid('ev'), at: ago(68), type: 'arrival', title: 'Neutropenic sepsis alert', detail: 'Oncology helpline advised immediate emergency attendance.', author: 'Reception', department: 'emergency' }, { id: uid('ev'), at: ago(52), type: 'order', title: 'Cultures and lactate collected', detail: 'Blood cultures prior to antibiotics; urgent FBC and renal profile.', author: 'Dr. Maya Chen', department: 'laboratory' }, { id: uid('ev'), at: ago(17), type: 'transfer', title: 'Accepted to HDU', detail: 'Close observation while responding to fluids and antibiotics.', author: 'Dr. Ana Costa', department: 'icu' } ] },
  { id: 'p1008', mrn: 'NS-006582', name: 'Oliver Wright', age: 61, sex: 'Male', pronouns: 'he/him', complaint: 'NSTEMI, monitored after cardiac catheterisation', history: 'Drug-eluting stent to LAD yesterday. Currently pain free, dual antiplatelet therapy started.', allergies: ['No known allergies'], arrival: ago(1560), esi: 2, riskFactors: ['Acute coronary syndrome'], resources: 2, vitals: v({ hr: 72, rr: 16, spo2: 97, bpSys: 128, bpDia: 72, pain: 0 }), department: 'cardiology', location: 'CCU 06', status: 'admitted', assignedTo: 'Dr. Amir Rahman', timeline: [ { id: uid('ev'), at: ago(95), type: 'note', title: 'Cardiology review', detail: 'No further chest pain overnight. Telemetry stable; mobilise as tolerated.', author: 'Dr. Amir Rahman', department: 'cardiology' }, { id: uid('ev'), at: ago(30), type: 'order', title: 'Echocardiogram ordered', detail: 'Assess left ventricular function before discharge planning.', author: 'Dr. Amir Rahman', department: 'cardiology' } ] },
  { id: 'p1009', mrn: 'NS-008402', name: 'Sofia Petrova', age: 41, sex: 'Female', pronouns: 'she/her', complaint: 'Persistent headache; outpatient MRI requested by neurology', history: 'Four weeks of progressive headache, no focal deficit. Fundoscopy normal. MRI safety questionnaire complete.', allergies: ['Gadolinium contrast'], arrival: ago(52), esi: 3, riskFactors: ['Contrast allergy'], resources: 2, vitals: v({ hr: 76, pain: 6 }), department: 'radiology', location: 'MRI Reception', status: 'waiting', assignedTo: 'Dr. Leah Morgan', timeline: [ { id: uid('ev'), at: ago(52), type: 'arrival', title: 'Checked in for MRI', detail: 'Identity and MRI safety checklist confirmed.', author: 'Imaging reception', department: 'radiology' }, { id: uid('ev'), at: ago(16), type: 'note', title: 'Protocol reviewed', detail: 'Non-contrast MRI brain protocol approved due to previous gadolinium reaction.', author: 'Dr. Leah Morgan', department: 'radiology' } ] },
  { id: 'p1010', mrn: 'NS-005190', name: 'Ethan Brooks', age: 72, sex: 'Male', pronouns: 'he/him', complaint: 'COPD exacerbation, improving on ward treatment', history: 'Day 3 admission. Nebulisers weaned to inhalers; home oxygen assessment pending. Package of care referral submitted.', allergies: ['No known allergies'], arrival: ago(4200), esi: 3, riskFactors: ['Chronic respiratory disease'], resources: 1, vitals: v({ hr: 86, rr: 19, spo2: 93, bpSys: 130, bpDia: 74, pain: 1 }), department: 'ward', location: 'Ward 5S · Bed 12', status: 'admitted', assignedTo: 'Dr. Peter Hall', timeline: [ { id: uid('ev'), at: ago(180), type: 'note', title: 'Respiratory review', detail: 'Improving air entry. Target saturations 88–92%; monitor after inhaler transition.', author: 'Dr. Peter Hall', department: 'ward' }, { id: uid('ev'), at: ago(55), type: 'note', title: 'Discharge planning', detail: 'Community respiratory team to assess home oxygen requirements.', author: 'Jon Bell', department: 'ward' } ] },
  { id: 'p1011', mrn: 'NS-008431', name: 'Zoe Campbell', age: 26, sex: 'Female', pronouns: 'she/her', complaint: 'Left-sided throbbing headache with photophobia', history: 'Previous similar migraine episodes. No fever, neck stiffness or focal neurology. Last menstrual period three weeks ago.', allergies: ['Aspirin'], arrival: ago(19), esi: 4, riskFactors: [], resources: 1, vitals: v({ hr: 88, rr: 16, spo2: 99, bpSys: 116, bpDia: 70, pain: 7 }), department: 'emergency', location: 'Waiting Room B', status: 'waiting', assignedTo: 'Unassigned', timeline: [ { id: uid('ev'), at: ago(19), type: 'arrival', title: 'Walk-in arrival', detail: 'Self-presented with headache; independent and alert.', author: 'Reception', department: 'emergency' }, { id: uid('ev'), at: ago(12), type: 'triage', title: 'Triaged ESI 4', detail: 'Observations stable; analgesia and clinician review anticipated.', author: 'Sarah Okafor, RN', department: 'emergency' } ] },
  { id: 'p1012', mrn: 'NS-004817', name: 'Ibrahim Diallo', age: 58, sex: 'Male', pronouns: 'he/him', complaint: 'Ready for discharge following cellulitis treatment', history: 'Five-day admission for lower limb cellulitis. Afebrile for 48 hours, mobilising independently. Community follow-up arranged.', allergies: ['No known allergies'], arrival: ago(6900), esi: 4, riskFactors: [], resources: 1, vitals: v({ hr: 74, rr: 15, spo2: 98, bpSys: 126, bpDia: 76, pain: 1 }), department: 'pharmacy', location: 'Discharge Lounge', status: 'observation', assignedTo: 'Nina Wallace, PharmD', timeline: [ { id: uid('ev'), at: ago(130), type: 'transfer', title: 'Moved to discharge lounge', detail: 'Medically fit; awaiting final medicines and transport.', author: 'Jon Bell', department: 'ward' }, { id: uid('ev'), at: ago(22), type: 'order', title: 'Discharge medicines being prepared', detail: 'Seven-day oral antibiotic course and medicines counselling.', author: 'Nina Wallace, PharmD', department: 'pharmacy' } ] },
  { id: 'p1013', mrn: 'NS-008433', name: 'Hannah Osei', age: 31, sex: 'Female', pronouns: 'she/her', encounterType: 'inpatient', complaint: 'Postpartum hypertension and frontal headache', history: 'Day 1 following uncomplicated vaginal birth. New blood pressure elevation; deep tendon reflexes brisk, no visual disturbance. Magnesium sulfate assessment underway.', allergies: ['No known allergies'], arrival: ago(190), esi: 2, riskFactors: ['Postpartum', 'Possible pre-eclampsia'], resources: 3, vitals: v({ hr: 96, rr: 18, spo2: 98, bpSys: 164, bpDia: 102, temp: 36.9, pain: 5 }), department: 'obgyn', location: 'Maternity 3S · Bed 05', status: 'admitted', assignedTo: 'Dr. Hannah Reid', timeline: [ { id: uid('ev'), at: ago(190), type: 'arrival', title: 'Maternity review requested', detail: 'Postpartum blood pressure above severe-range threshold on two readings.', author: 'Alicia Moore, RM', department: 'obgyn' }, { id: uid('ev'), at: ago(42), type: 'note', title: 'Obstetric consultant review', detail: 'Commence antihypertensive treatment, hourly neurological observations and urgent pre-eclampsia blood profile.', author: 'Dr. Hannah Reid', department: 'obgyn' } ] },
  { id: 'p1014', mrn: 'NS-008414', name: 'George Mensah', age: 66, sex: 'Male', pronouns: 'he/him', encounterType: 'inpatient', complaint: 'Community-acquired pneumonia with type 2 diabetes', history: 'Admitted yesterday with productive cough and hypoxia. Improving on oxygen and IV antibiotics; capillary glucose requires closer monitoring.', allergies: ['Penicillin'], arrival: ago(1320), esi: 3, riskFactors: ['Diabetes', 'Hypoxia'], resources: 3, vitals: v({ hr: 92, rr: 21, spo2: 95, bpSys: 138, bpDia: 80, temp: 37.6, pain: 2 }), department: 'internal-medicine', location: 'Medical 5N · Bed 08', status: 'admitted', assignedTo: 'Dr. Rachel Stein', timeline: [ { id: uid('ev'), at: ago(160), type: 'note', title: 'Medical ward round', detail: 'Clinical improvement overnight. Wean oxygen with target saturations above 94%; review antibiotic route tomorrow.', author: 'Dr. Rachel Stein', department: 'internal-medicine' }, { id: uid('ev'), at: ago(36), type: 'order', title: 'Repeat inflammatory markers', detail: 'FBC, CRP, renal profile and glucose requested for trend review.', author: 'Dr. Rachel Stein', department: 'laboratory' } ] },
  { id: 'p1015', mrn: 'NS-008437', name: 'Lily Anderson', age: 17, sex: 'Female', pronouns: 'she/her', encounterType: 'outpatient', complaint: 'Recurrent tonsillitis and noisy breathing during sleep', history: 'Six documented tonsillitis episodes in the past year. Attending scheduled ENT outpatient review with parent; no current airway compromise.', allergies: ['No known allergies'], arrival: ago(24), esi: 4, riskFactors: [], resources: 1, vitals: v({ hr: 84, rr: 15, spo2: 99, bpSys: 112, bpDia: 68, temp: 36.7, pain: 2 }), department: 'ent', location: 'ENT Clinic 03', status: 'waiting', assignedTo: 'Ms. Prianka Shah', timeline: [ { id: uid('ev'), at: ago(24), type: 'arrival', title: 'Outpatient arrival recorded', detail: 'Referral letter and previous primary care treatment history available for review.', author: 'ENT reception', department: 'ent' }, { id: uid('ev'), at: ago(9), type: 'note', title: 'Pre-clinic observations', detail: 'Comfortable at rest with no stridor or drooling. Awaiting specialist assessment.', author: 'Sarah Okafor, RN', department: 'ent' } ] },
  { id: 'p1016', mrn: 'NS-008392', name: 'Marcus Lee', age: 38, sex: 'Male', pronouns: 'he/him', encounterType: 'outpatient', complaint: 'Persistent pruritic rash affecting hands and forearms', history: 'Six-month history with partial response to emollients. No mucosal involvement, fever or systemic symptoms. Patch testing to be considered.', allergies: ['No known allergies'], arrival: ago(41), esi: 5, riskFactors: [], resources: 1, vitals: v({ hr: 72, rr: 14, spo2: 99, bpSys: 124, bpDia: 74, temp: 36.6, pain: 1 }), department: 'dermatology', location: 'Dermatology Clinic 02', status: 'in-treatment', assignedTo: 'Dr. Anthony Ford', timeline: [ { id: uid('ev'), at: ago(41), type: 'arrival', title: 'Dermatology clinic arrival', detail: 'Outpatient episode opened; previous prescriptions reconciled.', author: 'Clinic reception', department: 'dermatology' }, { id: uid('ev'), at: ago(12), type: 'note', title: 'Skin examination documented', detail: 'Bilateral eczematous plaques without infection. Discuss allergen exposure and consider patch testing.', author: 'Dr. Anthony Ford', department: 'dermatology' } ] },
  { id: 'p1017', mrn: 'NS-008441', name: 'Rhea Kapoor', age: 28, sex: 'Female', pronouns: 'she/her', encounterType: 'outpatient', complaint: 'Routine 32-week antenatal review with mild ankle swelling', history: 'First pregnancy, previously uncomplicated. Fetal movements normal; no headache, visual symptoms or abdominal pain. Blood pressure and urine dipstick reviewed at clinic.', allergies: ['No known allergies'], arrival: ago(18), esi: 5, riskFactors: ['Pregnancy'], resources: 1, vitals: v({ hr: 88, rr: 16, spo2: 99, bpSys: 118, bpDia: 72, temp: 36.7, pain: 1 }), department: 'obgyn', location: 'Antenatal Clinic 04', status: 'waiting', assignedTo: 'Dr. Hannah Reid', timeline: [ { id: uid('ev'), at: ago(18), type: 'arrival', title: 'Antenatal outpatient arrival', detail: 'Growth chart and previous antenatal records available for continuity review.', author: 'Maternity reception', department: 'obgyn' }, { id: uid('ev'), at: ago(6), type: 'note', title: 'Midwife assessment', detail: 'Blood pressure normal, urine dipstick negative and fetal heart rate reassuring. Awaiting obstetric review.', author: 'Alicia Moore, RM', department: 'obgyn' } ] },
  { id: 'p1018', mrn: 'NS-008452', name: 'Liya Tadesse', age: 2, sex: 'Female', pronouns: 'she/her', encounterType: 'inpatient', complaint: 'Severe acute malnutrition with bilateral pitting oedema', history: 'Admitted 8 days ago from the outpatient therapeutic programme: oedema ++, MUAC 10.8 cm, poor appetite. Hypoglycaemia treated on arrival. Now oedema-free and on RUTF.', allergies: ['No known allergies'], arrival: ago(8 * 1440 - 120), esi: 3, riskFactors: ['Severe acute malnutrition'], resources: 2, vitals: v({ hr: 118, rr: 30, spo2: 98, bpSys: 92, bpDia: 56, temp: 36.6, pain: 0 }), department: 'pediatrics', location: 'Paeds SAM unit · Bed 03', status: 'admitted', assignedTo: 'Dr. Isaac Green', timeline: [ { id: uid('ev'), at: ago(8 * 1440 - 120), type: 'arrival', title: 'Admitted to the SAM stabilisation centre', detail: 'Referred from outpatient programme: oedema ++, failed appetite test, lethargic.', author: 'Paeds reception', department: 'pediatrics' } ] },
  { id: 'p1019', mrn: 'NS-008455', name: 'Meron Haile', age: 26, sex: 'Female', pronouns: 'she/her', encounterType: 'inpatient', complaint: 'Spontaneous labour at 39+2 weeks, G2P1', history: 'Previous normal vaginal birth. Membranes ruptured 2 hours ago, clear liquor. Augmented with oxytocin for slow progress.', allergies: ['No known allergies'], arrival: ago(390), esi: 3, riskFactors: ['Pregnancy', 'Labour'], resources: 2, vitals: v({ hr: 94, rr: 18, spo2: 99, bpSys: 122, bpDia: 78, temp: 37.0, pain: 7 }), department: 'obgyn', location: 'Labour ward · Room 2', status: 'admitted', assignedTo: 'Dr. Hannah Reid', timeline: [ { id: uid('ev'), at: ago(390), type: 'arrival', title: 'Admitted in labour', detail: 'Regular contractions since early morning; cervix 4 cm on admission.', author: 'Alicia Moore, RM', department: 'obgyn' } ] },
  { id: 'p1020', mrn: 'NS-008461', name: 'Almaz Gebre', age: 54, sex: 'Female', pronouns: 'she/her', encounterType: 'inpatient', complaint: 'Cycle 4 of AC chemotherapy for breast cancer, nausea and fatigue', history: 'Stage IIIA left breast cancer, neoadjuvant doxorubicin and cyclophosphamide. Day 10 after cycle 3 she needed antibiotics for a febrile episode. Admitted for cycle 4 with antiemetic optimisation.', allergies: ['No known allergies'], arrival: ago(26 * 60), esi: 3, riskFactors: ['Chemotherapy', 'Breast cancer'], resources: 2, vitals: v({ hr: 92, rr: 16, spo2: 98, bpSys: 116, bpDia: 72, temp: 37.1, pain: 3 }), department: 'oncology', location: 'Oncology unit · Bed 02', status: 'admitted', assignedTo: 'Dr. Mahlet Assefa', timeline: [ { id: uid('ev'), at: ago(26 * 60), type: 'arrival', title: 'Admitted for chemotherapy', detail: 'Pre-chemotherapy bloods sent; ECOG 1.', author: 'Oncology day unit', department: 'oncology' } ] },
]

const referralSeed = (): Referral[] => [
  { id: 'RF-2401', patientId: 'p1001', from: 'emergency', to: 'cardiology', reason: 'Dynamic ECG changes and chest pressure; assess for early invasive strategy.', priority: 'emergent', status: 'pending', createdAt: ago(24), updatedAt: ago(24), createdBy: 'Dr. Maya Chen' },
  { id: 'RF-2402', patientId: 'p1002', from: 'emergency', to: 'surgery', reason: 'Open distal radius fracture; operative assessment and wound management.', priority: 'urgent', status: 'accepted', createdAt: ago(31), updatedAt: ago(14), createdBy: 'Dr. Maya Chen', owner: 'Ms. Keiko Sato' },
  { id: 'RF-2403', patientId: 'p1003', from: 'emergency', to: 'neurology', reason: 'Hyperacute stroke, NIHSS 11; thrombolysis and thrombectomy assessment.', priority: 'emergent', status: 'accepted', createdAt: ago(29), updatedAt: ago(20), createdBy: 'Dr. Maya Chen', owner: 'Dr. Tomas Reid' },
  { id: 'RF-2404', patientId: 'p1007', from: 'emergency', to: 'icu', reason: 'Neutropenic sepsis with borderline hypotension; monitored bed required.', priority: 'urgent', status: 'completed', createdAt: ago(49), updatedAt: ago(17), createdBy: 'Dr. Maya Chen', owner: 'Dr. Ana Costa', recommendation: 'HDU admission for continuous observations, repeat lactate and strict fluid balance.' },
  { id: 'RF-2405', patientId: 'p1004', from: 'emergency', to: 'icu', reason: 'Severe asthma with previous ICU admission; review if no response to initial therapy.', priority: 'urgent', status: 'pending', createdAt: ago(18), updatedAt: ago(18), createdBy: 'Dr. Maya Chen' },
  { id: 'RF-2406', patientId: 'p1010', from: 'ward', to: 'pharmacy', reason: 'Discharge inhaler counselling and medication reconciliation.', priority: 'routine', status: 'pending', createdAt: ago(42), updatedAt: ago(42), createdBy: 'Dr. Peter Hall' },
  { id: 'RF-2407', patientId: 'p1008', from: 'cardiology', to: 'ward', reason: 'Step-down after uncomplicated PCI; telemetry no longer required.', priority: 'routine', status: 'pending', createdAt: ago(35), updatedAt: ago(35), createdBy: 'Dr. Amir Rahman' },
  { id: 'RF-2408', patientId: 'p1013', from: 'obgyn', to: 'internal-medicine', reason: 'Severe postpartum hypertension; assist with antihypertensive titration and cardiovascular risk assessment.', priority: 'urgent', status: 'pending', createdAt: ago(16), updatedAt: ago(16), createdBy: 'Dr. Hannah Reid' },
]

const orderSeed = (): ClinicalOrder[] => [
  { id: 'OR-7990', patientId: 'p1010', title: 'Arterial blood gas', kind: 'Laboratory', department: 'laboratory', priority: 'emergent', status: 'completed', createdAt: ago(3 * 1440 + 230), createdBy: 'Dr. Maya Chen', result: 'pH 7.33, pCO₂ 7.1 kPa, pO₂ 7.4 kPa on air, HCO₃ 29. Compensated type 2 respiratory failure.' },
  { id: 'OR-7991', patientId: 'p1010', title: 'Chest X-ray', kind: 'Imaging', department: 'radiology', priority: 'urgent', status: 'completed', createdAt: ago(3 * 1440 + 220), createdBy: 'Dr. Maya Chen', result: 'Hyperinflated lungs. No consolidation, effusion or pneumothorax.' },
  { id: 'OR-7992', patientId: 'p1010', title: 'Full blood count and CRP', kind: 'Laboratory', department: 'laboratory', priority: 'routine', status: 'completed', createdAt: ago(1440 + 180), createdBy: 'Dr. Peter Hall', result: 'WCC 11.2, Hb 142, CRP 38 (down from 96).' },
  { id: 'OR-7993', patientId: 'p1010', title: 'Chest physiotherapy', kind: 'Physiotherapy', department: 'ward', priority: 'routine', status: 'completed', stage: 3, createdAt: ago(2 * 1440), createdBy: 'Dr. Peter Hall', result: 'Airway clearance and breathing control taught; mobilising 40 m with frame.' },
  { id: 'OR-7994', patientId: 'p1014', title: 'Chest X-ray', kind: 'Imaging', department: 'radiology', priority: 'urgent', status: 'completed', createdAt: ago(1440 + 470), createdBy: 'Dr. Maya Chen', result: 'Right lower lobe consolidation. No effusion.' },
  { id: 'OR-7995', patientId: 'p1014', title: 'Blood cultures ×2', kind: 'Laboratory', department: 'laboratory', priority: 'urgent', status: 'completed', createdAt: ago(1440 + 460), createdBy: 'Dr. Maya Chen', result: 'No growth at 24 hours.' },
  { id: 'OR-7996', patientId: 'p1014', title: 'Peripheral cannula insertion', kind: 'Procedure', department: 'internal-medicine', priority: 'routine', status: 'completed', stage: 2, createdAt: ago(1440 + 400), createdBy: 'Dr. Leo Park', result: '20G left forearm, first attempt.' },
  { id: 'OR-7997', patientId: 'p1008', title: 'Coronary angiography and PCI to LAD', kind: 'Procedure', department: 'cardiology', priority: 'emergent', status: 'completed', stage: 2, createdAt: ago(1520), createdBy: 'Dr. Amir Rahman', result: '90% proximal LAD stenosis; one drug-eluting stent, TIMI 3 flow. Right radial access.' },
  { id: 'OR-8101', patientId: 'p1001', title: 'High-sensitivity troponin I', kind: 'Laboratory', department: 'laboratory', priority: 'emergent', status: 'in-progress', createdAt: ago(27), createdBy: 'Dr. Maya Chen' },
  { id: 'OR-8102', patientId: 'p1001', title: 'Portable chest X-ray', kind: 'Imaging', department: 'radiology', priority: 'urgent', status: 'ordered', createdAt: ago(22), createdBy: 'Dr. Maya Chen' },
  { id: 'OR-8103', patientId: 'p1003', title: 'CT angiography head and neck', kind: 'Imaging', department: 'radiology', priority: 'emergent', status: 'in-progress', createdAt: ago(21), createdBy: 'Dr. Tomas Reid' },
  { id: 'OR-8104', patientId: 'p1002', title: 'X-ray right forearm, two views', kind: 'Imaging', department: 'radiology', priority: 'urgent', status: 'completed', createdAt: ago(45), createdBy: 'Dr. Maya Chen', result: 'Displaced distal radial fracture with associated ulnar styloid fracture. No radiopaque foreign body.' },
  { id: 'OR-8105', patientId: 'p1007', title: 'FBC, renal profile, CRP and lactate', kind: 'Laboratory', department: 'laboratory', priority: 'emergent', status: 'completed', createdAt: ago(51), createdBy: 'Dr. Maya Chen', result: 'WCC 0.8 ×10⁹/L, neutrophils 0.2 ×10⁹/L, CRP 186 mg/L, lactate 2.8 mmol/L. eGFR 61 mL/min.' },
  { id: 'OR-8106', patientId: 'p1009', title: 'MRI brain without contrast', kind: 'Imaging', department: 'radiology', priority: 'routine', status: 'ordered', createdAt: ago(38), createdBy: 'Dr. Tomas Reid' },
  { id: 'OR-8107', patientId: 'p1008', title: 'Transthoracic echocardiogram', kind: 'Imaging', department: 'radiology', priority: 'routine', status: 'ordered', createdAt: ago(30), createdBy: 'Dr. Amir Rahman' },
  { id: 'OR-8108', patientId: 'p1005', title: 'Discharge medication verification', kind: 'Medication', department: 'pharmacy', priority: 'routine', status: 'in-progress', createdAt: ago(48), createdBy: 'Ms. Keiko Sato' },
  { id: 'OR-8109', patientId: 'p1012', title: 'Discharge medicines and counselling', kind: 'Medication', department: 'pharmacy', priority: 'routine', status: 'in-progress', createdAt: ago(22), createdBy: 'Dr. Peter Hall' },
  { id: 'OR-8110', patientId: 'p1004', title: 'Arterial blood gas', kind: 'Laboratory', department: 'laboratory', priority: 'urgent', status: 'ordered', createdAt: ago(13), createdBy: 'Dr. Maya Chen' },
  { id: 'OR-8111', patientId: 'p1013', title: 'Pre-eclampsia profile: FBC, LFT, renal profile and urate', kind: 'Laboratory', department: 'laboratory', priority: 'urgent', status: 'ordered', createdAt: ago(35), createdBy: 'Dr. Hannah Reid' },
  { id: 'OR-8113', patientId: 'p1005', title: 'Mobilisation after hip replacement', kind: 'Physiotherapy', department: 'ward', priority: 'routine', status: 'in-progress', stage: 2, createdAt: ago(300), createdBy: 'Mr. Robert Hale' },
  { id: 'OR-8114', patientId: 'p1014', title: 'Diabetic diet review', kind: 'Nutrition', department: 'internal-medicine', priority: 'routine', status: 'ordered', stage: 0, createdAt: ago(90), createdBy: 'Dr. Leo Park' },
  { id: 'OR-8115', patientId: 'p1007', title: 'Crossmatch 2 units red cells', kind: 'Blood bank', department: 'laboratory', priority: 'urgent', status: 'in-progress', stage: 2, createdAt: ago(70), createdBy: 'Dr. Ana Costa' },
  { id: 'OR-8112', patientId: 'p1014', title: 'FBC, CRP, renal profile and glucose', kind: 'Laboratory', department: 'laboratory', priority: 'routine', status: 'in-progress', createdAt: ago(36), createdBy: 'Dr. Rachel Stein' },
]

const formularySeed = (): FormularyItem[] => [
  { id: 'med-1', name: 'Paracetamol', genericName: 'Acetaminophen', generic: 'paracetamol', contraindications: ['Severe liver impairment'], category: 'Analgesic', dosageForm: 'Tablet', strength: '500 mg', stock: 5000, unit: 'tablet', reorderLevel: 1000, pricePerUnit: 0.05, route: 'PO' },
  { id: 'med-2', name: 'Ibuprofen', genericName: 'Ibuprofen', generic: 'ibuprofen', contraindications: ['Active gastrointestinal bleeding', 'Severe renal impairment', 'Third trimester of pregnancy'], category: 'Analgesic', dosageForm: 'Tablet', strength: '400 mg', stock: 1100, unit: 'tablet', reorderLevel: 500, pricePerUnit: 0.08, route: 'PO' },
  { id: 'med-3', name: 'Morphine', genericName: 'Morphine sulfate', generic: 'morphine', contraindications: ['Respiratory depression', 'Acute severe asthma'], category: 'Analgesic', dosageForm: 'Injection', strength: '10 mg/mL', stock: 46, unit: 'ampoule', reorderLevel: 50, pricePerUnit: 2.5, route: 'IV', controlled: true, batch: 'MO-2291', expiry: '2027-01-31', supplier: 'EPSS' },
  { id: 'med-4', name: 'Ceftriaxone', genericName: 'Ceftriaxone sodium', generic: 'ceftriaxone', contraindications: ['Neonates receiving calcium-containing infusions'], category: 'Antibiotic', dosageForm: 'Injection', strength: '1 g', stock: 500, unit: 'vial', reorderLevel: 100, pricePerUnit: 4.2, route: 'IV' },
  { id: 'med-5', name: 'Metoprolol', genericName: 'Metoprolol tartrate', generic: 'metoprolol', contraindications: ['Severe bradycardia', 'Cardiogenic shock'], category: 'Cardiovascular', dosageForm: 'Tablet', strength: '25 mg', stock: 1000, unit: 'tablet', reorderLevel: 200, pricePerUnit: 0.15, route: 'PO' },
  { id: 'med-6', name: 'Insulin glargine', genericName: 'Insulin glargine', generic: 'insulin', contraindications: ['Hypoglycaemia'], category: 'Antidiabetic', dosageForm: 'Pen', strength: '100 units/mL', stock: 52, unit: 'pen', reorderLevel: 30, pricePerUnit: 45, route: 'SC', batch: 'IG-1840', expiry: '2026-12-15', supplier: 'Sanofi distributor' },
  { id: 'med-7', name: 'Salbutamol', genericName: 'Salbutamol sulfate', generic: 'salbutamol', contraindications: [], category: 'Respiratory', dosageForm: 'Inhaler', strength: '100 mcg/dose', stock: 800, unit: 'inhaler', reorderLevel: 150, pricePerUnit: 12, route: 'Inhaled' },
  { id: 'med-8', name: 'Midazolam', genericName: 'Midazolam', generic: 'midazolam', contraindications: ['Severe respiratory insufficiency'], category: 'Sedative', dosageForm: 'Injection', strength: '5 mg/mL', stock: 100, unit: 'ampoule', reorderLevel: 25, pricePerUnit: 3.2, route: 'IV', controlled: true },
  { id: 'med-9', name: 'Adrenaline', genericName: 'Epinephrine', generic: 'adrenaline', contraindications: [], category: 'Emergency', dosageForm: 'Injection', strength: '1 mg/mL (1:1000)', stock: 200, unit: 'ampoule', reorderLevel: 50, pricePerUnit: 1.8, route: 'IM / IV' },
  { id: 'med-10', name: 'Vancomycin', genericName: 'Vancomycin hydrochloride', generic: 'vancomycin', contraindications: [], category: 'Antibiotic', dosageForm: 'Injection', strength: '1 g', stock: 300, unit: 'vial', reorderLevel: 75, pricePerUnit: 8.5, route: 'IV' },
  { id: 'med-11', name: 'Labetalol', genericName: 'Labetalol hydrochloride', generic: 'labetalol', contraindications: ['Asthma', 'Second- or third-degree heart block'], category: 'Cardiovascular', dosageForm: 'Tablet', strength: '200 mg', stock: 400, unit: 'tablet', reorderLevel: 100, pricePerUnit: 0.32, route: 'PO' },
  { id: 'med-13', name: 'Warfarin', genericName: 'Warfarin sodium', generic: 'warfarin', contraindications: ['Pregnancy', 'Active bleeding'], category: 'Cardiovascular', dosageForm: 'Tablet', strength: '5 mg', stock: 400, unit: 'tablet', reorderLevel: 100, pricePerUnit: 0.12, route: 'PO' },
  { id: 'med-14', name: 'Aspirin', genericName: 'Acetylsalicylic acid', generic: 'aspirin', contraindications: ['Active bleeding', 'Children under 16 with viral illness'], category: 'Cardiovascular', dosageForm: 'Tablet', strength: '81 mg', stock: 1500, unit: 'tablet', reorderLevel: 500, pricePerUnit: 0.03, route: 'PO' },
  { id: 'med-15', name: 'Clopidogrel', genericName: 'Clopidogrel', generic: 'clopidogrel', contraindications: ['Active pathological bleeding'], category: 'Cardiovascular', dosageForm: 'Tablet', strength: '75 mg', stock: 90, unit: 'tablet', reorderLevel: 100, pricePerUnit: 0.4, route: 'PO' },
  { id: 'med-16', name: 'Furosemide', genericName: 'Furosemide', generic: 'furosemide', contraindications: ['Anuria'], category: 'Cardiovascular', dosageForm: 'Injection', strength: '40 mg ampoule', stock: 150, unit: 'ampoule', reorderLevel: 50, pricePerUnit: 0.9, route: 'IV' },
  { id: 'med-17', name: 'Omeprazole', genericName: 'Omeprazole', generic: 'omeprazole', contraindications: [], category: 'Gastrointestinal', dosageForm: 'Capsule', strength: '20 mg', stock: 700, unit: 'capsule', reorderLevel: 250, pricePerUnit: 0.1, route: 'PO' },
  { id: 'med-18', name: 'Diazepam', genericName: 'Diazepam', generic: 'diazepam', contraindications: ['Severe respiratory insufficiency', 'Sleep apnoea'], category: 'Sedative', dosageForm: 'Injection', strength: '10 mg/2 mL', stock: 45, unit: 'ampoule', reorderLevel: 20, pricePerUnit: 1.4, route: 'IV', controlled: true },
  { id: 'med-12', name: 'Amoxicillin', genericName: 'Amoxicillin', generic: 'amoxicillin', contraindications: ['Penicillin allergy'], category: 'Antibiotic', dosageForm: 'Oral suspension', strength: '250 mg/5 mL', stock: 64, unit: 'bottle', reorderLevel: 40, pricePerUnit: 3.1, route: 'PO', batch: 'AM-0932', expiry: '2026-11-30', supplier: 'EPSS' },
]

const prescriptionSeed = (): Prescription[] => [
  { id: 'RX-3101', patientId: 'p1001', prescriber: 'Dr. Maya Chen', department: 'emergency', createdAt: ago(40), priority: 'STAT', status: 'Pending', diagnosis: 'Suspected acute coronary syndrome', items: [{ medicationId: 'med-3', dosage: '2.5 mg', frequency: 'Every 4 h as needed', duration: '24 h', quantity: 4 }, { medicationId: 'med-5', dosage: '25 mg', frequency: 'Twice daily', duration: '30 days', quantity: 60 }] },
  { id: 'RX-3102', patientId: 'p1002', prescriber: 'Dr. Maya Chen', department: 'emergency', createdAt: ago(70), priority: 'Urgent', status: 'Dispensed', diagnosis: 'Open distal forearm fracture', dispensedBy: 'Nina Wallace, PharmD', items: [{ medicationId: 'med-4', dosage: '1 g', frequency: 'Once daily', duration: '3 days', quantity: 3 }] },
  { id: 'RX-3103', patientId: 'p1013', prescriber: 'Dr. Hannah Reid', department: 'obgyn', createdAt: ago(18), priority: 'Urgent', status: 'Verified', diagnosis: 'Postpartum hypertension', verifiedBy: 'Nina Wallace, PharmD', items: [{ medicationId: 'med-11', dosage: '200 mg', frequency: 'Twice daily', duration: '7 days', quantity: 14 }] },
  { id: 'RX-3104', patientId: 'p1006', prescriber: 'Dr. Isaac Green', department: 'pediatrics', createdAt: ago(12), priority: 'Routine', status: 'Pending', diagnosis: 'Acute otitis media', items: [{ medicationId: 'med-12', dosage: '250 mg', frequency: 'Three times daily', duration: '5 days', quantity: 1 }, { medicationId: 'med-1', dosage: '240 mg', frequency: 'Every 6 h as needed', duration: '3 days', quantity: 12 }] },
  { id: 'RX-3106', patientId: 'p1014', prescriber: 'Dr. Leo Park', department: 'internal-medicine', createdAt: ago(D + 6 * H), priority: 'Urgent', status: 'Dispensed', diagnosis: 'Community-acquired pneumonia', verifiedBy: 'Nina Wallace, PharmD', dispensedBy: 'Nina Wallace, PharmD', items: [{ medicationId: 'med-4', dosage: '1 g IV', frequency: 'Once daily', duration: '5 days', quantity: 5 }], administrations: [{ at: ago(D + 5 * H), by: 'Medical 5N nurse' }, { at: ago(5 * H), by: 'Medical 5N nurse' }] },
  { id: 'RX-3107', patientId: 'p1014', prescriber: 'Dr. Leo Park', department: 'internal-medicine', createdAt: ago(D + 6 * H), priority: 'Routine', status: 'Dispensed', diagnosis: 'Fever', verifiedBy: 'Nina Wallace, PharmD', dispensedBy: 'Nina Wallace, PharmD', items: [{ medicationId: 'med-1', dosage: '1 g', frequency: 'Every 6 h', duration: '5 days', quantity: 20 }], administrations: [{ at: ago(D + 5 * H), by: 'Medical 5N nurse' }, { at: ago(23 * H), by: 'Medical 5N nurse' }, { at: ago(17 * H), by: 'Medical 5N nurse' }, { at: ago(11 * H), by: 'Medical 5N nurse' }, { at: ago(5 * H), by: 'Medical 5N nurse' }] },
  { id: 'RX-3108', patientId: 'p1010', prescriber: 'Dr. Peter Hall', department: 'ward', createdAt: ago(3 * D), priority: 'Urgent', status: 'Dispensed', diagnosis: 'COPD exacerbation', verifiedBy: 'Nina Wallace, PharmD', dispensedBy: 'Nina Wallace, PharmD', items: [{ medicationId: 'med-7', dosage: '5 mg nebulised', frequency: 'Every 4 h', duration: '3 days', quantity: 18 }], administrations: [3 * D - 60, 3 * D - 300, 2 * D + 18 * H, 2 * D + 14 * H, 2 * D + 10 * H, 2 * D + 6 * H, D + 20 * H, D + 14 * H, D + 8 * H, D + 2 * H, 20 * H, 12 * H].map((minutes) => ({ at: ago(minutes), by: 'Ward 5S nurse' })) },
  { id: 'RX-3109', patientId: 'p1008', prescriber: 'Dr. Amir Rahman', department: 'cardiology', createdAt: ago(1500), priority: 'Urgent', status: 'Dispensed', diagnosis: 'NSTEMI after PCI', verifiedBy: 'Nina Wallace, PharmD', dispensedBy: 'Nina Wallace, PharmD', items: [{ medicationId: 'med-14', dosage: '81 mg', frequency: 'Once daily', duration: '12 months', quantity: 30 }, { medicationId: 'med-15', dosage: '75 mg', frequency: 'Once daily', duration: '12 months', quantity: 30 }], administrations: [{ at: ago(1440), by: 'CCU nurse' }, { at: ago(60), by: 'CCU nurse' }] },
  { id: 'RX-3105', patientId: 'p1010', prescriber: 'Dr. Peter Hall', department: 'ward', createdAt: ago(55), priority: 'Routine', status: 'Pending', diagnosis: 'COPD exacerbation — discharge', items: [{ medicationId: 'med-7', dosage: '2 puffs', frequency: 'As needed', duration: '30 days', quantity: 2 }] },
]

const invoiceSeed = (): Invoice[] => [
  { id: 'INV-24001', patientId: 'p1012', issuedAt: ago(2880), dueAt: ago(-40320), status: 'Paid', paidAt: ago(1440), insuranceProvider: 'BlueCross BlueShield', claimId: 'CLM-789456', tax: 104.4, discount: 290, insuranceCovered: 1120, items: [
    { id: 'b1', description: 'Inpatient admission — cellulitis', code: '99223', category: 'Consultation', quantity: 1, unitPrice: 480 },
    { id: 'b2', description: 'Room and nursing (5 days)', code: '99231', category: 'Room & nursing', quantity: 5, unitPrice: 160 },
    { id: 'b3', description: 'IV flucloxacillin course', code: 'J0690', category: 'Pharmacy', quantity: 1, unitPrice: 225 },
  ] },
  { id: 'INV-24002', patientId: 'p1002', issuedAt: ago(70), dueAt: ago(-43200), status: 'Claim submitted', insuranceProvider: 'Aetna', claimId: 'CLM-456789', tax: 42.35, discount: 158.82, insuranceCovered: 309.7, items: [
    { id: 'b4', description: 'Emergency department visit — level 4', code: '99284', category: 'Consultation', quantity: 1, unitPrice: 320 },
    { id: 'b5', description: 'X-ray right forearm', code: '73090', category: 'Radiology', quantity: 1, unitPrice: 180 },
    { id: 'b6', description: 'Ceftriaxone 1 g IV', code: 'J0696', category: 'Pharmacy', quantity: 7, unitPrice: 4.2 },
  ] },
  { id: 'INV-24003', patientId: 'p1005', issuedAt: ago(2800), dueAt: ago(-40000), status: 'Pending', insuranceProvider: 'Medicare', tax: 1288.8, discount: 8055, insuranceCovered: 7007.85, items: [
    { id: 'b7', description: 'Total hip arthroplasty', code: '27130', category: 'Procedure', quantity: 1, unitPrice: 12500 },
    { id: 'b8', description: 'Post-operative room and nursing (3 days)', code: '99231', category: 'Room & nursing', quantity: 3, unitPrice: 850 },
    { id: 'b9', description: 'Physiotherapy sessions', code: '97110', category: 'Procedure', quantity: 6, unitPrice: 120 },
    { id: 'b10', description: 'Discharge medicines', code: '99070', category: 'Pharmacy', quantity: 1, unitPrice: 340 },
  ] },
  { id: 'INV-24004', patientId: 'p1010', issuedAt: ago(48000), dueAt: ago(4800), status: 'Overdue', insuranceProvider: 'Cigna', claimId: 'CLM-789012', tax: 328.8, discount: 1644, insuranceCovered: 2096.1, items: [
    { id: 'b11', description: 'Inpatient admission — COPD exacerbation', code: '99223', category: 'Consultation', quantity: 1, unitPrice: 480 },
    { id: 'b12', description: 'Room and nursing (3 days)', code: '99231', category: 'Room & nursing', quantity: 3, unitPrice: 850 },
    { id: 'b13', description: 'Nebuliser treatments', code: '94640', category: 'Procedure', quantity: 12, unitPrice: 65 },
    { id: 'b14', description: 'Portable chest X-ray', code: '71045', category: 'Radiology', quantity: 2, unitPrice: 150 },
  ] },
]

const appointmentSeed = (): Appointment[] => [
  { id: 'APT-501', patientId: 'p1013', clinician: 'Dr. Hannah Reid', department: 'obgyn', startsAt: ago(6), durationMinutes: 30, mode: 'Video', status: 'In progress', reason: 'Postpartum blood pressure review' },
  { id: 'APT-502', patientId: 'p1001', clinician: 'Dr. Amir Rahman', department: 'cardiology', startsAt: ago(-120), durationMinutes: 30, mode: 'Video', status: 'Scheduled', reason: 'Post-ACS follow-up and medication review' },
  { id: 'APT-503', patientId: 'p1003', clinician: 'Dr. Tomas Reid', department: 'neurology', startsAt: ago(-1440), durationMinutes: 45, mode: 'Video', status: 'Scheduled', reason: 'Stroke follow-up and NIHSS reassessment' },
  { id: 'APT-504', patientId: 'p1008', clinician: 'Dr. Amir Rahman', department: 'cardiology', startsAt: ago(-2880), durationMinutes: 30, mode: 'Video', status: 'Scheduled', reason: 'Post-PCI follow-up and echo review' },
  { id: 'APT-505', patientId: 'p1005', clinician: 'Ms. Keiko Sato', department: 'surgery', startsAt: ago(150), durationMinutes: 30, mode: 'In person', status: 'Completed', reason: 'Post-operative hip review' },
]

const staffSeed = (): StaffMember[] => [
  { id: 'ST-01', roleId: 'physician', name: 'Dr. Maya Chen', role: 'Physician', department: 'emergency', specialty: 'Emergency medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'EMG-001', email: 'maya.chen@northstar.example', phone: 'x2101', license: 'MD-448210' },
  { id: 'ST-02', roleId: 'nurse', name: 'Sarah Okafor, RN', role: 'Charge nurse', department: 'emergency', specialty: 'Triage nursing', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'TRI-001', email: 'sarah.okafor@northstar.example', phone: 'x2102', license: 'RN-220931' },
  { id: 'ST-03', roleId: 'consultant', name: 'Dr. Amir Rahman', role: 'Consultant', department: 'cardiology', specialty: 'Interventional cardiology', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'CAR-001', email: 'amir.rahman@northstar.example', phone: 'x2241', license: 'MD-391044' },
  { id: 'ST-04', roleId: 'diagnostics', name: 'Dr. Leah Morgan', role: 'Radiologist', department: 'radiology', specialty: 'Diagnostic radiology', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'RAD-001', email: 'leah.morgan@northstar.example', phone: 'x2321', license: 'MD-402876' },
  { id: 'ST-05', roleId: 'coordinator', name: 'Jon Bell', role: 'Patient flow coordinator', department: 'ward', specialty: 'Bed management', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'BED-001', email: 'jon.bell@northstar.example', phone: 'x2521', license: '—' },
  { id: 'ST-06', roleId: 'pharmacist', name: 'Nina Wallace, PharmD', role: 'Pharmacist', department: 'pharmacy', specialty: 'Clinical pharmacy', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'PHA-001', email: 'nina.wallace@northstar.example', phone: 'x2581', license: 'PH-118302' },
  { id: 'ST-07', name: 'Dr. Ana Costa', role: 'Consultant', department: 'icu', specialty: 'Critical care', shift: 'Evening · 15:00–23:00', onDuty: false, pager: 'ICU-001', email: 'ana.costa@northstar.example', phone: 'x2401', license: 'MD-377210' },
  { id: 'ST-08', name: 'Ms. Keiko Sato', role: 'Surgeon', department: 'surgery', specialty: 'Orthopaedic surgery', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'SUR-001', email: 'keiko.sato@northstar.example', phone: 'x2461', license: 'MD-365519' },
  { id: 'ST-09', name: 'Dr. Tomas Reid', role: 'Consultant', department: 'neurology', specialty: 'Stroke medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'NEU-001', email: 'tomas.reid@northstar.example', phone: 'x2281', license: 'MD-410983' },
  { id: 'ST-10', name: 'Dr. Hannah Reid', role: 'Physician', department: 'obgyn', specialty: 'Obstetrics', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'OBS-001', email: 'hannah.reid@northstar.example', phone: 'x2641', license: 'MD-428801' },
  { id: 'ST-11', name: 'Dr. Felix Adeyemi', role: 'Pathologist', department: 'laboratory', specialty: 'Clinical biochemistry', shift: 'Night · 23:00–07:00', onDuty: false, pager: 'LAB-002', email: 'felix.adeyemi@northstar.example', phone: 'x2352', license: 'MD-399127' },
]

const extraStaff = (): StaffMember[] => [
  { id: 'ST-18', name: 'Dr. Selam Bekele', role: 'Medical officer', department: 'internal-medicine', specialty: 'General medicine', shift: 'Day · 07:00–15:00', onDuty: false, pager: 'MED-021', email: 'selam.bekele@northstar.example', phone: 'x2690', license: 'Not yet verified', status: 'Pending approval', roleId: 'physician' },
  { id: 'ST-12', roleId: 'intern', name: 'Dr. Leo Park', role: 'Foundation doctor', department: 'internal-medicine', specialty: 'General medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'MED-014', email: 'leo.park@northstar.example', phone: 'x2684', license: 'MD-501877' },
  { id: 'ST-13', roleId: 'receptionist', name: 'Grace Mwangi', role: 'Front desk coordinator', department: 'emergency', specialty: 'Registration', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'REG-001', email: 'grace.mwangi@northstar.example', phone: 'x2001', license: '—' },
  { id: 'ST-14', roleId: 'theatre', name: 'Dr. Ines Duarte', role: 'Anaesthetist', department: 'surgery', specialty: 'Anaesthesia', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'ANA-001', email: 'ines.duarte@northstar.example', phone: 'x2471', license: 'MD-377901' },
  { id: 'ST-15', roleId: 'allied', name: 'Sam Oduya, PT', role: 'Physiotherapist', department: 'ward', specialty: 'Rehabilitation', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'PHY-001', email: 'sam.oduya@northstar.example', phone: 'x2533', license: 'PT-220144' },
  { id: 'ST-16', roleId: 'billing', name: 'Priya Desai', role: 'Billing officer', department: 'emergency', specialty: 'Patient accounts', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'FIN-001', email: 'priya.desai@northstar.example', phone: 'x2090', license: '—' },
  { id: 'ST-19', name: 'Dr. Mahlet Assefa', role: 'Consultant oncologist', department: 'oncology', specialty: 'Medical oncology', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'ONC-001', email: 'mahlet.assefa@northstar.example', phone: 'x2721', license: 'MD-402118' },
  { id: 'ST-17', roleId: 'administrator', name: 'Elena Rossi', role: 'Hospital administrator', department: 'emergency', specialty: 'Operations', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'ADM-001', email: 'elena.rossi@northstar.example', phone: 'x2000', license: '—' },
]

const codeSeed = (): EmergencyCode[] => [
  { id: 'code-blue', label: 'Code Blue', description: 'Adult cardiac or respiratory arrest', responders: 'Resuscitation team, ICU outreach', tone: 'blue', active: false },
  { id: 'code-trauma', label: 'Code Trauma', description: 'Level 1 trauma activation', responders: 'Trauma team, theatre, radiology', tone: 'trauma', active: true, location: 'Emergency · Resus bay 1', activatedAt: ago(3), activatedBy: 'EMS dispatch' },
  { id: 'code-stroke', label: 'Code Stroke', description: 'Hyperacute stroke pathway', responders: 'Stroke team, CT, laboratory', tone: 'stroke', active: false },
  { id: 'code-stemi', label: 'Code STEMI', description: 'Primary PCI activation', responders: 'Cardiology, cath lab', tone: 'stemi', active: false },
  { id: 'code-red', label: 'Code Red', description: 'Fire or smoke on site', responders: 'Fire warden, security, estates', tone: 'red', active: false },
  { id: 'code-amber', label: 'Code Amber', description: 'Missing or abducted child', responders: 'Security, paediatrics, maternity', tone: 'amber', active: false },
]

const wardSeed = (): Ward[] => [
  { id: 'ED', name: 'Emergency treatment', department: 'emergency', beds: 12 },
  { id: 'CCU', name: 'Cardiac care unit', department: 'cardiology', beds: 8 },
  { id: 'STR', name: 'Stroke unit', department: 'neurology', beds: 6 },
  { id: 'ICU', name: 'ICU and HDU', department: 'icu', beds: 8 },
  { id: 'S3B', name: 'Surgical 3B', department: 'surgery', beds: 14 },
  { id: 'W5S', name: 'Ward 5S', department: 'ward', beds: 16 },
  { id: 'M5N', name: 'Medical 5N', department: 'internal-medicine', beds: 14 },
  { id: 'MAT', name: 'Maternity 3S', department: 'obgyn', beds: 10 },
  { id: 'PAE', name: "Children's ward", department: 'pediatrics', beds: 8 },
  { id: 'ONC', name: 'Oncology unit', department: 'oncology', beds: 8 },
]

const bedSeed = (wards: Ward[]): Bed[] => {
  const occupied: Record<string, string> = { 'ED-02': 'p1001', 'ED-08': 'p1002', 'ED-04': 'p1004', 'CCU-06': 'p1008', 'STR-01': 'p1003', 'ICU-03': 'p1007', 'S3B-12': 'p1005', 'W5S-12': 'p1010', 'MAT-05': 'p1013', 'M5N-08': 'p1014', 'ONC-02': 'p1020', 'PAE-03': 'p1018', 'MAT-02': 'p1019' }
  const states: Record<string, Bed['state']> = { 'ED-01': 'Cleaning', 'ICU-01': 'Reserved', 'ICU-02': 'Blocked', 'W5S-03': 'Cleaning', 'S3B-04': 'Out of service', 'M5N-02': 'Cleaning', 'CCU-02': 'Reserved' }
  return wards.flatMap((ward) => Array.from({ length: ward.beds }, (_, index) => {
    const id = `${ward.id}-${String(index + 1).padStart(2, '0')}`
    return { id, wardId: ward.id, number: index + 1, state: states[id] ?? 'Available', patientId: occupied[id] }
  }))
}

const obs = (minutes: number, by: string, changes: Partial<Vitals>, onOxygen = false, consciousness: ObservationSet['consciousness'] = 'Alert'): ObservationSet => ({ ...baseVitals, ...changes, at: ago(minutes), by, onOxygen, consciousness })

const H = 60
const D = 1440
/** Observation series: [minutes ago, context, changes, on oxygen?], newest first after sorting. */
const series = (by: Record<string, string>, points: Array<[number, ObservationSet['context'], Partial<Vitals>, boolean?]>) =>
  points.map(([minutes, context, changes, oxygen]) => ({ ...obs(minutes, by[context ?? 'Bedside'] ?? by.Bedside, changes, oxygen ?? false), context })).sort((a, b) => b.at.localeCompare(a.at))

const observationSeed: Record<string, ObservationSet[]> = {
  p1001: series({ Triage: 'Sarah Okafor, RN', Bedside: 'Sarah Okafor, RN' }, [[46, 'Triage', { hr: 112, rr: 24, spo2: 94, bpSys: 162, bpDia: 96, temp: 36.9, pain: 8 }], [20, 'Bedside', { hr: 108, rr: 22, spo2: 95, bpSys: 158, bpDia: 94, temp: 36.8, pain: 7 }]]),
  p1004: series({ Triage: 'Sarah Okafor, RN', Bedside: 'Sarah Okafor, RN' }, [[39, 'Triage', { hr: 118, rr: 26, spo2: 91, bpSys: 128, bpDia: 80, temp: 37.0, pain: 4 }], [10, 'Bedside', { hr: 124, rr: 28, spo2: 92, bpSys: 132, bpDia: 82, temp: 37.1, pain: 4 }, true]]),
  p1007: series({ Triage: 'Sarah Okafor, RN', Bedside: 'ICU outreach', 'Ward round': 'Dr. Ana Costa' }, [
    [8 * H + 30, 'Triage', { hr: 128, rr: 26, spo2: 94, bpSys: 92, bpDia: 54, temp: 39.2, pain: 4 }],
    [6 * H, 'Bedside', { hr: 126, rr: 24, spo2: 95, bpSys: 94, bpDia: 56, temp: 39.0, pain: 3 }, true],
    [150, 'Ward round', { hr: 124, rr: 24, spo2: 95, bpSys: 96, bpDia: 58, temp: 38.9, pain: 3 }, true],
    [30, 'Bedside', { hr: 118, rr: 22, spo2: 96, bpSys: 102, bpDia: 62, temp: 38.6, pain: 3 }, true],
  ]),
  p1008: series({ Triage: 'Sarah Okafor, RN', Bedside: 'CCU nurse', 'Ward round': 'Dr. Amir Rahman' }, [
    [1560, 'Triage', { hr: 98, rr: 20, spo2: 96, bpSys: 148, bpDia: 90, temp: 36.8, pain: 7 }],
    [1200, 'Bedside', { hr: 84, rr: 18, spo2: 97, bpSys: 136, bpDia: 80, temp: 36.9, pain: 2 }],
    [780, 'Bedside', { hr: 78, rr: 16, spo2: 97, bpSys: 130, bpDia: 76, temp: 36.7, pain: 1 }],
    [300, 'Ward round', { hr: 74, rr: 16, spo2: 97, bpSys: 128, bpDia: 74, temp: 36.6, pain: 0 }],
    [90, 'Bedside', { hr: 72, rr: 16, spo2: 97, bpSys: 128, bpDia: 72, temp: 36.7, pain: 0 }],
  ]),
  p1010: series({ Triage: 'Sarah Okafor, RN', Bedside: 'Ward 5S nurse', 'Ward round': 'Dr. Peter Hall' }, [
    [3 * D + 4 * H, 'Triage', { hr: 112, rr: 28, spo2: 86, bpSys: 150, bpDia: 88, temp: 37.8, pain: 3 }],
    [3 * D, 'Bedside', { hr: 108, rr: 26, spo2: 88, bpSys: 146, bpDia: 86, temp: 37.6, pain: 3 }, true],
    [2 * D + 16 * H, 'Bedside', { hr: 104, rr: 25, spo2: 89, bpSys: 144, bpDia: 84, temp: 37.5, pain: 2 }, true],
    [2 * D + 2 * H, 'Ward round', { hr: 102, rr: 24, spo2: 90, bpSys: 142, bpDia: 84, temp: 37.4, pain: 2 }, true],
    [D + 18 * H, 'Bedside', { hr: 100, rr: 23, spo2: 90, bpSys: 140, bpDia: 82, temp: 37.3, pain: 2 }, true],
    [D + 2 * H, 'Ward round', { hr: 98, rr: 22, spo2: 91, bpSys: 142, bpDia: 84, temp: 37.2, pain: 2 }, true],
    [12 * H, 'Bedside', { hr: 96, rr: 21, spo2: 92, bpSys: 140, bpDia: 82, temp: 37.0, pain: 2 }],
    [4 * H, 'Ward round', { hr: 92, rr: 20, spo2: 93, bpSys: 138, bpDia: 80, temp: 36.9, pain: 2 }],
  ]),
  p1013: series({ Triage: 'Alicia Moore, RM', Bedside: 'Alicia Moore, RM', 'Ward round': 'Dr. Hannah Reid' }, [
    [190, 'Triage', { hr: 98, rr: 18, spo2: 98, bpSys: 168, bpDia: 106, temp: 36.9, pain: 6 }],
    [130, 'Bedside', { hr: 96, rr: 18, spo2: 98, bpSys: 166, bpDia: 104, temp: 36.9, pain: 5 }],
    [42, 'Ward round', { hr: 96, rr: 18, spo2: 98, bpSys: 164, bpDia: 102, temp: 36.9, pain: 5 }],
  ]),
  p1014: series({ Triage: 'Sarah Okafor, RN', Bedside: 'Medical 5N nurse', 'Ward round': 'Dr. Leo Park' }, [
    [D + 8 * H, 'Triage', { hr: 106, rr: 24, spo2: 92, bpSys: 124, bpDia: 74, temp: 38.4, pain: 3 }],
    [D + 2 * H, 'Bedside', { hr: 102, rr: 22, spo2: 94, bpSys: 122, bpDia: 72, temp: 37.9, pain: 3 }, true],
    [20 * H, 'Bedside', { hr: 98, rr: 21, spo2: 95, bpSys: 124, bpDia: 74, temp: 37.6, pain: 2 }, true],
    [5 * H, 'Bedside', { hr: 110, rr: 25, spo2: 91, bpSys: 112, bpDia: 68, temp: 38.7, pain: 3 }, true],
    [3 * H, 'Ward round', { hr: 108, rr: 24, spo2: 92, bpSys: 114, bpDia: 70, temp: 38.5, pain: 3 }, true],
    [60, 'Bedside', { hr: 104, rr: 23, spo2: 93, bpSys: 118, bpDia: 70, temp: 38.2, pain: 3 }, true],
  ]),
}

const st = (minutes: number, by: string) => ({ id: uid('CH'), at: ago(minutes), by })

const labourSeed = (): LabourEntry[] => {
  const by = 'Alicia Moore, RM'
  const entries: LabourEntry[] = []
  for (let m = 340; m >= 10; m -= 30) {
    const t = 340 - m
    const oxy = m <= 80
    const entry: LabourEntry = {
      ...st(m, by),
      fhr: [138, 142, 136, 140, 144, 138, 146, 142, 148, 140, 136, 144][Math.round(t / 30)] ?? 140,
      contractions: m > 220 ? 2 : m > 100 ? 3 : oxy ? 4 : 3,
      contractionSeconds: m > 220 ? 18 : m > 100 ? 30 : oxy ? 45 : 35,
      ...(oxy ? { oxytocinDrops: m <= 40 ? 20 : 10 } : {}),
    }
    if (m === 340 || m === 220 || m === 100) Object.assign(entry, { dilationCm: m === 340 ? 4 : m === 220 ? 5 : 6, descentFifths: m === 340 ? 4 : 3, liquor: m === 340 ? 'I' : 'C', moulding: m === 100 ? '+' : '0', pulse: m === 100 ? 96 : 88, bpSys: m === 100 ? 124 : 118, bpDia: m === 100 ? 80 : 76, temp: 37.0, urine: m === 220 ? 'Protein –, acetone –, 150 ml' : undefined })
    else if (m % 60 === 40) Object.assign(entry, { pulse: 88 + (t % 7), })
    entries.push(entry)
  }
  return entries.sort((a, b) => a.at.localeCompare(b.at))
}

const samDays: Array<[number, SamEntry['phase'], number, SamEntry['oedema'], number | undefined, number, SamEntry['feed'], number, SamEntry['appetite'], string[]]> = [
  [8, 'Stabilisation', 9.1, '++', 10.8, 35.4, 'F-75', 6, 'Fail', ['Hypoglycaemia on admission — treated with 10% glucose']],
  [7, 'Stabilisation', 8.7, '++', undefined, 36.4, 'F-75', 7, 'Not done', []],
  [6, 'Stabilisation', 8.4, '+', undefined, 36.6, 'F-75', 8, 'Not done', []],
  [5, 'Transition', 8.1, '+', undefined, 36.7, 'RUTF', 8, 'Pass', []],
  [4, 'Transition', 7.9, '0', 10.9, 36.8, 'RUTF', 8, 'Pass', []],
  [3, 'Rehabilitation', 7.95, '0', undefined, 36.7, 'RUTF', 6, 'Pass', []],
  [2, 'Rehabilitation', 8.05, '0', undefined, 36.6, 'RUTF', 6, 'Pass', []],
  [1, 'Rehabilitation', 8.2, '0', 11.1, 36.6, 'RUTF', 6, 'Pass', []],
]

const chartSeed = (): Record<string, PatientCharts> => ({
  p1003: {
    neuro: [
      { ...st(30, 'Sarah Okafor, RN'), eye: 4, verbal: 3, motor: 6, pupilL: 3, pupilR: 3, reactL: 'Brisk', reactR: 'Brisk', limbs: { la: 5, ra: 2, ll: 5, rl: 3 }, bpSys: 178, hr: 92 },
      { ...st(18, 'Stroke nurse'), eye: 4, verbal: 3, motor: 6, pupilL: 3, pupilR: 3, reactL: 'Brisk', reactR: 'Brisk', limbs: { la: 5, ra: 2, ll: 5, rl: 3 }, bpSys: 172, hr: 90 },
      { ...st(6, 'Stroke nurse'), eye: 3, verbal: 3, motor: 6, pupilL: 3, pupilR: 3, reactL: 'Brisk', reactR: 'Brisk', limbs: { la: 5, ra: 2, ll: 5, rl: 3 }, bpSys: 168, hr: 88 },
    ],
    nihss: [{ ...st(28, 'Dr. Tomas Reid'), items: { '1a': 0, '1b': 1, '1c': 0, '2': 1, '3': 0, '4': 2, '5a': 0, '5b': 3, '6a': 0, '6b': 2, '7': 0, '8': 1, '9': 1, '10': 0, '11': 0 }, total: 11 }],
  },
  p1018: {
    sam: samDays.map(([days, phase, weightKg, oedema, muacCm, temp, feed, feedsPlanned, appetite, complications]) => ({ ...st(days * 1440 - 180, 'Megan Shaw, RN'), phase, weightKg, oedema, muacCm, temp, feed, feedsPlanned, feedsTaken: days === 8 ? 5 : feedsPlanned, appetite, complications })),
    fluids: [{ ...st(300, 'Megan Shaw, RN'), direction: 'In', route: 'Oral RUTF + water', ml: 250 }, { ...st(180, 'Megan Shaw, RN'), direction: 'Out', route: 'Urine (nappy weight)', ml: 120 }],
  },
  p1019: { labour: labourSeed(), anc: [{ ...st(390, 'Alicia Moore, RM'), gaWeeks: 39, weightKg: 68, bpSys: 118, bpDia: 76, fundalCm: 37, fhr: 140, presentation: 'Cephalic', urineProtein: '-', hb: 11.6 }] },
  p1017: {
    anc: ([[12, 58, 108, 68, undefined, undefined, '-', 11.8], [20, 61, 110, 70, 20, 148, '-', undefined], [26, 63.5, 112, 70, 26, 150, '-', 10.6], [30, 65, 116, 72, 28, 146, 'Trace', undefined], [32, 66, 118, 72, 31, 148, '-', 11.2]] as Array<[number, number, number, number, number | undefined, number | undefined, AncVisit['urineProtein'], number | undefined]>)
      .map(([gaWeeks, weightKg, bpSys, bpDia, fundalCm, fhr, urineProtein, hb]) => ({ ...st(gaWeeks === 32 ? 10 : (32 - gaWeeks) * 7 * 1440, gaWeeks === 32 ? 'Alicia Moore, RM' : 'ANC midwife'), gaWeeks, weightKg, bpSys, bpDia, fundalCm, fhr, presentation: gaWeeks >= 30 ? 'Cephalic' : undefined, urineProtein, hb, note: gaWeeks === 26 ? 'Iron and folic acid started.' : undefined })),
  },
  p1013: {
    postpartum: [
      { ...st(185, 'Alicia Moore, RM'), uterus: 'Well contracted', lochia: 'Moderate', padsSoaked: 1, bloodLossMl: 150, pulse: 98, bpSys: 166, bpDia: 104 },
      { ...st(125, 'Alicia Moore, RM'), uterus: 'Well contracted', lochia: 'Moderate', padsSoaked: 1, bloodLossMl: 100, pulse: 96, bpSys: 164, bpDia: 102 },
      { ...st(65, 'Alicia Moore, RM'), uterus: 'Well contracted', lochia: 'Light', padsSoaked: 1, bloodLossMl: 80, pulse: 96, bpSys: 162, bpDia: 100 },
      { ...st(20, 'Alicia Moore, RM'), uterus: 'Well contracted', lochia: 'Light', bloodLossMl: 40, pulse: 94, bpSys: 160, bpDia: 100 },
    ],
  },
  p1014: {
    glucose: ([[1800, 232, 'Admission'], [1560, 198, 'Before lunch'], [1320, 176, 'Before dinner'], [1080, 164, 'Bedtime'], [780, 188, 'Fasting'], [540, 214, 'Before lunch'], [300, 196, 'Before dinner'], [190, 256, 'Bedtime']] as Array<[number, number, string]>)
      .map(([minutes, mgdl, timing]) => ({ ...st(minutes, 'Medical 5N nurse'), mgdl, timing, insulinUnits: mgdl > 200 ? 4 : undefined })),
    fluids: ([[1500, 'In', 'IV 0.9% saline', 1000], [1440, 'In', 'Oral', 300], [1380, 'Out', 'Urine', 350], [1200, 'In', 'Oral', 250], [1100, 'Out', 'Urine', 300], [900, 'Out', 'Urine', 250], [720, 'In', 'IV 0.9% saline', 1000], [600, 'In', 'Oral', 200], [480, 'Out', 'Urine', 200], [360, 'In', 'Oral', 300], [240, 'Out', 'Urine', 150], [120, 'In', 'Oral', 150], [60, 'Out', 'Urine', 120]] as Array<[number, FluidEntry['direction'], string, number]>)
      .map(([minutes, direction, route, ml]) => ({ ...st(minutes, 'Medical 5N nurse'), direction, route, ml })),
  },
})

const round = (minutes: number, by: string, status: RoundNote['status'], subjective: string, examination: string, assessment: string, plan: string): RoundNote => ({ id: uid('RN'), at: ago(minutes), by, status, subjective, examination, assessment, plan })

const roundSeed: Record<string, RoundNote[]> = {
  p1010: [
    round(4 * H, 'Dr. Peter Hall', 'Improving', 'Breathing much easier, walked to the bathroom unaided.', 'Scattered wheeze only, no accessory muscle use. SpO₂ 93% on air.', 'COPD exacerbation, day 3, responding to treatment.', 'Stop oxygen. Inhaler technique review, home oxygen assessment, plan discharge tomorrow.'),
    round(D + 2 * H, 'Dr. Peter Hall', 'Improving', 'Less breathless, sputum clearer.', 'Bilateral wheeze, reduced. SpO₂ 91% on 1 L.', 'Improving exacerbation on prednisolone and nebulisers.', 'Wean nebulisers to inhalers. Continue antibiotics day 3 of 5.'),
    round(2 * D + 2 * H, 'Dr. Peter Hall', 'Stable', 'Tired, breathless on minimal exertion.', 'Widespread wheeze, prolonged expiration. SpO₂ 90% on 2 L.', 'Infective COPD exacerbation, day 1 on the ward.', 'Target SpO₂ 88–92%. Nebulisers 4-hourly, oral steroids, amoxicillin. Repeat gas if drowsy.'),
  ],
  p1014: [
    round(3 * H, 'Dr. Leo Park', 'Deteriorating', 'Rigors overnight, more breathless.', 'Coarse crackles right base, new bronchial breathing. SpO₂ 92% on 2 L. Glucose 14.2.', 'Pneumonia not settling at 24 h; CURB-65 2.', 'Escalate antibiotics, repeat chest X-ray and bloods, sliding-scale review with diabetes team.'),
    round(D + 2 * H, 'Dr. Leo Park', 'Stable', 'Productive cough, eating a little.', 'Crackles right base. SpO₂ 94% on 2 L.', 'Community-acquired pneumonia, day 1.', 'IV ceftriaxone, fluids, 4-hourly observations, diabetic diet referral.'),
  ],
  p1008: [
    round(300, 'Dr. Amir Rahman', 'Improving', 'No chest pain overnight.', 'Radial site clean, no haematoma. Heart sounds normal, chest clear.', 'NSTEMI after LAD stent, day 1, uncomplicated.', 'Echo before discharge, continue dual antiplatelets, step down to ward.'),
  ],
}

const theatreSeed = (): TheatreCase[] => [
  { id: 'TC-01', patientId: 'p1003', procedure: 'Mechanical thrombectomy', surgeon: 'Dr. Tomas Reid · Interventional neuroradiology', room: 'Theatre 1', time: '09:30', stage: 2, checklist: [true, true, true, true, true, true], anaesthesia: { asa: 3, technique: 'General anaesthesia', airway: 'Mallampati 2, normal neck movement', by: 'Dr. Ines Duarte', log: [{ at: ago(25), hr: 88, sbp: 142, spo2: 99, note: 'Induction: propofol, rocuronium. ETT 7.5 secured.' }] } },
  { id: 'TC-02', patientId: 'p1002', procedure: 'Open reduction and internal fixation, distal radius', surgeon: 'Ms. Keiko Sato · Orthopaedics', room: 'Theatre 2', time: '11:30', stage: 1, checklist: [true, true, false, false, true, false] },
  { id: 'TC-03', patientId: 'p1005', procedure: 'Wound review under sedation', surgeon: 'Mr. Robert Hale · General surgery', room: 'Theatre 3', time: '14:00', stage: 0, checklist: [false, false, false, false, false, false] },
]

export const defaultSettings = (): FacilitySettings => ({
  name: 'Northstar General',
  type: 'Hospital',
  tagline: 'Unified care platform',
  city: 'Addis Ababa',
  country: 'Ethiopia',
  phone: '',
  email: '',
  currency: 'USD',
  disabledModules: [],
})

const inv = (id: string, name: string, kind: InvestigationItem['kind'], inHouse: boolean, price: number): InvestigationItem => ({ id, name, kind, inHouse, price, active: true })

const investigationSeed = (): InvestigationItem[] => [
  inv('L01', 'Full blood count', 'Laboratory', true, 12),
  inv('L02', 'U&E and creatinine', 'Laboratory', true, 15),
  inv('L03', 'CRP', 'Laboratory', true, 10),
  inv('L04', 'Liver function tests', 'Laboratory', true, 18),
  inv('L05', 'High-sensitivity troponin I', 'Laboratory', true, 35),
  inv('L06', 'Arterial blood gas', 'Laboratory', true, 25),
  inv('L07', 'Blood cultures x2', 'Laboratory', true, 40),
  inv('L08', 'Lactate', 'Laboratory', true, 12),
  inv('L09', 'Coagulation screen', 'Laboratory', true, 20),
  inv('L10', 'Glucose', 'Laboratory', true, 4),
  inv('L11', 'Urinalysis', 'Laboratory', true, 5),
  inv('L12', 'Group and save', 'Laboratory', true, 15),
  inv('L13', 'HbA1c', 'Laboratory', false, 22),
  inv('L14', 'Thyroid function tests', 'Laboratory', false, 30),
  inv('L15', 'Viral load (HIV)', 'Laboratory', false, 60),
  inv('L16', 'Histopathology', 'Laboratory', false, 85),
  inv('I01', 'Chest X-ray', 'Imaging', true, 30),
  inv('I02', 'X-ray limb', 'Imaging', true, 30),
  inv('I03', 'Ultrasound abdomen', 'Imaging', true, 45),
  inv('I04', 'Echocardiogram', 'Imaging', true, 80),
  inv('I05', 'CT head without contrast', 'Imaging', true, 150),
  inv('I06', 'CT pulmonary angiogram', 'Imaging', false, 220),
  inv('I07', 'CT abdomen and pelvis', 'Imaging', false, 240),
  inv('I08', 'MRI brain', 'Imaging', false, 320),
  inv('I09', 'MRI spine', 'Imaging', false, 340),
  inv('I10', 'Mammography', 'Imaging', false, 90),
]

/** Diagnostic providers in Addis Ababa. Contact details are left for the administrator to fill in. */
const providerSeed = (): ExternalProvider[] => [
  { id: 'arsho', name: 'Arsho Advanced Medical Laboratories', services: ['Laboratory'], notes: 'Private medical laboratory', phone: '', address: '', active: true },
  { id: 'icl', name: 'International Clinical Laboratories (ICL)', services: ['Laboratory'], notes: 'Private medical laboratory', phone: '', address: '', active: true },
  { id: 'wudassie', name: 'Wudassie Diagnostic Center', services: ['Imaging', 'Laboratory'], notes: 'Diagnostic imaging centre', phone: '', address: '', active: true },
  { id: 'icmc', name: 'ICMC General Hospital', services: ['Imaging', 'Laboratory'], notes: 'Referral hospital with diagnostic services', phone: '', address: '', active: true },
]

export function createInitialState(): HospitalState {
  const wards = wardSeed()
  const charts = chartSeed()
  const patients = patientSeed().map((patient) => {
    const observations = observationSeed[patient.id]
    const rounds = roundSeed[patient.id]
    const chartData = charts[patient.id]
    const withCharts = chartData ? { ...patient, charts: chartData } : patient
    const withObs = observations ? { ...withCharts, observations, ...(rounds ? { rounds } : {}), vitals: { ...observations[0], at: undefined, by: undefined, onOxygen: undefined, consciousness: undefined } as unknown as Vitals } : withCharts
    if (patient.id === 'p1006') return { ...withObs, weightKg: 24.6, growth: [{ at: ago(1051200), ageYears: 6, weightKg: 20.1, heightCm: 115 }, { at: ago(525600), ageYears: 7, weightKg: 22.0, heightCm: 121 }, { at: ago(27), ageYears: 8, weightKg: 24.6, heightCm: 127 }] }
    if (patient.id === 'p1018') return { ...withObs, weightKg: 8.2, growth: [{ at: ago(8 * 1440 - 120), ageYears: 2, weightKg: 9.1, heightCm: 79, muacCm: 10.8 }, { at: ago(1440), ageYears: 2, weightKg: 8.2, heightCm: 79.5, muacCm: 11.1 }] }
    if (patient.id === 'p1020') return { ...withObs, weightKg: 61, assessments: [{ id: 'SA-4', at: ago(20 * 60), by: 'Dr. Mahlet Assefa', values: { diagnosis: 'Left breast carcinoma', stage: 'III', regimen: 'AC (doxorubicin + cyclophosphamide)', cycle: '4', ecog: '1', anc: '1.6', platelets: '182', toxicity: 'Grade 2' } }] }
    if (patient.id === 'p1002') return { ...withObs, insurance: 'Aetna' }
    if (patient.id === 'p1017') return { ...withObs, assessments: [{ id: 'SA-1', at: ago(50), by: 'Dr. Hannah Reid', values: { lmp: new Date(Date.now() - 32 * 7 * 86_400_000).toISOString().slice(0, 10), gravida: '1', para: '0', fundal: '31', fhr: '148', presentation: 'Cephalic', contractions: '0' } }] }
    if (patient.id === 'p1015') return { ...withObs, assessments: [{ id: 'SA-2', at: ago(30), by: 'Ms. Prianka Shah', values: { r500: '15', r1000: '20', r2000: '20', r4000: '25', l500: '35', l1000: '40', l2000: '45', l4000: '50', otoscopy: 'Effusion' } }] }
    if (patient.id === 'p1008') return { ...withObs, assessments: [{ id: 'SA-3', at: ago(300), by: 'Dr. Amir Rahman', values: { rhythm: 'Sinus rhythm', rate: '72', qtc: '440', ef: '38', nyha: 'II' } }] }
    return withObs
  })
  return {
    patients: patients.map((patient) => {
      // Keep only the eight vital-sign fields on the patient's current vitals.
      const { hr, rr, spo2, bpSys, bpDia, temp, gcs, pain } = patient.vitals
      return { ...patient, vitals: { hr, rr, spo2, bpSys, bpDia, temp, gcs, pain } }
    }),
    departments: departmentSeed.map((department) => ({ ...department, services: [...department.services] })),
    referrals: referralSeed(),
    orders: orderSeed(),
    activities: [
      { id: uid('ac'), at: ago(3), actor: 'EMS dispatch', action: 'activated Code Trauma in Resus bay 1', department: 'emergency' },
      { id: uid('ac'), at: ago(4), actor: 'Dr. Leah Morgan', action: 'started CT angiography for Amina Yusuf', patientId: 'p1003', department: 'radiology' },
      { id: uid('ac'), at: ago(9), actor: 'Sarah Okafor, RN', action: 'completed ESI 4 triage for Zoe Campbell', patientId: 'p1011', department: 'emergency' },
      { id: uid('ac'), at: ago(14), actor: 'Ms. Keiko Sato', action: 'accepted the orthopaedic referral for Mateo Rodriguez', patientId: 'p1002', department: 'surgery' },
      { id: uid('ac'), at: ago(17), actor: 'Jon Bell', action: "completed Nadia Hassan's transfer to HDU 03", patientId: 'p1007', department: 'icu' },
      { id: uid('ac'), at: ago(18), actor: 'Nina Wallace, PharmD', action: 'verified RX-3103 for Hannah Osei', patientId: 'p1013', department: 'pharmacy' },
      { id: uid('ac'), at: ago(24), actor: 'Dr. Maya Chen', action: 'sent an emergent cardiology referral for Evelyn Parker', patientId: 'p1001', department: 'cardiology' },
    ],
    formulary: formularySeed(),
    prescriptions: prescriptionSeed(),
    invoices: invoiceSeed(),
    appointments: appointmentSeed(),
    staff: [...staffSeed(), ...extraStaff()],
    codes: codeSeed(),
    wards,
    beds: bedSeed(wards),
    handovers: [
      { id: 'HO-01', patientId: 'p1004', from: 'Sarah Okafor, RN', to: 'Night charge nurse', note: 'Severe asthma, on back-to-back nebulisers and 2 L oxygen. ICU review requested. Repeat gas due 20:00.', at: ago(35) },
    ] as Handover[],
    pages: [
      { id: 'PG-01', from: 'Sarah Okafor, RN', toStaffId: 'ST-01', message: 'Daniel Kim (ED Bed 04): SpO₂ 92% on oxygen after third nebuliser. Please review.', urgent: true, at: ago(6) },
    ] as Page[],
    theatreCases: theatreSeed(),
    settings: defaultSettings(),
    investigations: investigationSeed(),
    providers: providerSeed(),
    stockMovements: [],
    cosignNotes: [
      { id: 'CN-01', patientId: 'p1014', author: 'Dr. Leo Park', at: ago(95), text: 'Day 2 CAP. Still febrile 38.7, SpO₂ 91% on 2 L. Capillary glucose 14–17. Plan: continue IV antibiotics, start basal insulin, repeat CRP tomorrow, physiotherapy referral.', status: 'Pending review' },
    ] as CosignNote[],
  }
}

export const esiLabels: Record<number, { name: string; description: string; color: string; target: string }> = {
  1: { name: 'Resuscitation', description: 'Immediate life-saving intervention', color: '#b42332', target: 'Immediate' },
  2: { name: 'Emergent', description: 'High-risk or severe distress', color: '#df6b3f', target: '≤ 10 min' },
  3: { name: 'Urgent', description: 'Stable, multiple resources', color: '#d19a26', target: '≤ 30 min' },
  4: { name: 'Less urgent', description: 'Stable, one resource', color: '#3b8791', target: '≤ 60 min' },
  5: { name: 'Non-urgent', description: 'Stable, no resources', color: '#58816c', target: '≤ 120 min' },
}

export function calculateEsi(vitals: Vitals, complaint: string, resources: number, risks: string[]) {
  const text = `${complaint} ${risks.join(' ')}`.toLowerCase()
  const reasons: string[] = []
  let esi: 1 | 2 | 3 | 4 | 5
  if (vitals.gcs <= 8 || vitals.spo2 < 85 || vitals.rr < 7 || /cardiac arrest|unresponsive|not breathing|apnoea|apnea/.test(text)) {
    esi = 1
    if (vitals.gcs <= 8) reasons.push('GCS ≤ 8 requires immediate airway assessment')
    if (vitals.spo2 < 85) reasons.push('Critical oxygen saturation below 85%')
    if (vitals.rr < 7) reasons.push('Respiratory rate below 7/min')
    if (!reasons.length) reasons.push('Immediate life-saving intervention likely')
  } else if (
    vitals.spo2 < 93 || vitals.rr >= 30 || vitals.hr >= 125 || vitals.gcs < 14 || vitals.bpSys < 90 ||
    /chest pain|chest pressure|stroke|weakness|sepsis|neutropenic|anaphylaxis|respiratory distress|overdose|severe asthma/.test(text) ||
    risks.length > 0 || vitals.pain >= 9
  ) {
    esi = 2
    if (vitals.spo2 < 93) reasons.push('SpO₂ below 93% suggests physiological risk')
    if (vitals.rr >= 30) reasons.push('Respiratory rate ≥ 30/min')
    if (vitals.hr >= 125) reasons.push('Heart rate ≥ 125/min')
    if (vitals.bpSys < 90) reasons.push('Systolic blood pressure below 90 mmHg')
    if (vitals.gcs < 14) reasons.push('Altered conscious level')
    if (vitals.pain >= 9) reasons.push('Severe pain or distress')
    if (risks.length) reasons.push(`High-risk flag: ${risks[0]}`)
    if (!reasons.length) reasons.push('Presenting complaint matches a high-risk pathway')
  } else if (resources >= 2) {
    esi = 3
    reasons.push(`${resources} diagnostic or therapeutic resources anticipated`)
    if (vitals.pain >= 7) reasons.push('Significant pain requires timely reassessment')
  } else if (resources === 1) {
    esi = 4
    reasons.push('One resource anticipated with stable vital signs')
  } else {
    esi = 5
    reasons.push('No resources anticipated with stable vital signs')
  }
  return { esi, reasons }
}

export const commonRisks = ['Cardiac chest pain', 'Stroke symptoms', 'Respiratory distress', 'Possible sepsis', 'Immunosuppression', 'Severe bleeding', 'Pregnancy', 'Altered mental status']

export function departmentById(departments: Department[], id: DepartmentId) {
  return departments.find((department) => department.id === id) ?? departments[0]
}

export function invoiceTotals(invoice: Invoice) {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const total = subtotal + invoice.tax - invoice.discount
  return { subtotal, total, patientPayable: Math.max(0, total - invoice.insuranceCovered) }
}
