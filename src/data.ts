import type {
  ClinicalOrder,
  Department,
  DepartmentId,
  HospitalState,
  Patient,
  Referral,
  RoleId,
  RoleProfile,
  Vitals,
  Ward,
  WardType,
  FormularyItem,
  Prescription,
  LabOrder,
  ImagingOrder,
  StaffMember,
  EmergencyBroadcast,
  AuditEvent,
  TriageRecord,
  ExtendedPatient,
  VitalReading,
  Invoice,
  Appointment,
  User,
  UserRole,
  HospitalDepartment,
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
  { id: 'OR-8112', patientId: 'p1014', title: 'FBC, CRP, renal profile and glucose', kind: 'Laboratory', department: 'laboratory', priority: 'routine', status: 'in-progress', createdAt: ago(36), createdBy: 'Dr. Rachel Stein' },
]

export const extendedPatientsSeed = (): ExtendedPatient[] => [
  {
    id: 'p1001',
    mrn: 'NS-008421',
    name: 'Evelyn Parker',
    firstName: 'Evelyn',
    lastName: 'Parker',
    age: 67,
    gender: 'Female',
    dob: '1957-03-15',
    bloodGroup: 'A+',
    phone: '+1-555-0123',
    email: 'evelyn.parker@email.com',
    address: '123 Main St, Springfield, IL 62701',
    emergencyContact: { name: 'James Parker', relationship: 'Spouse', phone: '+1-555-0124' },
    insurance: { provider: 'BlueCross BlueShield', policyNumber: 'BCBS-789456123', groupNumber: 'GRP-001', copay: 25 },
    status: 'in-treatment',
    department: 'Emergency Medicine',
    attendingPhysician: 'Dr. Maya Chen',
    admissionDate: ago(46),
    diagnoses: ['Acute Coronary Syndrome', 'Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin'],
    vitals: v({ hr: 108, rr: 22, spo2: 95, bpSys: 158, bpDia: 94, pain: 7 }),
    vitalsHistory: [
      { id: 'v1', ...v({ hr: 108, rr: 22, spo2: 95, bpSys: 158, bpDia: 94, pain: 7 }), recordedAt: ago(46), notes: 'Initial presentation' },
      { id: 'v2', ...v({ hr: 98, rr: 18, spo2: 97, bpSys: 142, bpDia: 88, pain: 4 }), recordedAt: ago(20), notes: 'After nitroglycerin' },
    ],
    latestTriage: undefined,
    notes: [],
    activeMedications: [],
    medications: ['Aspirin 300mg', 'Nitroglycerin SL', 'Metoprolol 25mg'],
  },
  {
    id: 'p1002',
    mrn: 'NS-008422',
    name: 'Mateo Rodriguez',
    firstName: 'Mateo',
    lastName: 'Rodriguez',
    age: 34,
    gender: 'Male',
    dob: '1990-07-22',
    bloodGroup: 'O+',
    phone: '+1-555-0125',
    email: 'mateo.rodriguez@email.com',
    address: '456 Oak Ave, Springfield, IL 62702',
    emergencyContact: { name: 'Maria Rodriguez', relationship: 'Spouse', phone: '+1-555-0126' },
    insurance: { provider: 'Aetna', policyNumber: 'AET-456789321', groupNumber: 'GRP-002', copay: 30 },
    status: 'in-treatment',
    department: 'Emergency Medicine',
    attendingPhysician: 'Dr. Maya Chen',
    admissionDate: ago(74),
    diagnoses: ['Open Distal Forearm Fracture'],
    allergies: ['No known allergies'],
    vitals: v({ hr: 94, pain: 8 }),
    vitalsHistory: [{ id: 'v3', ...v({ hr: 94, pain: 8 }), recordedAt: ago(74), notes: 'Initial triage' }],
    latestTriage: undefined,
    notes: [],
    activeMedications: [],
    medications: ['Cefazolin 1g IV', 'Morphine 4mg IV'],
  },
]

export const wardsSeed: Ward[] = [
  { id: 'ward-icu', name: 'Intensive Care Unit', type: 'ICU', floor: 'Level 4', totalBeds: 16, nurseInCharge: 'Maria Santos, RN' },
  { id: 'ward-ccu', name: 'Cardiac Care Unit', type: 'CCU', floor: 'Level 3', totalBeds: 12, nurseInCharge: 'David Chen, RN' },
  { id: 'ward-med-surg', name: 'Medical-Surgical Unit', type: 'Med-Surg', floor: 'Level 5', totalBeds: 30, nurseInCharge: 'Jennifer Park, RN' },
  { id: 'ward-peds', name: 'Pediatrics Ward', type: 'Pediatrics', floor: 'Level 2', totalBeds: 20, nurseInCharge: 'Lisa Thompson, RN' },
  { id: 'ward-obgyn', name: 'OB/GYN Unit', type: 'Gynecology & Obstetrics', floor: 'Level 3', totalBeds: 24, nurseInCharge: 'Amanda Foster, RN' },
  { id: 'ward-surgery', name: 'Surgical Ward', type: 'Surgery', floor: 'Level 4', totalBeds: 28, nurseInCharge: 'Robert Kim, RN' },
  { id: 'ward-oncology', name: 'Oncology Ward', type: 'Oncology', floor: 'Level 6', totalBeds: 18, nurseInCharge: 'Michelle Lee, RN' },
  { id: 'ward-internal', name: 'Internal Medicine', type: 'Internal Medicine', floor: 'Level 5', totalBeds: 38, nurseInCharge: 'Thomas Brown, RN' },
  { id: 'ward-emergency', name: 'Emergency Department', type: 'Emergency', floor: 'Level 1', totalBeds: 34, nurseInCharge: 'Sarah Okafor, RN' },
  { id: 'ward-isolation', name: 'Isolation Unit', type: 'Isolation', floor: 'Level 4', totalBeds: 8, nurseInCharge: 'Patricia White, RN' },
  { id: 'ward-maternity', name: 'Maternity Ward', type: 'Maternity', floor: 'Level 3', totalBeds: 20, nurseInCharge: 'Karen Davis, RN' },
]

export const formularySeed: FormularyItem[] = [
  { id: 'med-1', name: 'Acetaminophen', genericName: 'Acetaminophen', category: 'Analgesic', dosageForm: 'Tablet', strength: '500mg', stockLevel: 5000, stock: 5000, unit: 'tablet', reorderLevel: 1000, pricePerUnit: 0.05, route: 'PO', contraindications: ['Hepatic impairment', 'Alcohol dependence'], manufacturer: 'Generic Pharma' },
  { id: 'med-2', name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'Analgesic', dosageForm: 'Tablet', strength: '400mg', stockLevel: 3000, stock: 3000, unit: 'tablet', reorderLevel: 500, pricePerUnit: 0.08, route: 'PO', contraindications: ['GI bleed', 'Renal impairment', 'Late pregnancy'], manufacturer: 'Generic Pharma' },
  { id: 'med-3', name: 'Morphine', genericName: 'Morphine Sulfate', category: 'Analgesic', dosageForm: 'Injection', strength: '10mg/mL', stockLevel: 200, stock: 200, unit: 'ampoule', reorderLevel: 50, pricePerUnit: 2.50, route: 'IV', controlledSubstance: true, contraindications: ['Respiratory depression', 'Acute asthma'], manufacturer: 'Pfizer' },
  { id: 'med-4', name: 'Ceftriaxone', genericName: 'Ceftriaxone Sodium', category: 'Antibiotic', dosageForm: 'Injection', strength: '1g', stockLevel: 500, stock: 500, unit: 'vial', reorderLevel: 100, pricePerUnit: 4.20, route: 'IV', contraindications: ['Cephalosporin allergy', 'Neonatal hyperbilirubinemia'], manufacturer: 'Roche' },
  { id: 'med-5', name: 'Metoprolol', genericName: 'Metoprolol Tartrate', category: 'Cardiovascular', dosageForm: 'Tablet', strength: '25mg', stockLevel: 1000, stock: 1000, unit: 'tablet', reorderLevel: 200, pricePerUnit: 0.15, route: 'PO', contraindications: ['Severe bradycardia', 'Heart block >1st degree', 'Cardiogenic shock'], manufacturer: 'Novartis' },
  { id: 'med-6', name: 'Insulin Glargine', genericName: 'Insulin Glargine', category: 'Antidiabetic', dosageForm: 'Injection', strength: '100 units/mL', stockLevel: 150, stock: 150, unit: 'pen', reorderLevel: 30, pricePerUnit: 45.00, route: 'SC', contraindications: ['Hypoglycemia'], manufacturer: 'Sanofi' },
  { id: 'med-7', name: 'Salbutamol', genericName: 'Salbutamol Sulfate', category: 'Respiratory', dosageForm: 'Inhaler', strength: '100mcg/puff', stockLevel: 800, stock: 800, unit: 'inhaler', reorderLevel: 150, pricePerUnit: 12.00, route: 'Inhalation', contraindications: ['Hypersensitivity to salbutamol'], manufacturer: 'GSK' },
  { id: 'med-8', name: 'Midazolam', genericName: 'Midazolam', category: 'Sedative', dosageForm: 'Injection', strength: '5mg/mL', stockLevel: 100, stock: 100, unit: 'ampoule', reorderLevel: 25, pricePerUnit: 3.20, route: 'IV', controlledSubstance: true, contraindications: ['Acute narrow-angle glaucoma', 'Severe respiratory insufficiency'], manufacturer: 'Roche' },
  { id: 'med-9', name: 'Epinephrine', genericName: 'Epinephrine', category: 'Emergency', dosageForm: 'Injection', strength: '1mg/mL (1:1000)', stockLevel: 200, stock: 200, unit: 'ampoule', reorderLevel: 50, pricePerUnit: 1.80, route: 'IM/IV', contraindications: ['None in emergency'], manufacturer: 'Mylan' },
  { id: 'med-10', name: 'Vancomycin', genericName: 'Vancomycin HCl', category: 'Antibiotic', dosageForm: 'Injection', strength: '1g', stockLevel: 300, stock: 300, unit: 'vial', reorderLevel: 75, pricePerUnit: 8.50, route: 'IV', contraindications: ['Vancomycin allergy'], manufacturer: 'Lilly' },
]

export const prescriptionsSeed: Prescription[] = [
  {
    id: 'rx-1',
    rxNumber: 'RX-2024001',
    patientId: 'p1001',
    patientName: 'Evelyn Parker',
    patientMrn: 'NS-008421',
    mrn: 'NS-008421',
    doctorName: 'Dr. Maya Chen',
    prescribedBy: 'Dr. Maya Chen',
    department: 'Emergency Medicine',
    date: ago(46),
    priority: 'STAT',
    status: 'Pending',
    items: [
      { medicationId: 'med-3', medicationName: 'Morphine', dosage: '4mg', frequency: 'q4h PRN', duration: '24h', quantity: 6, route: 'IV', instructions: 'Titrate to pain score' },
      { medicationId: 'med-5', medicationName: 'Metoprolol', dosage: '25mg', frequency: 'BID', duration: '30 days', quantity: 60, route: 'PO', instructions: 'Hold if HR < 60 or SBP < 100' },
    ],
    diagnosis: 'Acute Coronary Syndrome',
    notes: 'Cardiology consultation pending',
  },
  {
    id: 'rx-2',
    rxNumber: 'RX-2024002',
    patientId: 'p1002',
    patientName: 'Mateo Rodriguez',
    patientMrn: 'NS-008422',
    mrn: 'NS-008422',
    doctorName: 'Dr. Maya Chen',
    prescribedBy: 'Dr. Maya Chen',
    department: 'Emergency Medicine',
    date: ago(74),
    priority: 'Urgent',
    status: 'Dispensed',
    items: [
      { medicationId: 'med-4', medicationName: 'Ceftriaxone', dosage: '1g', frequency: 'Daily', duration: '7 days', quantity: 7, route: 'IV', instructions: 'Pre-op prophylaxis' },
      { medicationId: 'med-2', medicationName: 'Ibuprofen', dosage: '400mg', frequency: 'q6h PRN', duration: '5 days', quantity: 20, route: 'PO', instructions: 'With food' },
    ],
    diagnosis: 'Open Distal Forearm Fracture',
    notes: 'Tetanus updated',
  },
]

export const labOrdersSeed: LabOrder[] = [
  {
    id: 'lab-1',
    orderNumber: 'LAB-2024001',
    patientId: 'p1001',
    patientName: 'Evelyn Parker',
    patientMrn: 'NS-008421',
    mrn: 'NS-008421',
    doctorName: 'Dr. Maya Chen',
    orderedBy: 'Dr. Maya Chen',
    testName: 'Troponin I High Sensitivity',
    category: 'Cardiology',
    department: 'Emergency Medicine',
    orderDate: ago(27),
    priority: 'STAT',
    status: 'In Analysis',
    specimenType: 'Serum',
  },
  {
    id: 'lab-2',
    orderNumber: 'LAB-2024002',
    patientId: 'p1007',
    patientName: 'Nadia Hassan',
    patientMrn: 'NS-008419',
    mrn: 'NS-008419',
    doctorName: 'Dr. Maya Chen',
    orderedBy: 'Dr. Maya Chen',
    testName: 'CBC with Differential, Lactate, CRP, Renal Panel',
    category: 'Hematology',
    department: 'Emergency Medicine',
    orderDate: ago(51),
    priority: 'STAT',
    status: 'Completed',
    specimenType: 'Blood',
    results: [
      { parameter: 'WBC', value: '0.8', unit: '×10⁹/L', referenceRange: '4.0-11.0', flag: 'Critical' },
      { parameter: 'Neutrophils', value: '0.2', unit: '×10⁹/L', referenceRange: '1.8-7.5', flag: 'Critical' },
      { parameter: 'CRP', value: '186', unit: 'mg/L', referenceRange: '<10', flag: 'Critical' },
      { parameter: 'Lactate', value: '2.8', unit: 'mmol/L', referenceRange: '0.5-2.2', flag: 'High' },
      { parameter: 'Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.6-1.3', flag: 'Normal' },
      { parameter: 'eGFR', value: '61', unit: 'mL/min', referenceRange: '>60', flag: 'Normal' },
    ],
    technicianName: 'Felix Adeyemi, MLS',
    signedOffBy: 'Dr. Priya Nair',
  },
  {
    id: 'lab-3',
    orderNumber: 'LAB-2024003',
    patientId: 'p1014',
    patientName: 'George Mensah',
    patientMrn: 'NS-008414',
    mrn: 'NS-008414',
    doctorName: 'Dr. Rachel Stein',
    orderedBy: 'Dr. Rachel Stein',
    testName: 'FBC, CRP, Renal Profile, Glucose',
    category: 'Biochemistry',
    department: 'Internal Medicine',
    orderDate: ago(36),
    priority: 'Routine',
    status: 'In Analysis',
    specimenType: 'Blood',
  },
]

export const imagingOrdersSeed: ImagingOrder[] = [
  {
    id: 'img-1',
    orderNumber: 'IMG-2024001',
    patientId: 'p1001',
    patientName: 'Evelyn Parker',
    patientMrn: 'NS-008421',
    mrn: 'NS-008421',
    modality: 'X-Ray',
    bodyPart: 'Chest',
    department: 'Emergency Medicine',
    indication: 'Acute coronary syndrome workup, rule out pulmonary edema',
    priority: 'Urgent',
    requestedBy: 'Dr. Maya Chen',
    requestedByRole: 'Emergency Physician',
    requestedAt: ago(22),
    status: 'Requested',
  },
  {
    id: 'img-2',
    orderNumber: 'IMG-2024002',
    patientId: 'p1003',
    patientName: 'Amina Yusuf',
    patientMrn: 'NS-008371',
    mrn: 'NS-008371',
    modality: 'CT Scan',
    bodyPart: 'Head and Neck Angiography',
    department: 'Neurology',
    indication: 'Acute ischemic stroke, NIHSS 11, evaluate for LVO',
    priority: 'STAT',
    requestedBy: 'Dr. Tomas Reid',
    requestedByRole: 'Neurologist',
    requestedAt: ago(21),
    status: 'In Progress',
  },
  {
    id: 'img-3',
    orderNumber: 'IMG-2024003',
    patientId: 'p1002',
    patientName: 'Mateo Rodriguez',
    patientMrn: 'NS-008422',
    mrn: 'NS-008422',
    modality: 'X-Ray',
    bodyPart: 'Right Forearm',
    department: 'Emergency Medicine',
    indication: 'Open fracture evaluation',
    priority: 'Urgent',
    requestedBy: 'Dr. Maya Chen',
    requestedByRole: 'Emergency Physician',
    requestedAt: ago(45),
    status: 'Completed',
    reportText: 'Displaced distal radial fracture with associated ulnar styloid fracture. No radiopaque foreign body. Alignment: significant angulation and shortening.',
    impression: 'Displaced distal radius fracture with ulnar styloid fracture. Recommend urgent orthopedic reduction and fixation.',
    images: [
      { id: 'img-3-1', title: 'Right Forearm AP', url: '/placeholder.svg', modality: 'X-Ray', timestamp: ago(40), sliceInfo: 'AP View', keyFindings: 'Displaced distal radial fracture' },
      { id: 'img-3-2', title: 'Right Forearm Lateral', url: '/placeholder.svg', modality: 'X-Ray', timestamp: ago(40), sliceInfo: 'Lateral View', keyFindings: 'Ulnar styloid fracture' },
    ],
    technicianName: 'Noah Williams, RT',
    completedAt: ago(38),
  },
  {
    id: 'img-4',
    orderNumber: 'IMG-2024004',
    patientId: 'p1009',
    patientName: 'Sofia Petrova',
    patientMrn: 'NS-008402',
    mrn: 'NS-008402',
    modality: 'MRI',
    bodyPart: 'Brain',
    department: 'Radiology',
    indication: 'Persistent headache, rule out mass lesion, no contrast due to allergy',
    priority: 'Routine',
    requestedBy: 'Dr. Tomas Reid',
    requestedByRole: 'Neurologist',
    requestedAt: ago(38),
    status: 'Ordered',
  },
]

export const staffSeed: StaffMember[] = [
  { id: 'staff-1', name: 'Dr. Maya Chen', role: 'Physician', department: 'Emergency Medicine', specialty: 'Emergency Medicine', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'EMG-001', pagerNumber: 'EMG-001', email: 'maya.chen@hospital.com', phone: '+1-555-1001', activeCases: 4, licenseNumber: 'MD-12345' },
  { id: 'staff-2', name: 'Sarah Okafor, RN', role: 'Head Nurse', department: 'Emergency Medicine', specialty: 'Triage Nursing', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'TRI-001', pagerNumber: 'TRI-001', email: 'sarah.okafor@hospital.com', phone: '+1-555-1002', activeCases: 12, licenseNumber: 'RN-67890' },
  { id: 'staff-3', name: 'Dr. Amir Rahman', role: 'Senior Specialist', department: 'Cardiology', specialty: 'Interventional Cardiology', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'CAR-001', pagerNumber: 'CAR-001', email: 'amir.rahman@hospital.com', phone: '+1-555-1003', activeCases: 8, licenseNumber: 'MD-23456' },
  { id: 'staff-4', name: 'Dr. Leah Morgan', role: 'Radiologist', department: 'Radiology', specialty: 'Diagnostic Radiology', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'RAD-001', pagerNumber: 'RAD-001', email: 'leah.morgan@hospital.com', phone: '+1-555-1004', activeCases: 15, licenseNumber: 'MD-34567' },
  { id: 'staff-5', name: 'Jon Bell', role: 'Physician', department: 'Administration', specialty: 'Bed Management', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'BED-001', pagerNumber: 'BED-001', email: 'jon.bell@hospital.com', phone: '+1-555-1005', activeCases: 0, licenseNumber: 'ADM-001' },
  { id: 'staff-6', name: 'Nina Wallace, PharmD', role: 'Pharmacist', department: 'Pharmacy', specialty: 'Clinical Pharmacy', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'PHA-001', pagerNumber: 'PHA-001', email: 'nina.wallace@hospital.com', phone: '+1-555-1006', activeCases: 5, licenseNumber: 'PH-001' },
  { id: 'staff-7', name: 'Dr. Ana Costa', role: 'Senior Specialist', department: 'ICU', specialty: 'Critical Care', shift: 'Evening (15:00 - 23:00)', onDuty: false, isOnDuty: false, pager: 'ICU-001', pagerNumber: 'ICU-001', email: 'ana.costa@hospital.com', phone: '+1-555-1007', activeCases: 6, licenseNumber: 'MD-45678' },
  { id: 'staff-8', name: 'Ms. Keiko Sato', role: 'Surgeon', department: 'Surgery', specialty: 'Orthopedic Surgery', shift: 'Morning (07:00 - 15:00)', onDuty: true, isOnDuty: true, pager: 'SUR-001', pagerNumber: 'SUR-001', email: 'keiko.sato@hospital.com', phone: '+1-555-1008', activeCases: 3, licenseNumber: 'MD-56789' },
]

export const emergencyBroadcastsSeed: EmergencyBroadcast[] = [
  { id: 'eb-1', codeType: 'Code Blue', location: 'ICU Bed 12', description: 'Cardiac arrest - adult patient', initiatedAt: ago(5), initiator: 'Dr. Ana Costa', active: true },
  { id: 'eb-2', codeType: 'Code Red', location: 'Level 2 Storage', description: 'Fire alarm activated - electrical room', initiatedAt: ago(15), initiator: 'Security Desk', active: true },
  { id: 'eb-3', codeType: 'Code Trauma', location: 'Emergency Bay 1', description: 'Level 1 trauma - MVC, 2 patients incoming', initiatedAt: ago(2), initiator: 'EMS Dispatch', active: true },
]

export const auditEventsSeed: AuditEvent[] = [
  { id: 'audit-1', timestamp: ago(2), user: 'Dr. Maya Chen', userName: 'Dr. Maya Chen', role: 'Physician', userRole: 'Physician', category: 'CLINICAL', action: 'Patient Triage', details: 'Triaged Evelyn Parker (NS-008421) as ESI 2', patientMrn: 'NS-008421' },
  { id: 'audit-2', timestamp: ago(5), user: 'Sarah Okafor', userName: 'Sarah Okafor, RN', role: 'Nurse', userRole: 'Nurse', category: 'TRIAGE', action: 'Triage Completed', details: 'Completed triage for Zoe Campbell (NS-008431) - ESI 4', patientMrn: 'NS-008431' },
  { id: 'audit-3', timestamp: ago(10), user: 'Nina Wallace', userName: 'Nina Wallace, PharmD', role: 'Pharmacist', userRole: 'Pharmacist', category: 'PHARMACY', action: 'Medication Dispensed', details: 'Dispensed Ceftriaxone 1g IV for Mateo Rodriguez', patientMrn: 'NS-008422' },
  { id: 'audit-4', timestamp: ago(15), user: 'Jon Bell', userName: 'Jon Bell', role: 'Coordinator', userRole: 'Coordinator', category: 'ADMISSION', action: 'Patient Transfer', details: 'Transferred Nadia Hassan from Emergency to ICU HDU 03', patientMrn: 'NS-008419' },
  { id: 'audit-5', timestamp: ago(20), user: 'Dr. Ana Costa', userName: 'Dr. Ana Costa', role: 'Senior Specialist', userRole: 'Senior Specialist', category: 'EMERGENCY', action: 'Code Blue Activated', details: 'Activated Code Blue for ICU Bed 12', patientMrn: undefined, ipAddress: '10.0.1.45' },
]

export const triageRecordsSeed: TriageRecord[] = [
  {
    id: 'triage-1',
    patientId: 'p1001',
    patientName: 'Evelyn Parker',
    mrn: 'NS-008421',
    patientMrn: 'NS-008421',
    age: 67,
    gender: 'Female',
    arrivalTime: ago(46),
    triageStartTime: ago(44),
    triageCompletedTime: ago(41),
    chiefComplaint: 'Central chest pressure radiating to left arm',
    vitals: { heartRate: 108, bloodPressureSystolic: 158, bloodPressureDiastolic: 94, bloodPressure: '158/94', respiratoryRate: 22, oxygenSaturation: 95, temperature: 36.8, painScale: 7, painLevel: 7, gcs: 15, recordedAt: ago(46), glasgowComaScale: 15 },
    focusedHistory: { briefHpi: 'Chest pressure began 50 min ago while gardening. Radiates to left arm. Associated diaphoresis and dyspnea. Aspirin 300mg given by EMS.', redFlags: ['Chest pain with radiation', 'Diaphoresis', 'Age > 65', 'HTN, DM'], allergies: ['Penicillin'], currentMedications: ['Metoprolol', 'Metformin', 'Lisinopril'], relevantPastHistory: ['Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia'], pregnancyStatus: 'Not Applicable' },
    focusedExam: { generalAppearance: 'Moderate Distress', systemFocusedFindings: 'CVS: Tachycardic, regular rhythm, no murmurs. RS: Bilateral air entry, no crackles. Abd: Soft, non-tender.', redFlagFindings: ['Tachycardia', 'Hypertensive', 'Diaphoresis'] },
    esiLevel: 2,
    acuityRationale: ['High-risk cardiac presentation', 'Age > 65 with cardiac risk factors', 'Multiple resources anticipated (ECG, troponin, cardiology)'],
    carePathway: 'Emergency',
    targetDepartment: 'Cardiology',
    assignedDoctorName: 'Dr. Maya Chen',
    triageNurseName: 'Sarah Okafor, RN',
    triageNurseId: 'TR-2216',
    triageNotesForDoctor: 'High suspicion ACS. ECG shows ST depression V4-V6. Troponin pending. Cardiology consult requested.',
    status: 'Triage Completed',
    waitingTimeMinutes: 5,
  },
]

export function createInitialState(): HospitalState {
  const patients = patientSeed()
  const referrals = referralSeed()
  const orders = orderSeed()
  return {
    patients,
    departments: departmentSeed.map((department) => ({ ...department, services: [...department.services] })),
    referrals,
    orders,
    activities: [
      { id: uid('ac'), at: ago(4), actor: 'Dr. Leah Morgan', action: 'started CT angiography for Amina Yusuf', patientId: 'p1003', department: 'radiology' },
      { id: uid('ac'), at: ago(9), actor: 'Sarah Okafor, RN', action: 'completed ESI 4 triage for Zoe Campbell', patientId: 'p1011', department: 'emergency' },
      { id: uid('ac'), at: ago(14), actor: 'Ms. Keiko Sato', action: 'accepted the orthopaedic referral for Mateo Rodriguez', patientId: 'p1002', department: 'surgery' },
      { id: uid('ac'), at: ago(17), actor: 'Jon Bell', action: "completed Nadia Hassan's transfer to HDU 03", patientId: 'p1007', department: 'icu' },
      { id: uid('ac'), at: ago(24), actor: 'Dr. Maya Chen', action: 'sent an emergent cardiology referral for Evelyn Parker', patientId: 'p1001', department: 'cardiology' },
    ],
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

export function useFormulary(): FormularyItem[] {
  return formularySeed
}

export function usePrescriptions(): Prescription[] {
  return prescriptionsSeed
}

export function useLabOrders(): LabOrder[] {
  return labOrdersSeed
}

export function useImagingOrders(): ImagingOrder[] {
  return imagingOrdersSeed
}

export function useInvoices(): Invoice[] {
  return invoicesSeed()
}

export function useAppointments(): Appointment[] {
  return appointmentsSeed()
}

export function useStaff(): StaffMember[] {
  return staffSeed
}

export function useAuditEvents(): AuditEvent[] {
  return auditEventsSeed
}

const invoicesSeed = (): Invoice[] => [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2024001',
    patientId: 'p1001',
    patientName: 'Evelyn Parker',
    mrn: 'NS-008421',
    patientMrn: 'NS-008421',
    date: ago(40),
    issuedDate: ago(40),
    dueDate: ago(-30),
    items: [
      { id: 'item-1', description: 'Emergency Department Visit - Level 5', cptCode: '99285', category: 'Consultation', quantity: 1, unitPrice: 450, total: 450 },
      { id: 'item-2', description: 'Troponin I High Sensitivity', cptCode: '84484', category: 'Laboratory', quantity: 1, unitPrice: 85, total: 85 },
      { id: 'item-3', description: 'ECG 12-lead', cptCode: '93000', category: 'Procedure', quantity: 1, unitPrice: 120, total: 120 },
    ],
    subtotal: 655,
    tax: 52.40,
    insuranceDiscount: 262,
    totalAmount: 445.40,
    patientPayable: 111.35,
    insuranceCovered: 334.05,
    paidAmount: 111.35,
    insuranceProvider: 'BlueCross BlueShield',
    status: 'Paid',
    insuranceClaimId: 'CLM-789456',
    paymentMethod: 'Insurance',
    paidDate: ago(20),
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2024002',
    patientId: 'p1002',
    patientName: 'Mateo Rodriguez',
    mrn: 'NS-008422',
    patientMrn: 'NS-008422',
    date: ago(70),
    issuedDate: ago(70),
    dueDate: ago(-10),
    items: [
      { id: 'item-4', description: 'Emergency Department Visit - Level 4', cptCode: '99284', category: 'Consultation', quantity: 1, unitPrice: 320, total: 320 },
      { id: 'item-5', description: 'X-ray Right Forearm', cptCode: '73090', category: 'Radiology', quantity: 1, unitPrice: 180, total: 180 },
      { id: 'item-6', description: 'Ceftriaxone 1g IV', cptCode: 'J0696', category: 'Pharmacy', quantity: 7, unitPrice: 4.20, total: 29.40 },
    ],
    subtotal: 529.40,
    tax: 42.35,
    insuranceDiscount: 158.82,
    totalAmount: 412.93,
    patientPayable: 103.23,
    insuranceCovered: 309.70,
    paidAmount: 0,
    insuranceProvider: 'Aetna',
    status: 'Claim Submitted',
    insuranceClaimId: 'CLM-456789',
    paymentMethod: 'Insurance',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2024003',
    patientId: 'p1005',
    patientName: 'Grace Bennett',
    mrn: 'NS-007914',
    patientMrn: 'NS-007914',
    date: ago(2800),
    issuedDate: ago(2800),
    dueDate: ago(-60),
    items: [
      { id: 'item-7', description: 'Total Hip Arthroplasty', cptCode: '27130', category: 'Procedure', quantity: 1, unitPrice: 12500, total: 12500 },
      { id: 'item-8', description: 'Post-op Room & Nursing (3 days)', cptCode: '99231', category: 'Room & Nursing', quantity: 3, unitPrice: 850, total: 2550 },
      { id: 'item-9', description: 'Physical Therapy Sessions', cptCode: '97110', category: 'Procedure', quantity: 6, unitPrice: 120, total: 720 },
      { id: 'item-10', description: 'Medications - Discharge', cptCode: '99070', category: 'Pharmacy', quantity: 1, unitPrice: 340, total: 340 },
    ],
    subtotal: 16110,
    tax: 1288.80,
    insuranceDiscount: 8055,
    totalAmount: 9343.80,
    patientPayable: 2335.95,
    insuranceCovered: 7007.85,
    paidAmount: 2335.95,
    insuranceProvider: 'Medicare',
    status: 'Paid',
    insuranceClaimId: 'CLM-123456',
    paymentMethod: 'Insurance',
    paidDate: ago(2700),
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2024004',
    patientId: 'p1010',
    patientName: 'Ethan Brooks',
    mrn: 'NS-005190',
    patientMrn: 'NS-005190',
    date: ago(4100),
    issuedDate: ago(4100),
    dueDate: ago(-30),
    items: [
      { id: 'item-11', description: 'Inpatient Admission - COPD Exacerbation', cptCode: '99223', category: 'Consultation', quantity: 1, unitPrice: 480, total: 480 },
      { id: 'item-12', description: 'Room & Nursing (3 days)', cptCode: '99231', category: 'Room & Nursing', quantity: 3, unitPrice: 850, total: 2550 },
      { id: 'item-13', description: 'Nebulizer Treatments', cptCode: '94640', category: 'Procedure', quantity: 12, unitPrice: 65, total: 780 },
      { id: 'item-14', description: 'Chest X-ray Portable', cptCode: '71045', category: 'Radiology', quantity: 2, unitPrice: 150, total: 300 },
    ],
    subtotal: 4110,
    tax: 328.80,
    insuranceDiscount: 1644,
    totalAmount: 2794.80,
    patientPayable: 698.70,
    insuranceCovered: 2096.10,
    paidAmount: 0,
    insuranceProvider: 'Cigna',
    status: 'Overdue',
    insuranceClaimId: 'CLM-789012',
    paymentMethod: 'Insurance',
  },
]

const appointmentsSeed = (): Appointment[] => [
  {
    id: 'apt-1',
    patientId: 'p1001',
    patientName: 'Evelyn Parker',
    mrn: 'NS-008421',
    doctorId: 'staff-1',
    doctorName: 'Dr. Maya Chen',
    department: 'Cardiology',
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[1].slice(0, 5),
    durationMinutes: 30,
    type: 'Telehealth',
    status: 'Confirmed',
    chiefReason: 'Post-ACS follow-up, medication review',
    reason: 'Post-ACS follow-up, medication review',
    roomNumber: 'Virtual Room 1',
  },
  {
    id: 'apt-2',
    patientId: 'p1003',
    patientName: 'Amina Yusuf',
    mrn: 'NS-008371',
    doctorId: 'staff-3',
    doctorName: 'Dr. Tomas Reid',
    department: 'Neurology',
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00',
    durationMinutes: 45,
    type: 'Telehealth Virtual',
    status: 'Scheduled',
    chiefReason: 'Stroke follow-up, NIHSS reassessment',
    reason: 'Stroke follow-up, NIHSS reassessment',
    roomNumber: 'Virtual Room 2',
  },
  {
    id: 'apt-3',
    patientId: 'p1005',
    patientName: 'Grace Bennett',
    mrn: 'NS-007914',
    doctorId: 'staff-8',
    doctorName: 'Ms. Keiko Sato',
    department: 'Surgery',
    dateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:30',
    durationMinutes: 30,
    type: 'In-Person',
    status: 'Completed',
    chiefReason: 'Post-op hip replacement, 2-week check',
    reason: 'Post-op hip replacement, 2-week check',
    roomNumber: 'Surgery Clinic 3',
  },
  {
    id: 'apt-4',
    patientId: 'p1008',
    patientName: 'Oliver Wright',
    mrn: 'NS-006582',
    doctorId: 'staff-3',
    doctorName: 'Dr. Amir Rahman',
    department: 'Cardiology',
    dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '09:00',
    durationMinutes: 30,
    type: 'Telehealth',
    status: 'Scheduled',
    chiefReason: 'Post-PCI follow-up, echo review',
    reason: 'Post-PCI follow-up, echo review',
    roomNumber: 'Virtual Room 3',
  },
  {
    id: 'apt-5',
    patientId: 'p1013',
    patientName: 'Hannah Osei',
    mrn: 'NS-008433',
    doctorId: 'staff-2',
    doctorName: 'Dr. Hannah Reid',
    department: 'OB/GYN',
    dateTime: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].slice(0, 5),
    durationMinutes: 30,
    type: 'Telehealth Virtual',
    status: 'In Progress',
    chiefReason: 'Postpartum hypertension follow-up',
    reason: 'Postpartum hypertension follow-up',
    roomNumber: 'Virtual Room 4',
  },
]