import React, { useState } from 'react';
import {
  HeartPulse,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sliders,
  Sparkles,
  UserCheck,
  X,
  Zap,
  Baby,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import {
  TriageRecord,
  VitalSigns,
  EsiLevel,
  TriageCarePathway,
  HospitalDepartment,
} from '../../types';

interface TriageEncounterModalProps {
  triageRecord: TriageRecord;
  onClose: () => void;
  onCompleted?: () => void;
}

export const TriageEncounterModal: React.FC<TriageEncounterModalProps> = ({
  triageRecord,
  onClose,
  onCompleted,
}) => {
  const { completeTriageAndSendToDoctor, staff, currentUser } = useHospital();

  // Vitals State
  const [hr, setHr] = useState<number>(triageRecord.vitals.heartRate || 85);
  const [bpSys, setBpSys] = useState<number>(triageRecord.vitals.bloodPressureSystolic || 120);
  const [bpDia, setBpDia] = useState<number>(triageRecord.vitals.bloodPressureDiastolic || 80);
  const [rr, setRr] = useState<number>(triageRecord.vitals.respiratoryRate || 18);
  const [spo2, setSpo2] = useState<number>(triageRecord.vitals.oxygenSaturation || 98);
  const [temp, setTemp] = useState<number>(triageRecord.vitals.temperature || 37.0);
  const [pain, setPain] = useState<number>(triageRecord.vitals.painScale || 0);
  const [weightKg, setWeightKg] = useState<number>(triageRecord.vitals.weightKg || 70);

  // Mandatory Focused History State
  const [briefHpi, setBriefHpi] = useState<string>(
    triageRecord.focusedHistory?.briefHpi || triageRecord.chiefComplaint || ''
  );
  const [selectedRedFlags, setSelectedRedFlags] = useState<string[]>(
    triageRecord.focusedHistory?.redFlags || []
  );
  const [allergiesText, setAllergiesText] = useState<string>(
    triageRecord.focusedHistory?.allergies?.join(', ') || 'NKDA'
  );
  const [currentMedsText, setCurrentMedsText] = useState<string>(
    triageRecord.focusedHistory?.currentMedications?.join(', ') || 'None reported'
  );
  const [pastHistoryText, setPastHistoryText] = useState<string>(
    triageRecord.focusedHistory?.relevantPastHistory?.join(', ') || 'None reported'
  );
  const [pregnancyStatus, setPregnancyStatus] = useState<
    'Negative' | 'Positive' | 'Not Applicable' | 'Unknown'
  >(triageRecord.focusedHistory?.pregnancyStatus || 'Not Applicable');

  // Mandatory Focused Physical Exam State
  const [generalAppearance, setGeneralAppearance] = useState<
    'Well / Stable' | 'Mild Distress' | 'Moderate Distress' | 'Severe Distress' | 'Unresponsive / Critical'
  >(triageRecord.focusedExam?.generalAppearance || 'Well / Stable');
  const [systemFocusedFindings, setSystemFocusedFindings] = useState<string>(
    triageRecord.focusedExam?.systemFocusedFindings || 'Alert, oriented, S1/S2 present, lungs clear to auscultation, abdomen soft.'
  );
  const [examRedFlagsText, setExamRedFlagsText] = useState<string>(
    triageRecord.focusedExam?.redFlagFindings?.join(', ') || ''
  );

  // Triage Acuity Assignment
  const [esiLevel, setEsiLevel] = useState<EsiLevel>(triageRecord.esiLevel || 3);
  const [carePathway, setCarePathway] = useState<TriageCarePathway>(
    triageRecord.carePathway || 'Outpatient'
  );
  const [targetDepartment, setTargetDepartment] = useState<HospitalDepartment>(
    triageRecord.targetDepartment || 'Internal Medicine'
  );
  const [assignedDoctor, setAssignedDoctor] = useState<string>(
    triageRecord.assignedDoctorName || 'Dr. Gregory House, MD'
  );
  const [notesForDoctor, setNotesForDoctor] = useState<string>(
    triageRecord.triageNotesForDoctor || 'Triage completed. Vitals stable. Ready for physician encounter.'
  );

  const doctors = staff.filter(s => s.role === 'Physician' || s.role === 'Surgeon');

  const commonRedFlags = [
    'Crushing substernal chest pain > 20 mins',
    'Sudden onset focal neurological deficit / facial droop',
    'Stridor or acute upper airway obstruction',
    'Profound hypoxemia (SpO2 < 90%)',
    'Altered mental status / GCS ≤ 8',
    'Severe uncontrolled hemorrhage',
    'Suspected anaphylaxis with bronchospasm',
    'High fever > 39.0°C in neutropenic patient',
  ];

  const toggleRedFlag = (rf: string) => {
    setSelectedRedFlags(prev =>
      prev.includes(rf) ? prev.filter(item => item !== rf) : [...prev, rf]
    );
  };

  // Automated ESI decision calculation based on vitals + red flags
  const autoEsiSuggest: EsiLevel = (() => {
    if (
      generalAppearance === 'Unresponsive / Critical' ||
      spo2 < 86 ||
      hr === 0 ||
      (hr > 160 && bpSys < 80) ||
      selectedRedFlags.includes('Altered mental status / GCS ≤ 8') ||
      selectedRedFlags.includes('Stridor or acute upper airway obstruction')
    ) {
      return 1;
    }
    if (
      selectedRedFlags.length > 0 ||
      generalAppearance === 'Severe Distress' ||
      hr > 120 ||
      bpSys > 190 ||
      bpSys < 85 ||
      spo2 < 93 ||
      temp >= 39.3 ||
      pain >= 8
    ) {
      return 2;
    }
    if (carePathway === 'Inpatient' || generalAppearance === 'Moderate Distress') {
      return 3;
    }
    if (carePathway === 'Outpatient' && pain <= 3) {
      return 4;
    }
    return 3;
  })();

  const isValid =
    briefHpi.trim().length > 3 &&
    systemFocusedFindings.trim().length > 3 &&
    hr > 0 &&
    bpSys > 0 &&
    rr > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const vitals: VitalSigns = {
      heartRate: Number(hr),
      bloodPressureSystolic: Number(bpSys),
      bloodPressureDiastolic: Number(bpDia),
      respiratoryRate: Number(rr),
      oxygenSaturation: Number(spo2),
      temperature: Number(temp),
      painScale: Number(pain),
      weightKg: Number(weightKg),
      recordedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    const focusedHistory = {
      briefHpi: briefHpi.trim(),
      redFlags: selectedRedFlags,
      allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
      currentMedications: currentMedsText.split(',').map(s => s.trim()).filter(Boolean),
      relevantPastHistory: pastHistoryText.split(',').map(s => s.trim()).filter(Boolean),
      pregnancyStatus,
    };

    const focusedExam = {
      generalAppearance,
      systemFocusedFindings: systemFocusedFindings.trim(),
      redFlagFindings: examRedFlagsText ? examRedFlagsText.split(',').map(s => s.trim()) : [],
    };

    const rationale = [
      `Assigned ESI Level ${esiLevel}`,
      `Care pathway: ${carePathway} -> ${targetDepartment}`,
      `Appearance: ${generalAppearance}`,
    ];
    if (selectedRedFlags.length > 0) {
      rationale.push(`Positive red flags: ${selectedRedFlags.join('; ')}`);
    }

    completeTriageAndSendToDoctor(
      triageRecord.id,
      vitals,
      focusedHistory,
      focusedExam,
      esiLevel,
      rationale,
      carePathway,
      targetDepartment,
      assignedDoctor,
      notesForDoctor
    );

    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 shrink-0">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Triage Intake & Clinical Acuity Screening Encounter
                </h2>
                <span className="text-[10px] font-mono uppercase bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold">
                  Mandatory Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Patient: <strong className="text-white">{triageRecord.patientName}</strong> ({triageRecord.mrn}) • {triageRecord.age}y {triageRecord.gender} • Arrived: {triageRecord.arrivalTime}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Section 1: Mandatory Vitals */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>1. Mandatory Objective Vital Signs</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">All fields required for nurse validation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">HR (bpm) *</label>
                <input
                  type="number"
                  required
                  value={hr}
                  onChange={e => setHr(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">BP Sys *</label>
                <input
                  type="number"
                  required
                  value={bpSys}
                  onChange={e => setBpSys(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">BP Dia *</label>
                <input
                  type="number"
                  required
                  value={bpDia}
                  onChange={e => setBpDia(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">RR (/min) *</label>
                <input
                  type="number"
                  required
                  value={rr}
                  onChange={e => setRr(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">SpO2 (%) *</label>
                <input
                  type="number"
                  required
                  value={spo2}
                  onChange={e => setSpo2(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Temp (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={temp}
                  onChange={e => setTemp(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Pain (0-10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={pain}
                  onChange={e => setPain(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-amber-300 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={e => setWeightKg(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Mandatory Focused History */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-cyan-400 block">
              2. Mandatory Focused History & Red-Flag Screening
            </span>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Brief History of Present Illness (HPI) related to complaint *
              </label>
              <textarea
                rows={2}
                required
                value={briefHpi}
                onChange={e => setBriefHpi(e.target.value)}
                placeholder="Document onset time, symptom character, radiation, relieving factors, mechanism of injury..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg p-2.5 text-white"
              />
            </div>

            {/* Red Flag Checkbox Strip */}
            <div>
              <span className="text-[11px] font-mono text-rose-400 font-bold uppercase block mb-1.5">
                Clinical Red-Flag Warning Signs (Check all that apply):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {commonRedFlags.map((rf, idx) => {
                  const isChecked = selectedRedFlags.includes(rf);
                  return (
                    <label
                      key={idx}
                      className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-rose-950 border-rose-600 text-rose-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRedFlag(rf)}
                        className="rounded text-rose-600 focus:ring-0"
                      />
                      <span className="text-[11px] font-medium leading-tight">{rf}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Documented Allergies</label>
                <input
                  type="text"
                  value={allergiesText}
                  onChange={e => setAllergiesText(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa, NKDA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Active Medications</label>
                <input
                  type="text"
                  value={currentMedsText}
                  onChange={e => setCurrentMedsText(e.target.value)}
                  placeholder="e.g. Amlodipine 10mg, Metformin 500mg"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Relevant Past Medical History</label>
                <input
                  type="text"
                  value={pastHistoryText}
                  onChange={e => setPastHistoryText(e.target.value)}
                  placeholder="e.g. HTN, DM2, Asthma, CABG"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            {triageRecord.gender === 'Female' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pregnancy Status</label>
                <div className="flex gap-2">
                  {(['Negative', 'Positive', 'Not Applicable', 'Unknown'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPregnancyStatus(opt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        pregnancyStatus === opt
                          ? 'bg-rose-950 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Mandatory Focused Physical Exam */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 block">
              3. Mandatory Focused Physical Exam
            </span>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">General Clinical Appearance *</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  'Well / Stable',
                  'Mild Distress',
                  'Moderate Distress',
                  'Severe Distress',
                  'Unresponsive / Critical',
                ].map(app => (
                  <button
                    key={app}
                    type="button"
                    onClick={() => setGeneralAppearance(app as any)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all text-center ${
                      generalAppearance === app
                        ? app === 'Unresponsive / Critical'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/40'
                          : app === 'Severe Distress'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/40'
                          : 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {app}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                System-Focused Quick Exam Findings based on Complaint *
              </label>
              <textarea
                rows={2}
                required
                value={systemFocusedFindings}
                onChange={e => setSystemFocusedFindings(e.target.value)}
                placeholder="e.g. Heart sounds, bilateral breath sounds, abdominal guarding or rebound, distal pulses, pupil reactivity..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          {/* Section 4: Triage Acuity Level & Disposition Routing */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center space-x-2">
                <Sliders className="w-4 h-4" />
                <span>4. ESI Triage Level & Disposition to Doctor's Queue</span>
              </span>

              <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950 border border-cyan-800 px-2 py-0.5 rounded">
                Acuity Suggested: ESI {autoEsiSuggest}
              </div>
            </div>

            {/* ESI Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { lvl: 1, label: 'ESI 1: Resuscitation (STAT Immediate)', color: 'bg-rose-600 text-white' },
                { lvl: 2, label: 'ESI 2: Emergent (Bedside < 10m)', color: 'bg-amber-600 text-white' },
                { lvl: 3, label: 'ESI 3: Urgent (Multi-resource)', color: 'bg-yellow-500 text-slate-950 font-bold' },
                { lvl: 4, label: 'ESI 4: Less Urgent (1 Resource)', color: 'bg-emerald-600 text-white' },
                { lvl: 5, label: 'ESI 5: Non-Urgent (Clinic ref)', color: 'bg-blue-600 text-white' },
              ].map(opt => (
                <button
                  key={opt.lvl}
                  type="button"
                  onClick={() => setEsiLevel(opt.lvl as EsiLevel)}
                  className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                    esiLevel === opt.lvl
                      ? `${opt.color} border-white shadow-lg`
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs">Level {opt.lvl}</div>
                  <div className="text-[10px] opacity-80 line-clamp-1">{opt.label.split(':')[1]}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Care Pathway Destination *</label>
                <select
                  value={carePathway}
                  onChange={e => setCarePathway(e.target.value as TriageCarePathway)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value="Outpatient">Outpatient Clinic Intake</option>
                  <option value="Inpatient">Inpatient Ward Admission</option>
                  <option value="Emergency">Emergency & Acute Resuscitation</option>
                  <option value="Fast-Track">Fast-Track Ambulatory</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department Specialty Queue *</label>
                <select
                  value={targetDepartment}
                  onChange={e => setTargetDepartment(e.target.value as HospitalDepartment)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value="Pediatrics">Pediatrics & Neonatal Care</option>
                  <option value="Gynecology & Obstetrics">Gynecology & Obstetrics</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="General & Trauma Surgery">General & Trauma Surgery</option>
                  <option value="Emergency & Trauma">Emergency & Trauma</option>
                  <option value="Medical & Surgical Oncology">Medical & Surgical Oncology</option>
                  <option value="Cardiology">Cardiology & CCU</option>
                  <option value="Neurology & Neurosurgery">Neurology & Neurosurgery</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Intensive Care (ICU/CCU)">Intensive Care Unit (ICU)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Attending Physician *</label>
                <select
                  value={assignedDoctor}
                  onChange={e => setAssignedDoctor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nurse Triage Notes for Doctor</label>
              <input
                type="text"
                value={notesForDoctor}
                onChange={e => setNotesForDoctor(e.target.value)}
                placeholder="Alerts for doctor (e.g. 'Possible acute appendicitis, keep strictly NPO', 'High risk chest pain')"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          {/* Validation & Submit Button */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 font-mono">
              {!isValid ? (
                <span className="text-amber-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Fill mandatory HPI and physical exam findings to send patient to doctor</span>
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mandatory triage protocol verified and ready for doctor queue transmission</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-600 via-amber-600 to-cyan-600 hover:from-rose-500 hover:to-cyan-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-600/30 flex items-center space-x-2 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Triage & Send to Doctor's Queue</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
