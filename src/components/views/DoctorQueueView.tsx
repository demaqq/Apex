import React, { useState } from 'react';
import {
  UserCheck,
  Stethoscope,
  HeartPulse,
  Clock,
  Filter,
  Search,
  Eye,
  Activity,
  ArrowRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Image as ImageIcon,
  Pill,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { TriageRecord, Patient, HospitalDepartment } from '../../types';

interface DoctorQueueViewProps {
  onOpenEvaluation: (patient: Patient) => void;
  onOpenPatientChart: (patient: Patient) => void;
  onOpenPrescribe: (patient: Patient) => void;
  onOpenLabOrder: (patient: Patient) => void;
  onOpenImagingOrder: (patient: Patient) => void;
}

export const DoctorQueueView: React.FC<DoctorQueueViewProps> = ({
  onOpenEvaluation,
  onOpenPatientChart,
  onOpenPrescribe,
  onOpenLabOrder,
  onOpenImagingOrder,
}) => {
  const {
    doctorQueue,
    patients,
    currentUser,
    isPhysician,
    startDoctorConsultation,
  } = useHospital();

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPreviewRecord, setSelectedPreviewRecord] = useState<TriageRecord | null>(null);

  const filteredQueue = doctorQueue.filter(record => {
    const matchesSearch =
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.assignedDoctorName && record.assignedDoctorName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDept = deptFilter === 'all' || record.targetDepartment.toLowerCase().includes(deptFilter.toLowerCase());

    return matchesSearch && matchesDept;
  });

  const getPatientFromRecord = (r: TriageRecord): Patient => {
    const p = patients.find(pat => pat.mrn === r.mrn || pat.id === r.patientId);
    if (p) return p;

    return {
      id: r.patientId,
      mrn: r.mrn,
      name: r.patientName,
      firstName: r.patientName.split(' ')[0] || 'Unknown',
      lastName: r.patientName.split(' ').slice(1).join(' ') || 'Patient',
      age: r.age,
      gender: r.gender,
      dob: '1990-01-01',
      bloodGroup: 'O+',
      phone: '+1 (555) 000-0000',
      email: 'patient@apexhealth.org',
      address: 'Hospital District',
      emergencyContact: { name: 'Emergency Next of Kin', relationship: 'Relative', phone: '+1 (555) 000-0001' },
      insurance: { provider: 'Hospital Self-Pay / Direct Payer', policyNumber: 'APX-990', groupNumber: 'GRP-1', copay: 20 },
      status: r.carePathway === 'Inpatient' ? 'Inpatient' : r.carePathway === 'Emergency' ? 'Emergency' : 'Outpatient',
      department: r.targetDepartment,
      attendingPhysician: r.assignedDoctorName || 'Dr. Gregory House, MD',
      diagnoses: [r.chiefComplaint],
      allergies: r.focusedHistory?.allergies?.length ? r.focusedHistory.allergies : ['NKDA'],
      vitals: r.vitals,
      vitalsHistory: [{ ...r.vitals, id: `vh-${Date.now()}` }],
      notes: [],
      activeMedications: [],
    };
  };

  const handleStartConsult = (record: TriageRecord) => {
    startDoctorConsultation(record.id);
    const pat = getPatientFromRecord(record);
    onOpenEvaluation(pat);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              CLINICIAN WORKSTATION
            </span>
            <span className="text-xs text-slate-400 font-mono">Triage-Verified Patients Ready for Evaluation</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <UserCheck className="w-6 h-6 text-cyan-400" />
            <span>Doctor's Queue & Consultation Roster</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforced Clinical Rule: <strong className="text-slate-200">No patient appears in this queue until mandatory triage screening is completed.</strong>
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono">
          <span className="text-slate-400">Ready in Queue:</span>
          <span className="text-cyan-300 font-bold text-sm tabular-nums">{doctorQueue.length}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Current Doctor:</span>
          <span className="text-white font-bold">{currentUser.name.replace('Dr. ', '')}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search ready patients by name, MRN, chief complaint, or doctor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Specialty Clinics</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Pediatrics">Pediatrics</option>
          <option value="Gynecology">Gynecology & Obstetrics</option>
          <option value="Internal">Internal Medicine</option>
          <option value="Surgery">General & Trauma Surgery</option>
          <option value="Emergency">Emergency & Trauma</option>
          <option value="Oncology">Oncology</option>
          <option value="Neurology">Neurology</option>
          <option value="Orthopedics">Orthopedics</option>
        </select>
      </div>

      {/* Doctor's Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Triage Priority</th>
                <th className="py-3 px-4">Patient & MRN</th>
                <th className="py-3 px-4">Chief Complaint</th>
                <th className="py-3 px-4">Clinic / Dept</th>
                <th className="py-3 px-4">Assigned Attending</th>
                <th className="py-3 px-4">Triage Telemetry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    All triaged patients have been attended to or are currently in consultation.
                  </td>
                </tr>
              ) : (
                filteredQueue.map(record => {
                  const pat = getPatientFromRecord(record);
                  const isEmergent = record.esiLevel <= 2;
                  const isUnderConsult = record.status === 'In Consultation';

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedPreviewRecord(record)}
                    >
                      {/* ESI Acuity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                            record.esiLevel === 1
                              ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                              : record.esiLevel === 2
                              ? 'bg-amber-600 text-white border-amber-500'
                              : record.esiLevel === 3
                              ? 'bg-yellow-500 text-slate-950 border-yellow-400 font-extrabold'
                              : record.esiLevel === 4
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-blue-600 text-white border-blue-500'
                          }`}
                        >
                          ESI {record.esiLevel}
                        </span>
                      </td>

                      {/* Patient & MRN */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {record.patientName}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                          {record.mrn} • {record.age}y {record.gender}
                        </div>
                      </td>

                      {/* Complaint */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-200 line-clamp-1">
                          {record.chiefComplaint}
                        </div>
                        {record.focusedHistory?.redFlags && record.focusedHistory.redFlags.length > 0 && (
                          <div className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">Red Flag: {record.focusedHistory.redFlags[0]}</span>
                          </div>
                        )}
                      </td>

                      {/* Clinic / Dept */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="bg-slate-800 text-slate-200 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700">
                          {record.targetDepartment}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {record.carePathway} Pathway
                        </div>
                      </td>

                      {/* Assigned Attending */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">
                          {record.assignedDoctorName || 'Queue Unassigned'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Nurse: {record.triageNurseName.split(',')[0]}
                        </div>
                      </td>

                      {/* Vitals Telemetry */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                        <div>
                          HR: <strong className={record.vitals.heartRate > 105 ? 'text-rose-400' : 'text-slate-100'}>{record.vitals.heartRate} bpm</strong> • SpO2: <strong className={record.vitals.oxygenSaturation < 94 ? 'text-rose-400' : 'text-emerald-400'}>{record.vitals.oxygenSaturation}%</strong>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          BP: {record.vitals.bloodPressureSystolic}/{record.vitals.bloodPressureDiastolic} mmHg • {record.vitals.temperature}°C
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                            isUnderConsult
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 animate-pulse'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {record.status}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{record.waitingTimeMinutes}m in queue</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleStartConsult(record)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
                            title="Start Clinical SOAP Evaluation & DDx"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Evaluate</span>
                          </button>

                          <button
                            onClick={() => onOpenPatientChart(pat)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="View Full Patient EHR Chart"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Patient Read-Only Triage Summary Modal */}
      {selectedPreviewRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800 rounded-lg">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Nurse Triage Assessment & Red-Flag Summary (Read-Only)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Patient: {selectedPreviewRecord.patientName} ({selectedPreviewRecord.mrn}) • Verified by {selectedPreviewRecord.triageNurseName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPreviewRecord(null)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Read-Only Triage Summary Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Chief Complaint:</span>
                <span className="font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  ESI Level {selectedPreviewRecord.esiLevel} ({selectedPreviewRecord.targetDepartment})
                </span>
              </div>
              <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                {selectedPreviewRecord.chiefComplaint}
              </p>

              {/* Vitals Telemetry */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Heart Rate</div>
                  <div className={`font-bold text-sm ${selectedPreviewRecord.vitals.heartRate > 105 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {selectedPreviewRecord.vitals.heartRate} bpm
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Blood Pres.</div>
                  <div className="font-bold text-sm text-slate-200">
                    {selectedPreviewRecord.vitals.bloodPressureSystolic}/{selectedPreviewRecord.vitals.bloodPressureDiastolic}
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">SpO2 (Pulse)</div>
                  <div className={`font-bold text-sm ${selectedPreviewRecord.vitals.oxygenSaturation < 94 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedPreviewRecord.vitals.oxygenSaturation}%
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Temperature</div>
                  <div className="font-bold text-sm text-slate-200">
                    {selectedPreviewRecord.vitals.temperature}°C
                  </div>
                </div>
              </div>

              {/* Focused History & Findings */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div>
                  <strong className="text-slate-400 uppercase font-mono text-[10px] block mb-0.5">
                    Focused HPI:
                  </strong>
                  <p className="text-slate-300">{selectedPreviewRecord.focusedHistory?.briefHpi || 'Standard intake history recorded.'}</p>
                </div>

                <div>
                  <strong className="text-slate-400 uppercase font-mono text-[10px] block mb-0.5">
                    Physical Exam Findings at Triage:
                  </strong>
                  <p className="text-slate-300">{selectedPreviewRecord.focusedExam?.systemFocusedFindings || 'Grossly intact.'}</p>
                </div>

                {selectedPreviewRecord.focusedHistory?.redFlags && selectedPreviewRecord.focusedHistory.redFlags.length > 0 && (
                  <div className="bg-rose-950/60 p-2.5 rounded border border-rose-800 text-rose-200">
                    <span className="font-bold block uppercase font-mono text-[10px] text-rose-300">
                      Positive Clinical Red Flags:
                    </span>
                    {selectedPreviewRecord.focusedHistory.redFlags.join(', ')}
                  </div>
                )}

                <div>
                  <strong className="text-slate-400 uppercase font-mono text-[10px] block mb-0.5">
                    Nurse Notes for Physician:
                  </strong>
                  <p className="text-slate-300 italic">"{selectedPreviewRecord.triageNotesForDoctor}"</p>
                </div>
              </div>
            </div>

            {/* Launch Doctor Evaluation Button */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPreviewRecord(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const r = selectedPreviewRecord;
                  setSelectedPreviewRecord(null);
                  handleStartConsult(r);
                }}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center space-x-1.5 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Open Full Clinical SOAP Encounter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
