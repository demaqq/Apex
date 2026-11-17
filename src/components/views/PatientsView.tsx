import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bed,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FilePlus,
  FileSpreadsheet,
  FileText,
  Filter,
  FlaskConical,
  Heart,
  HeartPulse,
  Mail,
  MapPin,
  Pill,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { Patient, VitalSigns } from '../../types';

interface PatientsViewProps {
  onStartTriageForPatient: (patient: Patient) => void;
  onOpenPatientEvaluation: (patientMrn: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  onStartTriageForPatient,
  onOpenPatientEvaluation,
  onNavigateTab,
}) => {
  const { patients, selectedPatient, setSelectedPatient, beds, currentUser } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Inpatient' | 'Outpatient' | 'Emergency' | 'Discharged'>('All');
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'vitals' | 'encounters' | 'meds' | 'labs'>('overview');

  // New Patient Modal state
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  const filteredPatients = patients.filter(patient => {
    const pName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
    const pConditions = patient.conditions || patient.diagnoses || [];
    const matchesSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pConditions.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activePatient = selectedPatient || filteredPatients[0] || null;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Column: Patients List & Search */}
      <div className="w-80 md:w-96 border-r border-slate-800 flex flex-col shrink-0 bg-slate-900/60">
        {/* Search & Actions Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Stethoscope className="w-4 h-4 text-cyan-400" />
                <span>Patient Master Index</span>
              </h2>
              <p className="text-[11px] text-slate-400">Total {patients.length} registered health records</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name, MRN (e.g. MRN-2026)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
            {(['All', 'Inpatient', 'Outpatient', 'Emergency', 'Discharged'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
          {filteredPatients.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No patients found matching your search.
            </div>
          ) : (
            filteredPatients.map(p => {
              const isSelected = activePatient?.id === p.id;
              const hasCriticalAllergies = p.allergies.length > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/70 border border-cyan-500/80 shadow-md shadow-cyan-950/40'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                        <span>{p.name}</span>
                        {p.status === 'Emergency' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        MRN: {p.mrn} • {p.age}y {p.gender} • Blood: {p.bloodGroup}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        p.status === 'Emergency'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : p.status === 'Inpatient'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : p.status === 'Outpatient'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 truncate max-w-[180px]">
                      {(p.conditions && p.conditions[0]) || (p.diagnoses && p.diagnoses[0]) || 'No chronic conditions'}
                    </span>
                    {hasCriticalAllergies && (
                      <span className="text-[10px] text-rose-400 font-medium flex items-center space-x-0.5">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>{p.allergies.length} Allergies</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Longitudinal Patient Health Record (Longitudinal EHR) */}
      {activePatient ? (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
          {/* Patient Banner */}
          <div className="bg-slate-900 border-b border-slate-800 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white text-lg font-mono shadow-md">
                  {(activePatient.name || `${activePatient.firstName || ''} ${activePatient.lastName || ''}`.trim() || 'PT').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                      {activePatient.name || `${activePatient.firstName || ''} ${activePatient.lastName || ''}`.trim()}
                    </h1>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        activePatient.status === 'Emergency'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700'
                          : activePatient.status === 'Inpatient'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {activePatient.status}
                    </span>
                    {activePatient.assignedBed && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 flex items-center space-x-1">
                        <Bed className="w-3 h-3" />
                        <span>Bed {activePatient.assignedBed}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mt-1">
                    <span>MRN: <strong className="text-cyan-400 font-semibold">{activePatient.mrn}</strong></span>
                    <span>DOB: <strong>{activePatient.dob}</strong> ({activePatient.age} yrs)</span>
                    <span>Sex: <strong>{activePatient.gender}</strong></span>
                    <span>Blood: <strong className="text-rose-400">{activePatient.bloodGroup}</strong></span>
                    <span>Attending: <strong>{activePatient.attendingDoctor || 'Unassigned'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onStartTriageForPatient(activePatient)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-rose-950/40 transition-colors cursor-pointer"
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Send to Triage Intake</span>
                </button>
                <button
                  onClick={() => onOpenPatientEvaluation(activePatient.mrn)}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-cyan-950/40 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clinical Evaluation</span>
                </button>
              </div>
            </div>

            {/* Quick Warning Chips: Allergies & High Risk Alerts */}
            {activePatient.allergies.length > 0 && (
              <div className="mt-4 p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-center space-x-2 text-xs text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-bold">CRITICAL ALLERGIES RECORDED:</span>
                <span className="font-mono text-rose-200">{activePatient.allergies.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div className="border-b border-slate-800 bg-slate-900/50 px-6 flex items-center space-x-6">
            {[
              { id: 'overview', label: 'Clinical Overview & History', icon: Activity },
              { id: 'vitals', label: 'Longitudinal Vitals Flowsheet', icon: HeartPulse },
              { id: 'encounters', label: 'Notes & SOAP Encounters', icon: FileText },
              { id: 'meds', label: 'Medications & MAR', icon: Pill },
              { id: 'labs', label: 'Diagnostics & Pathology', icon: FlaskConical },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`py-3 text-xs font-medium flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-cyan-400 text-cyan-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="p-6 space-y-6">
            {activeDetailTab === 'overview' && (
              <div className="space-y-6">
                {/* Current Active Vitals Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <HeartPulse className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">Latest Recorded Vital Signs</h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Logged: {activePatient.vitals.recordedAt || 'Recent'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Blood Pressure</span>
                      <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                        {activePatient.vitals.bloodPressure ||
                          `${activePatient.vitals.bloodPressureSystolic}/${activePatient.vitals.bloodPressureDiastolic}`}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">mmHg</span>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Heart Rate</span>
                      <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                        {activePatient.vitals.heartRate}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">BPM</span>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Oxygen Saturation</span>
                      <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                        {activePatient.vitals.oxygenSaturation}%
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">SpO2 (Room Air)</span>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Temperature</span>
                      <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                        {activePatient.vitals.temperature}°C
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Core Body</span>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Respiration</span>
                      <div className="text-lg font-black text-blue-400 font-mono mt-0.5">
                        {activePatient.vitals.respiratoryRate}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Breaths / min</span>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Pain Scale</span>
                      <div className="text-lg font-black text-purple-400 font-mono mt-0.5">
                        {activePatient.vitals.painLevel ?? activePatient.vitals.painScale ?? 0} / 10
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Visual Analog</span>
                    </div>
                  </div>
                </div>

                {/* Chronic Conditions & Past History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Active Problem List & Chronic Diagnoses
                    </h3>
                    <div className="space-y-2">
                      {((activePatient.conditions || activePatient.diagnoses) ?? []).length > 0 ? (
                        ((activePatient.conditions || activePatient.diagnoses) ?? []).map((c: string, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-200 font-medium">{c}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">
                              Chronic
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">No chronic conditions listed.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Insurance & Primary Payer Coverage
                    </h3>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payer Name:</span>
                        <span className="font-semibold text-white">{activePatient.insurance.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Policy / Member ID:</span>
                        <span className="font-mono text-cyan-400">{activePatient.insurance.policyNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Group Number:</span>
                        <span className="font-mono text-slate-300">{activePatient.insurance.groupNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          Active Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'vitals' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Longitudinal Vital Signs Trend & Flowsheet</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">BP (mmHg)</th>
                        <th className="p-3">HR (BPM)</th>
                        <th className="p-3">SpO2 (%)</th>
                        <th className="p-3">Temp (°C)</th>
                        <th className="p-3">RR (/min)</th>
                        <th className="p-3">Pain (0-10)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {activePatient.vitalsHistory && activePatient.vitalsHistory.length > 0 ? (
                        activePatient.vitalsHistory.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="p-3 text-slate-400">{v.recordedAt}</td>
                            <td className="p-3 font-semibold text-cyan-400">
                              {v.bloodPressure || `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`}
                            </td>
                            <td className="p-3 text-rose-400">{v.heartRate}</td>
                            <td className="p-3 text-emerald-400">{v.oxygenSaturation}%</td>
                            <td className="p-3 text-amber-400">{v.temperature}°C</td>
                            <td className="p-3 text-blue-400">{v.respiratoryRate}</td>
                            <td className="p-3 text-purple-400">{v.painLevel ?? v.painScale ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-slate-800/40">
                          <td className="p-3 text-slate-400">Current Admission</td>
                          <td className="p-3 font-semibold text-cyan-400">
                            {activePatient.vitals.bloodPressure ||
                              `${activePatient.vitals.bloodPressureSystolic}/${activePatient.vitals.bloodPressureDiastolic}`}
                          </td>
                          <td className="p-3 text-rose-400">{activePatient.vitals.heartRate}</td>
                          <td className="p-3 text-emerald-400">{activePatient.vitals.oxygenSaturation}%</td>
                          <td className="p-3 text-amber-400">{activePatient.vitals.temperature}°C</td>
                          <td className="p-3 text-blue-400">{activePatient.vitals.respiratoryRate}</td>
                          <td className="p-3 text-purple-400">
                            {activePatient.vitals.painLevel ?? activePatient.vitals.painScale ?? 0}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeDetailTab === 'encounters' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Past Clinical Notes & SOAP Records</h3>
                  <button
                    onClick={() => onOpenPatientEvaluation(activePatient.mrn)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Consultation Note</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {activePatient.notes.map(note => (
                    <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white font-mono px-2 py-0.5 bg-slate-800 rounded">
                            {note.type}
                          </span>
                          <span className="text-slate-400">by {note.author}</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">{note.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {note.content || note.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDetailTab === 'meds' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Active Inpatient & Outpatient Medications</h3>
                  <button
                    onClick={() => onNavigateTab('pharmacy')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Open Pharmacy Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {((activePatient.medications || activePatient.activeMedications?.map(m => `${m.name} ${m.dosage}`)) ?? []).map(
                    (med: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <Pill className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="font-semibold text-white">{med}</span>
                            <p className="text-[11px] text-slate-400">Daily oral regimen / active prescription</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                          Dispensed & Active
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {activeDetailTab === 'labs' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Diagnostic Laboratory & Pathology History</h3>
                  <button
                    onClick={() => onNavigateTab('lab')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Open LIS / PACS Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Comprehensive Metabolic Panel (CMP)</div>
                      <div className="text-[11px] text-slate-400 font-mono">Specimen: Venous Blood • Sodium: 139 mEq/L, Potassium: 4.1 mEq/L</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                      Normal / Completed
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Complete Blood Count (CBC) with Differential</div>
                      <div className="text-[11px] text-slate-400 font-mono">WBC: 12.8 k/uL (ELEVATED), Hemoglobin: 13.9 g/dL, Platelets: 240 k/uL</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                      Abnormal / Reviewed
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Select a patient from the directory to review longitudinal EHR.
        </div>
      )}
    </div>
  );
};
