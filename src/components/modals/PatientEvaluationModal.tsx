import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePlus,
  FileText,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Pill,
  Plus,
  Printer,
  ShieldAlert,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
  Zap,
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
} from 'lucide-react';
import {
  DifferentialDiagnosis,
  ImagingModality,
  LabOrder,
  Patient,
  PatientEncounter,
  SystemExamFinding,
  VitalSigns,
} from '../../types';
import { useHospital } from '../../context/HospitalContext';

interface PatientEvaluationModalProps {
  patient: Patient;
  onClose: () => void;
  onOpenPrescribe: (patient: Patient) => void;
}

export const PatientEvaluationModal: React.FC<PatientEvaluationModalProps> = ({
  patient,
  onClose,
  onOpenPrescribe,
}) => {
  const {
    currentUser,
    isPhysician,
    patientEncounters,
    savePatientEncounter,
    createLabOrder,
    createImagingOrder,
    labOrders,
    imagingOrders,
  } = useHospital();

  const existingEncounter = patientEncounters.find(e => e.patientId === patient.id);
  const triageRef = patient.latestTriage;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'soap' | 'exam' | 'ddx' | 'orders' | 'results' | 'plan'>('soap');

  // Section 1: Subjective History
  const [chiefComplaint, setChiefComplaint] = useState(
    existingEncounter?.chiefComplaint || triageRef?.chiefComplaint || patient.diagnoses[0] || 'Acute clinical evaluation'
  );
  const [hpi, setHpi] = useState(
    existingEncounter?.hpi ||
      (triageRef
        ? `Patient presented via ${triageRef.carePathway} pathway. Triage note: ${triageRef.focusedHistory?.briefHpi || ''}. Reports progressive onset over past 24-48 hours.`
        : 'Patient presents with acute onset of symptoms. Reports progressive discomfort over the past 24-48 hours.')
  );
  const [pmh, setPmh] = useState(
    existingEncounter?.pmh ||
      (triageRef?.focusedHistory?.relevantPastHistory?.join(', ') ||
        'Essential Hypertension, Hyperlipidemia. No prior major surgical complications noted.')
  );
  const [medicationHistory, setMedicationHistory] = useState(
    existingEncounter?.medicationHistory ||
      (triageRef?.focusedHistory?.currentMedications?.join(', ') ||
        patient.activeMedications.map(m => `${m.name} ${m.dosage}`).join(', ') ||
        'No regular outpatient medications reported.')
  );
  const [allergiesReview, setAllergiesReview] = useState(
    existingEncounter?.allergiesReview || patient.allergies.join(', ')
  );
  const [familyHistory, setFamilyHistory] = useState(
    existingEncounter?.familyHistory ||
      'Non-contributory for early coronary artery disease, coagulopathies, or early malignancy.'
  );
  const [socialHistory, setSocialHistory] = useState(
    existingEncounter?.socialHistory ||
      'Denies tobacco, alcohol, or illicit substance use. Independent in activities of daily living.'
  );

  // Section 2: Vitals & 8-System Physical Exam
  const [vitals, setVitals] = useState<VitalSigns>(
    existingEncounter?.vitals || triageRef?.vitals || patient.vitals
  );

  const initialExamSystems: SystemExamFinding[] = [
    { system: 'General', systemName: 'General Appearance', findings: triageRef?.focusedExam?.generalAppearance ? `Appearance: ${triageRef.focusedExam.generalAppearance}. Alert and oriented.` : 'Alert, oriented x 3, in mild distress.', isNormal: false },
    { system: 'CVS', systemName: 'Cardiovascular (CVS)', findings: 'Regular rate and rhythm, normal S1 and S2. Peripheral pulses 2+ symmetric. No murmurs.', isNormal: true },
    { system: 'RS', systemName: 'Respiratory System (RS)', findings: 'Clear to auscultation bilaterally, no wheezes, rales, or rhonchi.', isNormal: true },
    { system: 'CNS', systemName: 'Neurological (CNS)', findings: 'Cranial nerves II-XII grossly intact. No focal motor or sensory deficits. GCS 15.', isNormal: true },
    { system: 'GI', systemName: 'Gastrointestinal (GI)', findings: 'Soft, non-distended, normoactive bowel sounds, mild localized tenderness.', isNormal: false },
    { system: 'MSK', systemName: 'Musculoskeletal (MSK)', findings: 'Full range of motion in extremities, no joint effusion or gross deformity.', isNormal: true },
    { system: 'HEENT', systemName: 'HEENT', findings: 'Pupils equal, round, and reactive to light. Oropharynx clear.', isNormal: true },
    { system: 'Skin', systemName: 'Integumentary', findings: 'Warm and dry, intact turgor, no petechiae or suspicious lesions.', isNormal: true },
  ];

  const [physicalExam, setPhysicalExam] = useState<SystemExamFinding[]>(
    existingEncounter?.physicalExam || initialExamSystems
  );

  // Section 3: Differential Diagnosis (DDx)
  const initialDDx: DifferentialDiagnosis[] = existingEncounter?.differentialDiagnoses || [
    {
      id: 'ddx-1',
      condition: patient.diagnoses[0] || 'Acute Clinical Syndrome',
      icd10: 'R68.89',
      likelihood: 'High',
      isWorkingDiagnosis: true,
      rationale: 'Primary presenting complaint and triage telemetry consistent with acute diagnosis.',
    },
    {
      id: 'ddx-2',
      condition: 'Secondary Metabolic Disturbance',
      icd10: 'E88.9',
      likelihood: 'Moderate',
      isWorkingDiagnosis: false,
      rationale: 'Pending electrolyte and biomarker panel confirmation.',
    },
  ];

  const [ddxList, setDdxList] = useState<DifferentialDiagnosis[]>(initialDDx);
  const [newDdxCondition, setNewDdxCondition] = useState('');
  const [newDdxIcd, setNewDdxIcd] = useState('');
  const [newDdxLikelihood, setNewDdxLikelihood] = useState<'High' | 'Moderate' | 'Low'>('High');
  const [newDdxRationale, setNewDdxRationale] = useState('');

  // Section 4: CPOE Orders inside Encounter
  const [newLabTestName, setNewLabTestName] = useState('Complete Blood Count (CBC) with Diff');
  const [newLabCategory, setNewLabCategory] = useState<LabOrder['category']>('Hematology');
  const [newLabPriority, setNewLabPriority] = useState<'Routine' | 'STAT'>('STAT');

  const [newImgModality, setNewImgModality] = useState<ImagingModality>('CT Scan');
  const [newImgBodyPart, setNewImgBodyPart] = useState('Chest & Thorax with Contrast');
  const [newImgIndication, setNewImgIndication] = useState('Evaluate acute symptoms and rule out vascular/parenchymal pathology');
  const [newImgPriority, setNewImgPriority] = useState<'Routine' | 'Urgent' | 'STAT'>('STAT');

  // Section 5: Plan & Disposition
  const [treatmentPlan, setTreatmentPlan] = useState(
    existingEncounter?.treatmentPlan ||
      '1. Initiate targeted pharmacotherapy and IV fluid maintenance.\n2. Continuous telemetry monitoring for SpO2 and cardiac rhythm.\n3. Re-evaluate laboratory markers upon technician completion.'
  );
  const [followUpPlan, setFollowUpPlan] = useState(
    existingEncounter?.followUpPlan ||
      'Clinical rounds in 4 hours. Daily CBC/CMP while inpatient. Discharge criteria: afebrile 24h, oral tolerance.'
  );
  const [disposition, setDisposition] = useState<PatientEncounter['disposition']>(
    existingEncounter?.disposition || 'Admit to Inpatient Ward'
  );
  const [referrals, setReferrals] = useState(
    existingEncounter?.referrals || 'Internal consult requested: Diagnostic Radiology & Clinical Pharmacy review.'
  );

  // Speech Recognition / Dictate Note State
  const [dictatingTarget, setDictatingTarget] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const startDictation = (target: string) => {
    setDictatingTarget(target);
    setTranscript('');
    setInterimTranscript('');
    setSpeechError(null);

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechError('Voice dictation is not supported in this browser. Please use Google Chrome.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setTranscript(prev => prev + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        setSpeechError(`Microphone access error (${event.error}). Please allow microphone permissions.`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err: any) {
      setSpeechError(`Could not start dictation: ${err.message || err}`);
    }
  };

  const stopDictation = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const insertDictatedText = () => {
    stopDictation();
    const textToInsert = (transcript + ' ' + interimTranscript).trim();
    if (!textToInsert) {
      setDictatingTarget(null);
      return;
    }

    if (dictatingTarget === 'hpi') {
      setHpi(prev => (prev ? prev + ' ' + textToInsert : textToInsert));
    } else if (dictatingTarget === 'treatmentPlan') {
      setTreatmentPlan(prev => (prev ? prev + '\n' + textToInsert : textToInsert));
    } else if (dictatingTarget && dictatingTarget.startsWith('exam-')) {
      const idx = parseInt(dictatingTarget.split('-')[1], 10);
      setPhysicalExam(prev => {
        const copy = [...prev];
        if (copy[idx]) {
          copy[idx] = {
            ...copy[idx],
            findings: copy[idx].findings ? copy[idx].findings + ' ' + textToInsert : textToInsert,
          };
        }
        return copy;
      });
    }
    setDictatingTarget(null);
  };

  const patientLabs = labOrders.filter(l => l.patientId === patient.id || l.mrn === patient.mrn);
  const patientImaging = imagingOrders.filter(i => i.patientId === patient.id || i.mrn === patient.mrn);

  const handleUpdateExamFinding = (idx: number, findings: string, isNormal: boolean) => {
    setPhysicalExam(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], findings, isNormal };
      return copy;
    });
  };

  const handleAddDdx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDdxCondition.trim()) return;

    const newDiagnosis: DifferentialDiagnosis = {
      id: `ddx-${Date.now()}`,
      condition: newDdxCondition.trim(),
      icd10: newDdxIcd.trim() || 'R69',
      likelihood: newDdxLikelihood,
      isWorkingDiagnosis: ddxList.length === 0,
      rationale: newDdxRationale.trim(),
    };

    setDdxList(prev => [...prev, newDiagnosis]);
    setNewDdxCondition('');
    setNewDdxIcd('');
    setNewDdxRationale('');
  };

  const handleSetWorkingDiagnosis = (id: string) => {
    setDdxList(prev =>
      prev.map(d => ({
        ...d,
        isWorkingDiagnosis: d.id === id,
      }))
    );
  };

  const handleDeleteDdx = (id: string) => {
    setDdxList(prev => prev.filter(d => d.id !== id));
  };

  const handleQuickOrderLab = () => {
    createLabOrder({
      patientId: patient.id,
      patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      mrn: patient.mrn,
      testName: newLabTestName,
      category: newLabCategory,
      priority: newLabPriority,
      orderedBy: currentUser.name,
      doctorName: `${currentUser.name} (${currentUser.role})`,
      specimenType: 'Blood (Venous)',
    });
  };

  const handleQuickOrderImaging = () => {
    createImagingOrder({
      patientId: patient.id,
      patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      mrn: patient.mrn,
      modality: newImgModality,
      bodyPart: newImgBodyPart,
      indication: newImgIndication,
      priority: newImgPriority,
      requestedBy: currentUser.name,
      requestedByRole: currentUser.role,
    });
  };

  const handleSaveEncounter = (status: 'In Progress' | 'Finalized') => {
    const encounter: PatientEncounter = {
      id: existingEncounter?.id || `enc-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      mrn: patient.mrn,
      physicianId: currentUser.id,
      physicianName: currentUser.name,
      physicianRole: currentUser.role,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      triageSummaryRef: triageRef
        ? {
            esiLevel: triageRef.esiLevel,
            triageNurse: triageRef.triageNurseName,
            triageTime: triageRef.arrivalTime,
            chiefComplaint: triageRef.chiefComplaint,
            initialVitals: triageRef.vitals,
            focusedHpi: triageRef.focusedHistory?.briefHpi || '',
            redFlags: triageRef.focusedHistory?.redFlags || [],
            nurseNotes: triageRef.triageNotesForDoctor,
          }
        : undefined,
      chiefComplaint,
      hpi,
      pmh,
      medicationHistory,
      allergiesReview,
      familyHistory,
      socialHistory,
      vitals,
      physicalExam,
      differentialDiagnoses: ddxList,
      investigationOrderIds: patientLabs.map(l => l.id),
      imagingOrderIds: patientImaging.map(i => i.id),
      prescriptionIds: patient.activeMedications.map(m => m.id),
      treatmentPlan,
      followUpPlan,
      disposition,
      referrals,
    };

    savePatientEncounter(encounter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl flex flex-col max-h-[92vh] shadow-2xl text-slate-100 overflow-hidden relative">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-800 text-cyan-400 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white">
                  Physician Clinical Evaluation — {patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  MRN: {patient.mrn}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Attending: {currentUser.name} ({currentUser.role}) | Dept: {patient.department}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/60 px-6 py-2 border-b border-slate-800 flex items-center space-x-2 overflow-x-auto shrink-0">
          {[
            { id: 'soap', label: '1. Subjective (HPI & PMH)' },
            { id: 'exam', label: '2. 8-System Exam' },
            { id: 'ddx', label: '3. Differential Diagnosis' },
            { id: 'orders', label: '4. CPOE (Labs & Imaging)' },
            { id: 'results', label: '5. Diagnostic Results & PACS' },
            { id: 'plan', label: '6. Plan & Disposition' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Read-Only Triage Summary Banner */}
          {triageRef && (
            <div className="bg-cyan-950/30 border border-cyan-900/60 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Read-Only Triage Telemetry Reference</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold">
                  ESI Level {triageRef.esiLevel} ({triageRef.triageNotesForDoctor ? 'Acuity Assessed' : 'Urgent'})
                </span>
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-white">Chief Complaint:</strong> {triageRef.chiefComplaint} |{' '}
                <strong className="text-white">Vitals:</strong> HR {triageRef.vitals.heartRate} bpm, BP{' '}
                {triageRef.vitals.bloodPressureSystolic}/{triageRef.vitals.bloodPressureDiastolic} mmHg, SpO2{' '}
                {triageRef.vitals.oxygenSaturation}%, Temp {triageRef.vitals.temperature}°C
              </p>
            </div>
          )}

          {/* TAB 1: Subjective History */}
          {activeTab === 'soap' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                  Chief Complaint:
                </label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px]">
                    Expanded History of Present Illness (HPI):
                  </label>
                  <button
                    type="button"
                    onClick={() => startDictation('hpi')}
                    className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] font-mono font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Dictate Note</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={hpi}
                  onChange={e => setHpi(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white font-sans text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                    Past Medical & Surgical History (PMH):
                  </label>
                  <textarea
                    rows={3}
                    value={pmh}
                    onChange={e => setPmh(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                    Medication Review & Reconciliation:
                  </label>
                  <textarea
                    rows={3}
                    value={medicationHistory}
                    onChange={e => setMedicationHistory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                    Allergies & Adverse Drug Reactions:
                  </label>
                  <input
                    type="text"
                    value={allergiesReview}
                    onChange={e => setAllergiesReview(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                    Family Medical History:
                  </label>
                  <input
                    type="text"
                    value={familyHistory}
                    onChange={e => setFamilyHistory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                  Social History (Occupation, Lifestyle, Substance Use):
                </label>
                <input
                  type="text"
                  value={socialHistory}
                  onChange={e => setSocialHistory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('exam')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <span>Proceed to 8-System Physical Exam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 8-System Physical Exam */}
          {activeTab === 'exam' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                    System-Based Structured Physical Examination:
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    Use Dictate on any organ system
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {physicalExam.map((systemFinding, idx) => (
                    <div
                      key={systemFinding.system}
                      className={`p-3.5 rounded-xl border transition-all ${
                        systemFinding.isNormal
                          ? 'bg-slate-950/60 border-slate-800'
                          : 'bg-amber-950/20 border-amber-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-200 font-mono text-[11px]">
                          {systemFinding.systemName}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => startDictation(`exam-${idx}`)}
                            className="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded text-[10px] font-bold font-mono flex items-center space-x-1 cursor-pointer hover:bg-cyan-900"
                          >
                            <Mic className="w-2.5 h-2.5 text-cyan-400" />
                            <span>Dictate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateExamFinding(idx, systemFinding.findings, true)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                              systemFinding.isNormal
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateExamFinding(idx, systemFinding.findings, false)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                              !systemFinding.isNormal
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Abnormal
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={systemFinding.findings}
                        onChange={e => handleUpdateExamFinding(idx, e.target.value, systemFinding.isNormal)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded p-2 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('soap')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer text-xs"
                >
                  Back to Subjective
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ddx')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <span>Formulate Differential Diagnoses (DDx)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Differential Diagnosis (DDx) */}
          {activeTab === 'ddx' && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block mb-2">
                  Differential Diagnoses Ranked by Likelihood:
                </span>

                <div className="space-y-2">
                  {ddxList.map(ddx => (
                    <div
                      key={ddx.id}
                      className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                        ddx.isWorkingDiagnosis
                          ? 'bg-cyan-950/30 border-cyan-500 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          {ddx.isWorkingDiagnosis && (
                            <span className="text-[10px] font-mono font-bold bg-cyan-600 text-white px-2 py-0.5 rounded shadow">
                              WORKING DIAGNOSIS
                            </span>
                          )}
                          <span className="font-bold text-white text-sm">{ddx.condition}</span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                            ICD-10: {ddx.icd10}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              ddx.likelihood === 'High'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : ddx.likelihood === 'Moderate'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Likelihood: {ddx.likelihood}
                          </span>
                        </div>
                        {ddx.rationale && (
                          <p className="text-xs text-slate-300 pl-1">{ddx.rationale}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 self-end md:self-auto">
                        {!ddx.isWorkingDiagnosis && (
                          <button
                            type="button"
                            onClick={() => handleSetWorkingDiagnosis(ddx.id)}
                            className="text-xs bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Set as Working
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDdx(ddx.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New DDx Form */}
              <form onSubmit={handleAddDdx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-mono uppercase text-slate-300 font-bold block">
                  Add Differential Diagnosis:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Pathology / Condition Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acute Coronary Syndrome, Sepsis, Acute Appendicitis"
                      value={newDdxCondition}
                      onChange={e => setNewDdxCondition(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      ICD-10 Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. I21.9, K35.80"
                      value={newDdxIcd}
                      onChange={e => setNewDdxIcd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Clinical Likelihood
                    </label>
                    <select
                      value={newDdxLikelihood}
                      onChange={e => setNewDdxLikelihood(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    >
                      <option value="High">High Likelihood</option>
                      <option value="Moderate">Moderate Likelihood</option>
                      <option value="Low">Low Likelihood</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Clinical Diagnostic Rationale
                    </label>
                    <input
                      type="text"
                      placeholder="Key symptoms, risk factors, or lab trends supporting this DDx"
                      value={newDdxRationale}
                      onChange={e => setNewDdxRationale(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg border border-slate-700 hover:border-cyan-500 transition-all flex items-center space-x-1 cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Append Diagnosis to DDx</span>
                  </button>
                </div>
              </form>

              <div className="pt-3 border-t border-slate-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('exam')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer text-xs"
                >
                  Back to Physical Exam
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <span>Order Investigations & Imaging</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Investigations & Imaging Requests (CPOE) */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Order Lab Test Form */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                  <FlaskConical className="w-4 h-4" />
                  <span>Request Laboratory Investigation (LIS)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Lab Test Panel
                    </label>
                    <select
                      value={newLabTestName}
                      onChange={e => setNewLabTestName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    >
                      <option value="Complete Blood Count (CBC) with Diff">Complete Blood Count (CBC)</option>
                      <option value="Comprehensive Metabolic Panel (CMP)">Comprehensive Metabolic Panel (CMP)</option>
                      <option value="High-Sensitivity Troponin I (Serial)">High-Sensitivity Troponin I</option>
                      <option value="Serum Lipase & Amylase">Serum Lipase & Amylase</option>
                      <option value="Coagulation Profile (PT/INR/aPTT)">Coagulation Profile (PT/INR/aPTT)</option>
                      <option value="Blood Cultures x 2 Sets">Blood Cultures x 2 Sets</option>
                      <option value="Arterial Blood Gas (ABG)">Arterial Blood Gas (ABG)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">Category</label>
                    <select
                      value={newLabCategory}
                      onChange={e => setNewLabCategory(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    >
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Hematology">Hematology</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Cardiology">Cardiology</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">Priority</label>
                    <select
                      value={newLabPriority}
                      onChange={e => setNewLabPriority(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    >
                      <option value="STAT">STAT (Immediate Processing)</option>
                      <option value="Routine">Routine</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickOrderLab}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow transition-colors flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Transmit Order to Lab Technicians</span>
                </button>
              </div>

              {/* Order Imaging Form */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs">
                  <ImageIcon className="w-4 h-4" />
                  <span>Request Diagnostic Imaging / Radiology (PACS)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">Modality</label>
                    <select
                      value={newImgModality}
                      onChange={e => setNewImgModality(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    >
                      <option value="CT Scan">CT Scan</option>
                      <option value="MRI">MRI</option>
                      <option value="X-Ray">Digital X-Ray</option>
                      <option value="Ultrasound">Ultrasound</option>
                      <option value="Echocardiogram">Echocardiogram</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Anatomical Body Part
                    </label>
                    <input
                      type="text"
                      value={newImgBodyPart}
                      onChange={e => setNewImgBodyPart(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">Urgency</label>
                    <select
                      value={newImgPriority}
                      onChange={e => setNewImgPriority(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    >
                      <option value="STAT">STAT (Trauma / Acute)</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Routine">Routine</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Clinical Indication
                    </label>
                    <input
                      type="text"
                      value={newImgIndication}
                      onChange={e => setNewImgIndication(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickOrderImaging}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg shadow transition-colors flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Transmit Request to Radiology RIS</span>
                </button>
              </div>

              {/* Active Orders Summary */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                  Active Worklist Dispatched for this Patient:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-mono text-purple-400 font-bold block mb-1">
                      Pending & Finalized Labs ({patientLabs.length}):
                    </span>
                    {patientLabs.map(l => (
                      <div key={l.id} className="text-[11px] text-slate-300 flex justify-between">
                        <span>{l.testName}</span>
                        <span className="font-mono text-slate-500">{l.status}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-mono text-violet-400 font-bold block mb-1">
                      Pending & Finalized Scans ({patientImaging.length}):
                    </span>
                    {patientImaging.map(i => (
                      <div key={i.id} className="text-[11px] text-slate-300 flex justify-between">
                        <span>{i.modality} ({i.bodyPart})</span>
                        <span className="font-mono text-slate-500">{i.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('ddx')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer text-xs"
                >
                  Back to DDx
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <span>Review Uploaded Diagnostic Results</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Results & Uploaded PACS Scans */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block mb-2 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <span>Technician-Uploaded Radiology Scans & Reports:</span>
                </span>

                {patientImaging.length === 0 ? (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
                    No imaging studies ordered for this patient yet. Use Tab 4 to dispatch a requisition.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientImaging.map(img => (
                      <div key={img.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white text-sm">
                              {img.modality}: {img.bodyPart}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400 ml-2">
                              {img.orderNumber}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              img.status === 'Report Available'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {img.status}
                          </span>
                        </div>

                        {img.images && img.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {img.images.map(pic => (
                              <div key={pic.id} className="w-32 h-32 rounded-lg overflow-hidden border border-slate-700 bg-black relative shrink-0">
                                <img src={pic.url} alt={pic.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5 text-[10px] font-mono text-white">
                                  <span>{pic.sliceInfo || pic.title}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {img.reportText && (
                          <div className="bg-slate-900/80 p-3 rounded-lg text-xs space-y-1">
                            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                              Technician / Radiologist Findings:
                            </span>
                            <p className="text-slate-200 whitespace-pre-wrap">{img.reportText}</p>
                            {img.impression && (
                              <div className="mt-2 pt-2 border-t border-slate-800">
                                <span className="text-[10px] font-mono uppercase text-violet-300 font-bold block">
                                  Impression:
                                </span>
                                <pre className="font-sans text-slate-200 whitespace-pre-wrap">{img.impression}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block mb-2 flex items-center space-x-1.5">
                  <FlaskConical className="w-4 h-4 text-purple-400" />
                  <span>Technician-Finalized Laboratory Specimen Values:</span>
                </span>

                {patientLabs.length === 0 ? (
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
                    No lab orders recorded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientLabs.map(lab => (
                      <div key={lab.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{lab.testName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{lab.status}</span>
                        </div>

                        {lab.results && lab.results.length > 0 && (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px]">
                                <th className="py-1">Parameter</th>
                                <th className="py-1">Result</th>
                                <th className="py-1">Reference</th>
                                <th className="py-1">Flag</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lab.results.map((r, i) => (
                                <tr key={i} className="border-b border-slate-800/50">
                                  <td className="py-1 text-slate-300 font-medium">{r.parameter}</td>
                                  <td className="py-1 text-white font-bold font-mono">{r.value} {r.unit}</td>
                                  <td className="py-1 text-slate-400 font-mono">{r.referenceRange}</td>
                                  <td className="py-1">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                        r.flag === 'Critical'
                                          ? 'bg-rose-950 text-rose-300'
                                          : r.flag === 'High'
                                          ? 'bg-amber-950 text-amber-300'
                                          : 'bg-slate-800 text-emerald-400'
                                      }`}
                                    >
                                      {r.flag}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer text-xs"
                >
                  Back to Orders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('plan')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer text-xs"
                >
                  <span>Formulate Treatment Plan & Meds</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: Plan & Disposition */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-bold uppercase font-mono text-[10px]">
                    Comprehensive Treatment & Pharmacotherapy Plan:
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => startDictation('treatmentPlan')}
                      className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] font-mono font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
                      <span>Dictate Note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPrescribe(patient)}
                      className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded flex items-center space-x-1 cursor-pointer"
                    >
                      <Pill className="w-3.5 h-3.5" />
                      <span>Launch E-Prescription</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={treatmentPlan}
                  onChange={e => setTreatmentPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                    Follow-Up Criteria & Return Precautions:
                  </label>
                  <textarea
                    rows={3}
                    value={followUpPlan}
                    onChange={e => setFollowUpPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                    Clinical Disposition Decision:
                  </label>
                  <select
                    value={disposition}
                    onChange={e => setDisposition(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold text-xs"
                  >
                    <option value="Admit to Inpatient Ward">Admit to Inpatient Ward</option>
                    <option value="Transfer to ICU">Escalate / Transfer to ICU</option>
                    <option value="Discharge Home with Meds">Discharge Home with Prescriptions</option>
                    <option value="Specialist Follow-up">Refer for Outpatient Specialist Follow-up</option>
                  </select>

                  <div className="mt-3">
                    <label className="block text-slate-400 font-bold uppercase font-mono text-[10px] mb-1">
                      Specialist Referrals:
                    </label>
                    <input
                      type="text"
                      value={referrals}
                      onChange={e => setReferrals(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer text-xs"
                >
                  Back to Results
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEncounter('In Progress')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer text-xs"
                  >
                    Save In-Progress Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEncounter('Finalized')}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg shadow-lg shadow-cyan-600/20 flex items-center space-x-1.5 cursor-pointer text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalize Clinical Encounter & Sign</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dictation Live Panel Overlay */}
        {dictatingTarget !== null && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400 animate-pulse">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Speech Recognition Clinical Dictation
                    </h3>
                    <p className="text-[11px] text-cyan-400 font-mono">
                      Target Field: {dictatingTarget === 'hpi' ? 'History of Present Illness (HPI)' : dictatingTarget === 'treatmentPlan' ? 'Treatment Plan' : 'Physical Exam Findings'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    stopDictation();
                    setDictatingTarget(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {speechError ? (
                <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl text-rose-300 text-xs space-y-2">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Microphone / Speech Recognition Notice</span>
                  </div>
                  <p>{speechError}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`w-3 h-3 rounded-full ${isListening ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {isListening ? 'Listening for Clinical Dictation...' : 'Dictation Paused / Stopped'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isListening ? (
                        <button
                          type="button"
                          onClick={stopDictation}
                          className="px-3 py-1 bg-amber-950 border border-amber-800 text-amber-300 rounded text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startDictation(dictatingTarget)}
                          className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Resume</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 min-h-[120px] max-h-[220px] overflow-y-auto space-y-2 font-mono text-xs">
                    <p className="text-white whitespace-pre-wrap">
                      {transcript}
                      <span className="text-cyan-400 italic ml-1">{interimTranscript}</span>
                    </p>
                    {!transcript && !interimTranscript && (
                      <span className="text-slate-500 italic font-sans text-xs">
                        Speak clearly into your microphone. Medical terminology will be captured live...
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    stopDictation();
                    setDictatingTarget(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={insertDictatedText}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-cyan-600/30 flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Insert into Field</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
