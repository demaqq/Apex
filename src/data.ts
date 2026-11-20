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
  Visit,
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
    title: 'Consultant Radiologist · Head of Imaging',
    shortTitle: 'Imaging',
    employeeId: 'RA-3304',
    department: 'radiology',
    initials: 'LM',
    shift: '08:00 – 16:00',
    workspace: 'Imaging worklist',
    headline: 'Move critical answers forward.',
    description: 'X-ray, ultrasound, CT, MRI and more: safety checks, scheduling, reporting and images back to the record.',
    focus: ['Urgent studies', 'Safety checks', 'Unreported studies'],
    accent: '#72569a',
  },
  radiographer: {
    id: 'radiographer',
    name: 'Dawit Tesfaye',
    title: 'Radiographer · Imaging Technologist',
    shortTitle: 'Radiographer',
    employeeId: 'RG-3318',
    department: 'radiology',
    initials: 'DT',
    shift: '07:00 – 15:00',
    workspace: 'Imaging worklist',
    headline: 'Safe scans, first time.',
    description: 'Schedule and acquire studies, run the safety checks and attach images. The radiologist reports.',
    focus: ['Studies to schedule', 'Safety checks', 'Images to attach'],
    accent: '#8a5aa8',
  },
  laboratory: {
    id: 'laboratory',
    name: 'Dr. Priya Nair',
    title: 'Clinical Pathologist · Laboratory Head',
    shortTitle: 'Laboratory',
    employeeId: 'LB-2210',
    department: 'laboratory',
    initials: 'PN',
    shift: '07:30 – 16:30',
    workspace: 'Laboratory worklist',
    headline: 'Return critical results, faster.',
    description: 'Specimens by section, from collection to verified result, with the test catalogue the laboratory maintains.',
    focus: ['Specimens to receive', 'In analysis', 'Results to verify'],
    accent: '#378777',
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
  { id: 'icu', name: 'Intensive Care Unit (ICU)', shortName: 'ICU', parent: 'internal-medicine', lead: 'Dr. Marcus Lind', onCall: 'Dr. Ana Costa', phone: 'x2400', capacity: 16, occupied: 15, targetWait: 20, averageWait: 31, color: '#b65464', zone: 'Level 4 · North', description: 'Level 3 critical care with advanced organ support and monitoring.', services: ['Critical care', 'Ventilation', 'Post-operative HDU'] },
  { id: 'surgery', name: 'Surgery & Theatre', shortName: 'Surgery', lead: 'Mr. Robert Hale', onCall: 'Ms. Keiko Sato', phone: 'x2460', capacity: 28, occupied: 21, targetWait: 90, averageWait: 76, color: '#9b6a3c', zone: 'Level 4 · Central', description: 'Emergency theatre, surgical assessment and post-operative inpatient care.', services: ['Emergency theatre', 'Orthopaedics', 'General surgery'] },
  { id: 'ward', name: 'General Medical Ward', shortName: 'General ward', lead: 'Dr. June Ellis', onCall: 'Dr. Peter Hall', phone: 'x2520', capacity: 46, occupied: 38, targetWait: 120, averageWait: 98, color: '#487a9a', zone: 'Level 5 · South', description: 'General internal medicine, rehabilitation and discharge coordination.', services: ['Internal medicine', 'Step-down care', 'Discharge planning'] },
  { id: 'pharmacy', name: 'Pharmacy', shortName: 'Pharmacy', lead: 'Nina Wallace, PharmD', onCall: 'Samir Patel, PharmD', phone: 'x2580', capacity: 10, occupied: 5, targetWait: 30, averageWait: 24, color: '#67864a', zone: 'Level 1 · Central', description: 'Clinical verification, inpatient dispensing and discharge medicines.', services: ['Clinical verification', 'STAT dispensing', 'Discharge prescriptions'] },
  { id: 'pediatrics', name: 'Paediatrics', shortName: 'Paediatrics', lead: 'Dr. Elise Martin', onCall: 'Dr. Isaac Green', phone: 'x2600', capacity: 20, occupied: 12, targetWait: 20, averageWait: 18, color: '#c5824f', zone: 'Level 2 · West', description: 'Dedicated paediatric emergency, assessment and inpatient services.', services: ['Paediatric assessment', "Children's ward", 'Family-centred care'] },
  { id: 'obgyn', name: 'Obstetrics & Gynaecology', shortName: 'OB/GYN', lead: 'Dr. Leila Thompson', onCall: 'Dr. Hannah Reid', phone: 'x2640', capacity: 24, occupied: 17, targetWait: 20, averageWait: 19, color: '#ad6682', zone: 'Level 3 · South', description: 'Integrated maternity, obstetric emergency and gynaecology services for inpatient and outpatient care.', services: ['Maternity triage', 'Antenatal care', 'Gynaecology clinic'] },
  { id: 'oncology', name: 'Oncology', shortName: 'Oncology', lead: 'Dr. Mahlet Assefa', onCall: 'Dr. Mahlet Assefa', phone: 'x2720', capacity: 16, occupied: 9, targetWait: 30, averageWait: 24, color: '#8b6cc4', zone: 'Level 4 · East', description: 'Cancer diagnosis, chemotherapy day unit, inpatient oncology and palliative care.', services: ['Chemotherapy day unit', 'Tumour board', 'Palliative care', 'Oncology clinic'] },
  { id: 'ophthalmology', name: 'Ophthalmology', shortName: 'Eye', lead: 'Dr. Yonas Tesfaye', onCall: 'Dr. Yonas Tesfaye', phone: 'x2760', capacity: 10, occupied: 4, targetWait: 40, averageWait: 35, color: '#64748b', zone: 'Level 1 · West', description: 'Eye clinic, cataract and glaucoma services, eye emergencies and day-case surgery.', services: ['Eye clinic', 'Cataract surgery', 'Glaucoma clinic', 'Eye emergencies'] },
  { id: 'endocrinology', name: 'Endocrinology & Diabetes', shortName: 'Endocrine', lead: 'Dr. Rahel Mulugeta', onCall: 'Dr. Rahel Mulugeta', phone: 'x2780', capacity: 8, occupied: 3, targetWait: 30, averageWait: 28, color: '#ca8a04', zone: 'Level 2 · West', description: 'Diabetes, thyroid, adrenal and pituitary care: clinics, insulin starts and diabetic emergencies.', services: ['Diabetes clinic', 'Thyroid clinic', 'Insulin education', 'Diabetic foot review'] },
  { id: 'orthopedics', name: 'Orthopaedics & Trauma', shortName: 'Ortho', lead: 'Ms. Keiko Sato', onCall: 'Dr. Abel Haile', phone: 'x2790', capacity: 20, occupied: 14, targetWait: 30, averageWait: 34, color: '#78716c', zone: 'Level 3 · East', description: 'Fractures, joint replacement, spine and sports injuries, with plaster room and fracture clinic.', services: ['Fracture clinic', 'Plaster room', 'Joint replacement', 'Spine'] },
  { id: 'nicu', name: 'Neonatal Intensive Care Unit (NICU)', shortName: 'NICU', parent: 'pediatrics', lead: 'Dr. Martha Bekele', onCall: 'Dr. Martha Bekele', phone: 'x2420', capacity: 12, occupied: 9, targetWait: 10, averageWait: 8, color: '#9333ea', zone: 'Level 3 · South', description: 'Care for preterm and sick newborns: incubators, CPAP, phototherapy and kangaroo mother care.', services: ['Incubator care', 'CPAP', 'Phototherapy', 'Kangaroo mother care'] },
  { id: 'or', name: 'Operating Rooms (O.R.)', shortName: 'O.R.', lead: 'Dr. Ines Duarte', onCall: 'Dr. Ines Duarte', phone: 'x2300', capacity: 6, occupied: 2, targetWait: 30, averageWait: 26, color: '#0f766e', zone: 'Level 2 · Theatre suite', description: 'Theatres, anaesthesia and recovery (PACU) shared by all surgical departments.', services: ['Theatre 1', 'Theatre 2', 'Theatre 3', 'Recovery (PACU)'] },
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
  { id: 'p1007', mrn: 'NS-008419', name: 'Nadia Hassan', age: 52, sex: 'Female', pronouns: 'she/her', complaint: 'Fever on day 9 after cytotoxic chemotherapy', history: 'Breast cancer, recent chemotherapy. Neutropenic sepsis pathway activated; first-line antibiotics prescribed.', allergies: ['Sulfonamides'], arrival: ago(68), esi: 2, riskFactors: ['Immunosuppression', 'Possible sepsis', 'Chemotherapy'], resources: 4, vitals: v({ hr: 118, rr: 24, spo2: 96, bpSys: 102, bpDia: 62, temp: 38.7, pain: 3 }), department: 'icu', location: 'HDU 03', status: 'observation', assignedTo: 'Dr. Ana Costa', timeline: [ { id: uid('ev'), at: ago(68), type: 'arrival', title: 'Neutropenic sepsis alert', detail: 'Oncology helpline advised immediate emergency attendance.', author: 'Reception', department: 'emergency' }, { id: uid('ev'), at: ago(52), type: 'order', title: 'Cultures and lactate collected', detail: 'Blood cultures prior to antibiotics; urgent FBC and renal profile.', author: 'Dr. Maya Chen', department: 'laboratory' }, { id: uid('ev'), at: ago(17), type: 'transfer', title: 'Accepted to HDU', detail: 'Close observation while responding to fluids and antibiotics.', author: 'Dr. Ana Costa', department: 'icu' } ] },
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
  { id: 'p1021', mrn: 'NS-008468', name: 'Bekele Worku', age: 63, sex: 'Male', pronouns: 'he/him', encounterType: 'outpatient', complaint: 'Glaucoma follow-up with blurred vision in the left eye', history: 'Primary open-angle glaucoma on timolol drops for 4 years. Reports missed doses for two weeks after running out. No pain or redness.', allergies: ['No known allergies'], arrival: ago(40), esi: 4, riskFactors: ['Glaucoma'], resources: 1, vitals: v({ hr: 76, rr: 14, spo2: 98, bpSys: 138, bpDia: 84, temp: 36.6, pain: 0 }), department: 'ophthalmology', location: 'Eye clinic · Room 3', status: 'waiting', assignedTo: 'Dr. Yonas Tesfaye', timeline: [ { id: uid('ev'), at: ago(40), type: 'arrival', title: 'Eye clinic arrival', detail: 'Visual acuity and pressures checked by the clinic nurse.', author: 'Eye clinic', department: 'ophthalmology' } ] },
  { id: 'p1022', mrn: 'NS-008473', name: 'Tigist Alemu', age: 34, sex: 'Female', pronouns: 'she/her', encounterType: 'outpatient', complaint: 'Blood tests and chest X-ray requested by her health centre', history: 'Referred from Kirkos health centre with a lab request slip.', allergies: ['Not yet recorded'], arrival: ago(6), esi: 5, riskFactors: [], resources: 1, vitals: { hr: 0, rr: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, gcs: 15, pain: 0 }, department: 'laboratory', location: 'Reception · cashier', status: 'awaiting-payment', assignedTo: 'Unassigned', timeline: [ { id: uid('ev'), at: ago(6), type: 'arrival', title: 'Checked in at reception · Lab or imaging only', detail: 'LABO-01 · Laboratory. Self-pay. Waiting for payment.', author: 'Reception', department: 'laboratory' } ] },
  { id: 'p1023', mrn: 'NS-008476', name: 'Dawit Bekele', age: 45, sex: 'Male', pronouns: 'he/him', encounterType: 'outpatient', complaint: 'Headaches and high blood pressure reading at work', history: 'Awaiting triage assessment.', allergies: ['Not yet recorded'], arrival: ago(9), esi: 3, riskFactors: [], resources: 0, vitals: { hr: 0, rr: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, gcs: 15, pain: 0 }, department: 'internal-medicine', location: 'Triage waiting area', status: 'awaiting-triage', assignedTo: 'Unassigned', timeline: [ { id: uid('ev'), at: ago(9), type: 'arrival', title: 'Checked in at reception · Outpatient clinic (OPD)', detail: 'INTE-01 · Internal Medicine. Self-pay. Paid in cash.', author: 'Reception', department: 'internal-medicine' } ] },
  { id: 'p1024', mrn: 'NS-008481', name: 'Hanna Getachew', age: 38, sex: 'Female', pronouns: 'she/her', encounterType: 'outpatient', complaint: 'Type 1 diabetes with high sugars and two hypoglycaemic episodes this week', history: 'Type 1 diabetes for 20 years on basal-bolus insulin. Missed doses during a family illness; two night-time hypos with sweating.', allergies: ['No known allergies'], arrival: ago(35), esi: 4, riskFactors: ['Type 1 diabetes'], resources: 1, vitals: v({ hr: 84, rr: 15, spo2: 99, bpSys: 124, bpDia: 78, temp: 36.7, pain: 0 }), department: 'endocrinology', location: 'Endocrine OPD · waiting', status: 'waiting', assignedTo: 'Dr. Rahel Mulugeta', timeline: [ { id: uid('ev'), at: ago(35), type: 'arrival', title: 'Checked in at reception · Outpatient clinic (OPD)', detail: 'ENDO-01 · Endocrinology & Diabetes. CBHI.', author: 'Reception', department: 'endocrinology' } ] },
  { id: 'p1025', mrn: 'NS-008484', name: 'Yonas Alemayehu', age: 27, sex: 'Male', pronouns: 'he/him', encounterType: 'inpatient', complaint: 'Closed fracture of the right femoral shaft after a motorbike accident', history: 'Admitted yesterday on skin traction. Neurovascularly intact. Listed for intramedullary nailing; analgesia and DVT prophylaxis started.', allergies: ['No known allergies'], arrival: ago(1500), esi: 3, riskFactors: ['Femur fracture'], resources: 3, vitals: v({ hr: 96, rr: 16, spo2: 98, bpSys: 122, bpDia: 76, temp: 37.2, pain: 5 }), department: 'orthopedics', location: 'Orthopaedic ward · Bed 04', status: 'admitted', assignedTo: 'Dr. Abel Haile', timeline: [ { id: uid('ev'), at: ago(1500), type: 'arrival', title: 'Admitted from the emergency department', detail: 'Femoral shaft fracture on X-ray; traction applied.', author: 'Dr. Abel Haile', department: 'orthopedics' } ] },
  { id: 'p1026', mrn: 'NS-008487', name: 'Baby girl of Selam Tesfaye', age: 0, sex: 'Female', pronouns: 'she/her', encounterType: 'inpatient', complaint: 'Preterm 32 weeks, 1.55 kg, on CPAP for respiratory distress', history: 'Born by emergency caesarean section 3 days ago for maternal pre-eclampsia. Antenatal steroids given. CPAP 5 cmH₂O, 30% oxygen; tube feeds of expressed breast milk building up.', allergies: ['No known allergies'], arrival: ago(3 * 1440), esi: 2, riskFactors: ['Preterm 32 weeks', 'Low birth weight'], resources: 3, vitals: v({ hr: 152, rr: 54, spo2: 94, bpSys: 52, bpDia: 30, temp: 36.6, pain: 0 }), department: 'nicu', location: 'NICU · Cot 03', status: 'admitted', assignedTo: 'Dr. Martha Bekele', weightKg: 1.48, timeline: [ { id: uid('ev'), at: ago(3 * 1440), type: 'arrival', title: 'Admitted to NICU from theatre', detail: 'Grunting and recession at 10 minutes of life; CPAP started.', author: 'Dr. Martha Bekele', department: 'nicu' } ] },
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
  { id: 'OR-7980', patientId: 'p1022', title: 'Full blood count', kind: 'Laboratory', department: 'laboratory', priority: 'routine', status: 'ordered', createdAt: ago(6), createdBy: 'Reception', billing: 'Unpaid' },
  { id: 'OR-7981', patientId: 'p1022', title: 'Chest X-ray', kind: 'Imaging', department: 'radiology', priority: 'routine', status: 'ordered', createdAt: ago(6), createdBy: 'Reception', billing: 'Unpaid' },
  { id: 'OR-7982', patientId: 'p1021', title: 'Glucose', kind: 'Laboratory', department: 'laboratory', priority: 'routine', status: 'ordered', createdAt: ago(20), createdBy: 'Dr. Yonas Tesfaye', billing: 'Unpaid' },
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
  { id: 'RX-3104', patientId: 'p1006', prescriber: 'Dr. Isaac Green', department: 'pediatrics', createdAt: ago(12), priority: 'Routine', status: 'Ready for collection', verifiedBy: 'Nina Wallace, PharmD', eRx: { code: 'ERX-LM8K2Q', validUntil: ago(-7 * 1440), instructions: 'Shake the bottle. Give amoxicillin with or after food and finish all 5 days. Paracetamol only if feverish or in pain.', phone: '+251 911 000 000' }, diagnosis: 'Acute otitis media', items: [{ medicationId: 'med-12', dosage: '250 mg', frequency: 'Three times daily', duration: '5 days', quantity: 1 }, { medicationId: 'med-1', dosage: '240 mg', frequency: 'Every 6 h as needed', duration: '3 days', quantity: 12 }] },
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
  { id: 'ST-04', roleId: 'diagnostics', name: 'Dr. Leah Morgan', role: 'Radiologist', department: 'radiology', specialty: 'Diagnostic radiology', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'RAD-001', email: 'leah.morgan@northstar.example', phone: 'x2321', license: 'MD-402876', positions: [{ id: 'imaging-head', since: ago(400 * 1440), by: 'Elena Rossi', note: 'Head of the imaging department' }] },
  { id: 'ST-05', roleId: 'coordinator', name: 'Jon Bell', role: 'Patient flow coordinator', department: 'ward', specialty: 'Bed management', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'BED-001', email: 'jon.bell@northstar.example', phone: 'x2521', license: '—' },
  { id: 'ST-06', roleId: 'pharmacist', name: 'Nina Wallace, PharmD', role: 'Pharmacist', department: 'pharmacy', specialty: 'Clinical pharmacy', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'PHA-001', email: 'nina.wallace@northstar.example', phone: 'x2581', license: 'PH-118302', positions: [{ id: 'pharmacy-manager', since: ago(200 * 1440), by: 'Elena Rossi', note: 'Appointed head of pharmacy' }] },
  { id: 'ST-07', name: 'Dr. Ana Costa', role: 'Consultant', department: 'icu', specialty: 'Critical care', shift: 'Evening · 15:00–23:00', onDuty: false, pager: 'ICU-001', email: 'ana.costa@northstar.example', phone: 'x2401', license: 'MD-377210' },
  { id: 'ST-08', name: 'Ms. Keiko Sato', role: 'Surgeon', department: 'surgery', specialty: 'Orthopaedic surgery', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'SUR-001', email: 'keiko.sato@northstar.example', phone: 'x2461', license: 'MD-365519' },
  { id: 'ST-09', name: 'Dr. Tomas Reid', role: 'Consultant', department: 'neurology', specialty: 'Stroke medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'NEU-001', email: 'tomas.reid@northstar.example', phone: 'x2281', license: 'MD-410983' },
  { id: 'ST-10', name: 'Dr. Hannah Reid', role: 'Physician', department: 'obgyn', specialty: 'Obstetrics', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'OBS-001', email: 'hannah.reid@northstar.example', phone: 'x2641', license: 'MD-428801' },
  { id: 'ST-11', name: 'Dr. Felix Adeyemi', role: 'Pathologist', department: 'laboratory', specialty: 'Clinical biochemistry', shift: 'Night · 23:00–07:00', onDuty: false, pager: 'LAB-002', email: 'felix.adeyemi@northstar.example', phone: 'x2352', license: 'MD-399127' },
]

const extraStaff = (): StaffMember[] => [
  { id: 'ST-25', roleId: 'radiographer', name: 'Dawit Tesfaye', role: 'Radiographer', department: 'radiology', specialty: 'CT and MRI', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'RAD-004', email: 'dawit.tesfaye@northstar.example', phone: 'x2324', license: 'RT-210448' },
  { id: 'ST-24', roleId: 'laboratory', name: 'Dr. Priya Nair', role: 'Clinical pathologist', department: 'laboratory', specialty: 'Laboratory medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'LAB-001', email: 'priya.nair@northstar.example', phone: 'x2351', license: 'MD-401553', positions: [{ id: 'lab-head', since: ago(500 * 1440), by: 'Elena Rossi', note: 'Laboratory head' }] },
  { id: 'ST-18', name: 'Dr. Selam Bekele', role: 'Medical officer', department: 'internal-medicine', specialty: 'General medicine', shift: 'Day · 07:00–15:00', onDuty: false, pager: 'MED-021', email: 'selam.bekele@northstar.example', phone: 'x2690', license: 'Not yet verified', status: 'Pending approval', roleId: 'physician' },
  { id: 'ST-12', roleId: 'intern', name: 'Dr. Leo Park', role: 'Foundation doctor', department: 'internal-medicine', specialty: 'General medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'MED-014', email: 'leo.park@northstar.example', phone: 'x2684', license: 'MD-501877' },
  { id: 'ST-13', roleId: 'receptionist', name: 'Grace Mwangi', role: 'Front desk coordinator', department: 'emergency', specialty: 'Registration', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'REG-001', email: 'grace.mwangi@northstar.example', phone: 'x2001', license: '—' },
  { id: 'ST-14', roleId: 'theatre', name: 'Dr. Ines Duarte', role: 'Anaesthetist', department: 'surgery', specialty: 'Anaesthesia', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'ANA-001', email: 'ines.duarte@northstar.example', phone: 'x2471', license: 'MD-377901' },
  { id: 'ST-15', roleId: 'allied', name: 'Sam Oduya, PT', role: 'Physiotherapist', department: 'ward', specialty: 'Rehabilitation', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'PHY-001', email: 'sam.oduya@northstar.example', phone: 'x2533', license: 'PT-220144' },
  { id: 'ST-16', roleId: 'billing', name: 'Priya Desai', role: 'Billing officer', department: 'emergency', specialty: 'Patient accounts', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'FIN-001', email: 'priya.desai@northstar.example', phone: 'x2090', license: '—' },
  { id: 'ST-19', name: 'Dr. Mahlet Assefa', role: 'Consultant oncologist', department: 'oncology', specialty: 'Medical oncology', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'ONC-001', email: 'mahlet.assefa@northstar.example', phone: 'x2721', license: 'MD-402118' },
  { id: 'ST-20', name: 'Dr. Yonas Tesfaye', role: 'Consultant ophthalmologist', department: 'ophthalmology', specialty: 'Glaucoma', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'EYE-001', email: 'yonas.tesfaye@northstar.example', phone: 'x2761', license: 'MD-404551' },
  { id: 'ST-21', name: 'Dr. Rahel Mulugeta', role: 'Consultant endocrinologist', department: 'endocrinology', specialty: 'Diabetes and thyroid', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'END-001', email: 'rahel.mulugeta@northstar.example', phone: 'x2781', license: 'MD-405210' },
  { id: 'ST-22', name: 'Dr. Abel Haile', role: 'Orthopaedic surgeon', department: 'orthopedics', specialty: 'Trauma and joints', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'ORT-001', email: 'abel.haile@northstar.example', phone: 'x2791', license: 'MD-406388' },
  { id: 'ST-23', name: 'Dr. Martha Bekele', role: 'Neonatologist', department: 'nicu', specialty: 'Neonatal medicine', shift: 'Day · 07:00–15:00', onDuty: true, pager: 'NIC-001', email: 'martha.bekele@northstar.example', phone: 'x2421', license: 'MD-407102' },
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
  { id: 'END', name: 'Endocrine & diabetes beds', department: 'endocrinology', beds: 6 },
  { id: 'ORT', name: 'Orthopaedic ward', department: 'orthopedics', beds: 14 },
  { id: 'NICU', name: 'NICU cots', department: 'nicu', beds: 10 },
  { id: 'PACU', name: 'Recovery (PACU)', department: 'or', beds: 6 },
]

const bedSeed = (wards: Ward[]): Bed[] => {
  const occupied: Record<string, string> = { 'ED-02': 'p1001', 'ED-08': 'p1002', 'ED-04': 'p1004', 'CCU-06': 'p1008', 'STR-01': 'p1003', 'ICU-03': 'p1007', 'S3B-12': 'p1005', 'W5S-12': 'p1010', 'MAT-05': 'p1013', 'M5N-08': 'p1014', 'ONC-02': 'p1020', 'PAE-03': 'p1018', 'MAT-02': 'p1019', 'ORT-04': 'p1025', 'NICU-03': 'p1026' }
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

const vs = (id: string, type: Visit['type'], department: string, queueNo: string, minutes: number, payer: Visit['payer'], billing: Visit['billing'], opd?: Visit['opd'], room?: string): Visit => ({ id, type, department, queueNo, checkedInAt: ago(minutes), payer, billing, opd, room, ...(billing === 'Paid' || billing === 'Covered' ? { receipt: `RC-${id.slice(2)}` } : {}) })

const visitSeed: Record<string, Visit> = {
  p1006: vs('V-1006', 'OPD', 'pediatrics', 'PAED-01', 32, 'Self-pay', 'Paid', 'Waiting'),
  p1015: vs('V-1015', 'OPD', 'ent', 'ENT-01', 30, 'CBHI', 'Covered', 'Waiting'),
  p1016: vs('V-1016', 'OPD', 'dermatology', 'DERM-01', 60, 'Private insurance', 'Paid', 'With doctor', 'Room 1'),
  p1017: vs('V-1017', 'OPD', 'obgyn', 'OBGY-01', 22, 'Health insurance (EHIS)', 'Covered', 'Waiting'),
  p1021: vs('V-1021', 'OPD', 'ophthalmology', 'EYE-01', 45, 'Self-pay', 'Paid', 'Waiting'),
  p1011: vs('V-1011', 'Emergency', 'emergency', 'EMER-01', 40, 'Self-pay', 'Deferred'),
  p1022: vs('V-1022', 'Investigation', 'laboratory', 'LABO-01', 6, 'Self-pay', 'Unpaid'),
  p1023: vs('V-1023', 'OPD', 'internal-medicine', 'INTE-01', 9, 'Self-pay', 'Paid'),
  p1024: vs('V-1024', 'OPD', 'endocrinology', 'ENDO-01', 35, 'CBHI', 'Covered', 'Waiting'),
}

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
    { ...round(2 * H, 'Megan Shaw, RN', 'Improving', 'Slept well, no breathlessness at rest.', '', 'Settling on inhalers; independent with care.', 'Continue 4-hourly observations, inhaler technique check before discharge.'), kind: 'Junior nurse assessment', cosign: 'Pending review', reviewer: 'Senior nurse', vitals: { hr: 90, rr: 19, spo2: 94, bpSys: 136, bpDia: 80, temp: 36.8, gcs: 15, pain: 1, onOxygen: false, consciousness: 'Alert' }, nursing: { pressure: 'Intact', cannula: 'Removed', mobility: 'Independent', intake: 'Well', continence: 'Continent', falls: 'Low', hygiene: 'Independent' } },
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
  { id: 'TC-04', patientId: 'p1025', procedure: 'Intramedullary nailing, right femur', surgeon: 'Dr. Abel Haile · Orthopaedics', room: 'Theatre 3', time: '16:30', stage: 0, checklist: [true, true, false, false, true, false] },
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

type Extra = Partial<Pick<InvestigationItem, 'specimen' | 'container' | 'refRange' | 'tatHours' | 'prep'>>
const lab = (id: string, name: string, section: string, price: number, specimen: string, container: string, tatHours: number, refRange = '', inHouse = true): InvestigationItem => ({ id, name, kind: 'Laboratory', section, inHouse, price, active: true, specimen, container, tatHours, ...(refRange ? { refRange } : {}) })
const img = (id: string, name: string, section: string, price: number, tatHours: number, prep = '', inHouse = true, extra: Extra = {}): InvestigationItem => ({ id, name, kind: 'Imaging', section, inHouse, price, active: true, tatHours, ...(prep ? { prep } : {}), ...extra })

/** Starting catalogue. The laboratory head and the head of imaging (or the administrator) add, price and switch items on and off. */
const investigationSeed = (): InvestigationItem[] => [
  // Haematology
  lab('LB-001', 'Full blood count', 'Haematology', 12, 'Whole blood', 'EDTA (purple)', 2, 'Hb 12–16 g/dL · WBC 4–11 ×10⁹/L · Plt 150–400'),
  lab('LB-002', 'ESR', 'Haematology', 5, 'Whole blood', 'EDTA (purple)', 2, '< 20 mm/h'),
  lab('LB-003', 'Peripheral blood film', 'Haematology', 10, 'Whole blood', 'EDTA (purple)', 6),
  lab('LB-004', 'Coagulation screen', 'Haematology', 20, 'Plasma', 'Citrate (blue)', 3, 'PT 11–14 s · INR 0.8–1.2 · APTT 25–35 s'),
  lab('LB-005', 'Reticulocyte count', 'Haematology', 8, 'Whole blood', 'EDTA (purple)', 4, '0.5–2.5 %'),
  // Clinical chemistry
  lab('LB-010', 'U&E and creatinine', 'Clinical chemistry', 15, 'Serum', 'Plain / SST (gold)', 2, 'Na 135–145 · K 3.5–5.1 · Cr 0.6–1.2 mg/dL'),
  lab('LB-011', 'Liver function tests', 'Clinical chemistry', 18, 'Serum', 'Plain / SST (gold)', 3),
  lab('LB-012', 'CRP', 'Clinical chemistry', 10, 'Serum', 'Plain / SST (gold)', 2, '< 5 mg/L'),
  lab('LB-013', 'Glucose', 'Clinical chemistry', 4, 'Plasma', 'Fluoride (grey)', 1, 'Fasting 70–100 mg/dL'),
  lab('LB-014', 'HbA1c', 'Clinical chemistry', 22, 'Whole blood', 'EDTA (purple)', 24, '< 5.7 %'),
  lab('LB-015', 'Lipid profile', 'Clinical chemistry', 20, 'Serum', 'Plain / SST (gold)', 24),
  lab('LB-016', 'High-sensitivity troponin I', 'Clinical chemistry', 35, 'Serum', 'Plain / SST (gold)', 1, '< 26 ng/L'),
  lab('LB-017', 'Arterial blood gas', 'Clinical chemistry', 25, 'Arterial blood', 'Heparinised syringe', 0.25),
  lab('LB-018', 'Lactate', 'Clinical chemistry', 12, 'Plasma', 'Fluoride (grey)', 1, '0.5–2.0 mmol/L'),
  lab('LB-019', 'Serum electrolytes (Ca, Mg, PO₄)', 'Clinical chemistry', 14, 'Serum', 'Plain / SST (gold)', 3),
  // Hormones & tumour markers
  lab('LB-030', 'Thyroid function tests', 'Hormones & tumour markers', 30, 'Serum', 'Plain / SST (gold)', 24, 'TSH 0.4–4.0 mIU/L', false),
  lab('LB-031', 'Beta-hCG (quantitative)', 'Hormones & tumour markers', 18, 'Serum', 'Plain / SST (gold)', 4),
  lab('LB-032', 'PSA', 'Hormones & tumour markers', 28, 'Serum', 'Plain / SST (gold)', 48, '< 4 ng/mL', false),
  lab('LB-033', 'CA-125', 'Hormones & tumour markers', 40, 'Serum', 'Plain / SST (gold)', 72, '< 35 U/mL', false),
  // Serology & immunology
  lab('LB-040', 'HIV rapid test', 'Serology & immunology', 6, 'Whole blood', 'EDTA (purple)', 1),
  lab('LB-041', 'HBsAg', 'Serology & immunology', 8, 'Serum', 'Plain / SST (gold)', 2),
  lab('LB-042', 'HCV antibody', 'Serology & immunology', 10, 'Serum', 'Plain / SST (gold)', 2),
  lab('LB-043', 'VDRL / RPR', 'Serology & immunology', 6, 'Serum', 'Plain / SST (gold)', 4),
  lab('LB-044', 'Widal and Weil-Felix', 'Serology & immunology', 6, 'Serum', 'Plain / SST (gold)', 4),
  // Microbiology
  lab('LB-050', 'Blood cultures ×2', 'Microbiology', 40, 'Blood', 'Culture bottles (aerobic + anaerobic)', 72),
  lab('LB-051', 'Urine culture and sensitivity', 'Microbiology', 20, 'Midstream urine', 'Sterile universal', 48),
  lab('LB-052', 'Sputum AFB and GeneXpert', 'Microbiology', 25, 'Sputum', 'Sterile sputum pot', 24),
  lab('LB-053', 'Wound swab culture', 'Microbiology', 18, 'Swab', 'Transport swab', 48),
  // Parasitology
  lab('LB-060', 'Malaria blood film / RDT', 'Parasitology', 5, 'Whole blood', 'EDTA (purple)', 1),
  lab('LB-061', 'Stool examination', 'Parasitology', 5, 'Stool', 'Stool pot', 2),
  // Urine & body fluids
  lab('LB-070', 'Urinalysis', 'Urine & body fluids', 5, 'Urine', 'Universal container', 1),
  lab('LB-071', 'CSF analysis', 'Urine & body fluids', 30, 'CSF', 'Sterile tubes ×3', 4),
  // Blood bank
  lab('LB-080', 'Group and save', 'Blood bank', 15, 'Whole blood', 'EDTA (pink)', 1),
  lab('LB-081', 'Crossmatch', 'Blood bank', 20, 'Whole blood', 'EDTA (pink)', 1),
  // Molecular
  lab('LB-090', 'Viral load (HIV)', 'Molecular', 60, 'Plasma', 'EDTA (purple)', 168, '', false),
  lab('LB-091', 'Hepatitis B viral load', 'Molecular', 70, 'Plasma', 'EDTA (purple)', 168, '', false),
  // Histopathology & cytology
  lab('LB-095', 'Histopathology', 'Histopathology & cytology', 85, 'Tissue', 'Formalin pot', 168, '', false),
  lab('LB-096', 'Cervical cytology (Pap smear)', 'Histopathology & cytology', 25, 'Cervical cells', 'Slide / liquid medium', 120, '', false),
  lab('LB-097', 'Fine-needle aspiration cytology', 'Histopathology & cytology', 45, 'Aspirate', 'Slides', 72, '', false),

  // X-ray
  img('IM-001', 'Chest X-ray', 'X-ray', 30, 2),
  img('IM-002', 'X-ray limb', 'X-ray', 30, 2),
  img('IM-003', 'X-ray spine', 'X-ray', 35, 2),
  img('IM-004', 'X-ray abdomen', 'X-ray', 30, 2),
  img('IM-005', 'X-ray pelvis and hips', 'X-ray', 32, 2),
  // Ultrasound
  img('IM-010', 'Ultrasound abdomen', 'Ultrasound', 45, 4, 'Fast 6 hours'),
  img('IM-011', 'Ultrasound pelvis', 'Ultrasound', 40, 4, 'Full bladder: drink 1 L an hour before'),
  img('IM-012', 'Obstetric ultrasound', 'Ultrasound', 40, 2),
  img('IM-013', 'Ultrasound neck and thyroid', 'Ultrasound', 40, 4),
  img('IM-014', 'Breast ultrasound', 'Ultrasound', 40, 4),
  img('IM-015', 'Cranial ultrasound (neonatal)', 'Ultrasound', 40, 2),
  // Echo & Doppler
  img('IM-020', 'Echocardiogram', 'Echo & Doppler', 80, 24),
  img('IM-021', 'Doppler lower-limb veins', 'Echo & Doppler', 60, 24),
  img('IM-022', 'Carotid Doppler', 'Echo & Doppler', 60, 24),
  // CT
  img('IM-030', 'CT head without contrast', 'CT', 150, 1),
  img('IM-031', 'CT pulmonary angiogram', 'CT', 220, 2, 'IV contrast: check kidney function'),
  img('IM-032', 'CT abdomen and pelvis', 'CT', 240, 4, 'IV contrast; oral contrast 1 hour before'),
  img('IM-033', 'CT chest', 'CT', 200, 4),
  img('IM-034', 'CT spine', 'CT', 200, 4),
  // MRI
  img('IM-040', 'MRI brain', 'MRI', 320, 24, 'Metal and implant screening'),
  img('IM-041', 'MRI spine', 'MRI', 340, 24, 'Metal and implant screening'),
  img('IM-042', 'MRI knee', 'MRI', 300, 48, 'Metal and implant screening'),
  img('IM-043', 'MRCP', 'MRI', 360, 48, 'Fast 4 hours; metal screening', false),
  // PET-CT
  img('IM-050', 'PET-CT (FDG) whole body', 'PET-CT', 1200, 72, 'Fast 6 hours; glucose below 200 mg/dL; no exercise for 24 h', false),
  // Mammography
  img('IM-060', 'Mammography', 'Mammography', 90, 48, 'No deodorant or powder on the day', false),
  // Fluoroscopy
  img('IM-070', 'Barium swallow', 'Fluoroscopy', 80, 24, 'Nil by mouth 6 hours', false),
  img('IM-071', 'Hysterosalpingogram (HSG)', 'Fluoroscopy', 90, 24, 'Days 7–10 of the cycle', false),
  // DEXA
  img('IM-080', 'DEXA bone density', 'DEXA', 70, 48, 'No calcium tablets for 24 hours', false),
  // Nuclear medicine
  img('IM-090', 'Bone scan (Tc-99m)', 'Nuclear medicine', 400, 72, 'Return 3 hours after injection; drink plenty', false),
  img('IM-091', 'Thyroid scan', 'Nuclear medicine', 250, 48, 'Stop thyroid medicines as advised', false),
  // Interventional
  img('IM-100', 'Ultrasound-guided biopsy', 'Interventional', 180, 72, 'Coagulation screen and consent first'),
  img('IM-101', 'Image-guided drain insertion', 'Interventional', 220, 4, 'Coagulation screen and consent first', false),
]

/** Partner hospitals and diagnostic centres are added by the administrator as agreements are made. Until then, tests not done here go out on a printed request. */
const providerSeed = (): ExternalProvider[] => []

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
    if (patient.id === 'p1024') return { ...withObs, assessments: [{ id: 'SA-6', at: ago(20), by: 'Diabetes nurse', values: { type: 'Type 1', hba1c: '10.2', fasting: '212', hypos: '2', regimen: 'Basal-bolus insulin', tsh: '' } }], charts: { glucose: ([[2880, 268, 'Fasting'], [2160, 54, 'Night'], [1440, 241, 'Fasting'], [720, 61, 'Night'], [30, 212, 'Random']] as Array<[number, number, string]>).map(([m, mgdl, timing]) => ({ id: uid('CH'), at: ago(m), by: m === 30 ? 'Diabetes nurse' : 'Patient (home meter)', mgdl, timing })) } }
    if (patient.id === 'p1026') return { ...withObs, assessments: [{ id: 'SA-7', at: ago(60), by: 'Dr. Martha Bekele', values: { ga: '32', birthWeight: '1550', weight: '1480', day: '3', temp: '36.6', spo2: '94', support: 'CPAP', bilirubin: '9.8', feeds: 'Tube feeds' } }] }
    if (patient.id === 'p1025') return { ...withObs, assessments: [{ id: 'SA-8', at: ago(600), by: 'Dr. Abel Haile', values: { site: 'Femoral shaft', side: 'Right', type: 'Closed', management: 'Traction', nv: 'Intact', pain: '5' } }] }
    if (patient.id === 'p1021') return { ...withObs, assessments: [{ id: 'SA-5', at: ago(30), by: 'Eye clinic nurse', values: { var: '6/9', val: '6/24', iopr: '19', iopl: '31', notes: 'Left cup-to-disc ratio 0.8; restarted timolol.' } }] }
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
      const visit = visitSeed[patient.id]
      return { ...patient, vitals: { hr, rr, spo2, bpSys, bpDia, temp, gcs, pain }, ...(visit ? { visit } : {}), ...(patient.id === 'p1016' ? { insurance: 'Private insurance' } : {}) }
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
    accessGrants: [],
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
