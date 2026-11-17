import React, { useState } from 'react';
import {
  HeartPulse,
  Activity,
  AlertTriangle,
  ArrowRight,
  Baby,
  Bed,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Flame,
  Plus,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Stethoscope,
  Users,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { TriageRecord, Patient, TriageCarePathway, EsiLevel } from '../../types';
import { TriageEncounterModal } from '../modals/TriageEncounterModal';
import { TriageScoreboard } from '../emergency/TriageScoreboard';

interface TriageCenterViewProps {
  onOpenEvaluation: (patient: Patient) => void;
  onOpenPatientChart: (patient: Patient) => void;
}

export const TriageCenterView: React.FC<TriageCenterViewProps> = ({
  onOpenEvaluation,
  onOpenPatientChart,
}) => {
  const {
    triageRecords,
    registerNewIntake,
    startTriageSession,
    patients,
    currentUser,
  } = useHospital();

  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'scoreboard'>('queue');
  const [selectedCaseForScoreboard, setSelectedCaseForScoreboard] = useState<TriageRecord | null>(null);

  // Active Triage Encounter Modal
  const [activeEncounterRecord, setActiveEncounterRecord] = useState<TriageRecord | null>(null);

  // Quick Check-in Dialog
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [checkInName, setCheckInName] = useState<string>('');
  const [checkInAge, setCheckInAge] = useState<number>(38);
  const [checkInGender, setCheckInGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [checkInPathway, setCheckInPathway] = useState<TriageCarePathway>('Outpatient');
  const [checkInComplaint, setCheckInComplaint] = useState<string>('');

  // Queue Filters
  const [filterPathway, setFilterPathway] = useState<'all' | TriageCarePathway>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredQueue = triageRecords.filter(record => {
    const matchesSearch =
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.targetDepartment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPathway =
      filterPathway === 'all' || record.carePathway.toLowerCase() === filterPathway.toLowerCase();

    const matchesStatus =
      filterStatus === 'all' || record.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesPathway && matchesStatus;
  });

  const notTriagedCount = triageRecords.filter(t => t.status === 'Not Triaged').length;
  const inTriageCount = triageRecords.filter(t => t.status === 'In Triage').length;
  const readyDoctorCount = triageRecords.filter(t => t.status === 'Sent to Doctor').length;

  const handleQuickCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInName.trim() || !checkInComplaint.trim()) return;

    registerNewIntake({
      patientName: checkInName.trim(),
      age: Number(checkInAge),
      gender: checkInGender,
      carePathway: checkInPathway,
      chiefComplaint: checkInComplaint.trim(),
    });

    setCheckInName('');
    setCheckInComplaint('');
    setShowCheckInModal(false);
  };

  const handleStartTriageClick = (record: TriageRecord) => {
    startTriageSession(record.id);
    setActiveEncounterRecord(record);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              CENTRAL CLINICAL GATEWAY
            </span>
            <span className="text-xs text-slate-400 font-mono">All Inpatient, Outpatient & Emergency Admissions</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <HeartPulse className="w-6 h-6 text-rose-500 animate-pulse" />
            <span>Universal Triage Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mandatory intake protocol: <strong className="text-slate-200">Vitals + Focused History + Focused Physical Exam</strong> are required before patients are routed to doctor queues.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab(prev => (prev === 'scoreboard' ? 'queue' : 'scoreboard'))}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all cursor-pointer ${
              activeSubTab === 'scoreboard'
                ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-md shadow-rose-900/40'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-rose-400" />
            <span>{activeSubTab === 'scoreboard' ? 'Back to Triage Queue' : 'ESI Acuity Scoreboard'}</span>
          </button>

          <button
            onClick={() => setShowCheckInModal(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Check-In New Arrival</span>
          </button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Total In Registry</div>
            <div className="text-xl font-black text-white mt-0.5">{triageRecords.length}</div>
            <div className="text-[10px] text-slate-500 font-mono">All Active Intake Cases</div>
          </div>
          <div className="p-2.5 bg-slate-800 text-slate-300 rounded-lg">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-amber-400">Awaiting Triage Nurse</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{notTriagedCount} Pending</div>
            <div className="text-[10px] text-slate-500 font-mono">Not Yet Screened</div>
          </div>
          <div className="p-2.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded-lg">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-cyan-400">In Triage Session</div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">{inTriageCount} Screening</div>
            <div className="text-[10px] text-slate-500 font-mono">Vitals & Exam Active</div>
          </div>
          <div className="p-2.5 bg-cyan-950/80 text-cyan-300 border border-cyan-800 rounded-lg">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-emerald-400">Sent to Doctor Queue</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{readyDoctorCount} Ready</div>
            <div className="text-[10px] text-slate-500 font-mono">Triage Verified</div>
          </div>
          <div className="p-2.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-lg">
            <UserCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {activeSubTab === 'scoreboard' ? (
        <TriageScoreboard
          selectedCase={selectedCaseForScoreboard as any}
          onApplyCalculatedTriage={calc => {
            registerNewIntake({
              chiefComplaint: calc.complaint,
              vitals: calc.vitals,
              esiLevel: calc.esiLevel,
            });
            setActiveSubTab('queue');
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Pathway Filters */}
          <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 px-2">Care Pathway:</span>
              {(['all', 'Outpatient', 'Inpatient', 'Emergency'] as const).map(path => (
                <button
                  key={path}
                  onClick={() => setFilterPathway(path)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    filterPathway === path
                      ? path === 'Outpatient'
                        ? 'bg-teal-600 text-white shadow-md'
                        : path === 'Inpatient'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : path === 'Emergency'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {path === 'all' ? 'All Pathways' : `${path} Patients`}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Triage Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500"
              >
                <option value="all">All Triage Statuses</option>
                <option value="Not Triaged">Not Triaged (Waiting)</option>
                <option value="In Triage">In Triage Session</option>
                <option value="Triage Completed">Triage Completed</option>
                <option value="Sent to Doctor">Sent to Doctor Queue</option>
                <option value="In Consultation">In Doctor Consultation</option>
                <option value="Consultation Completed">Consultation Completed</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search triage patients by name, MRN, chief complaint, department..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Triage Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Arrival / Wait</th>
                    <th className="py-3 px-4">Patient & MRN</th>
                    <th className="py-3 px-4">Pathway</th>
                    <th className="py-3 px-4">Chief Complaint</th>
                    <th className="py-3 px-4">Triage Priority</th>
                    <th className="py-3 px-4">Vitals Status</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4 text-right">Triage Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredQueue.map(record => {
                    const isCompleted = record.status === 'Sent to Doctor' || record.status === 'Triage Completed';
                    const isNotTriaged = record.status === 'Not Triaged';
                    const isInTriage = record.status === 'In Triage';

                    return (
                      <tr key={record.id} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Arrival & Time */}
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          <div>{record.arrivalTime.split(' ')[1]}</div>
                          <div className="text-[10px] text-slate-500">{record.waitingTimeMinutes}m ago</div>
                        </td>

                        {/* Patient & MRN */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                            {record.patientName}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                            {record.mrn} • {record.age}y {record.gender}
                          </div>
                        </td>

                        {/* Pathway */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                              record.carePathway === 'Outpatient'
                                ? 'bg-teal-950 text-teal-300 border-teal-800'
                                : record.carePathway === 'Inpatient'
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}
                          >
                            {record.carePathway}
                          </span>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {record.targetDepartment}
                          </div>
                        </td>

                        {/* Complaint */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-slate-200 line-clamp-1">
                            {record.chiefComplaint}
                          </div>
                          {record.focusedHistory?.redFlags && record.focusedHistory.redFlags.length > 0 && (
                            <div className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span className="truncate">{record.focusedHistory.redFlags[0]}</span>
                            </div>
                          )}
                        </td>

                        {/* ESI Acuity */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isNotTriaged ? (
                            <span className="text-[10px] text-slate-500 font-mono italic">
                              Pending Acuity Screening
                            </span>
                          ) : (
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
                              ESI LEVEL {record.esiLevel}
                            </span>
                          )}
                        </td>

                        {/* Vitals Telemetry */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                          {record.vitals ? (
                            <>
                              <div>
                                HR: {record.vitals.heartRate} bpm • BP: {record.vitals.bloodPressureSystolic}/{record.vitals.bloodPressureDiastolic}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                SpO2: {record.vitals.oxygenSaturation}% • Temp: {record.vitals.temperature}°C
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Current Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                              record.status === 'Sent to Doctor'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                : record.status === 'In Triage'
                                ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                                : record.status === 'Not Triaged'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {isNotTriaged && (
                              <button
                                onClick={() => handleStartTriageClick(record)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/30 flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <HeartPulse className="w-3.5 h-3.5" />
                                <span>Start Triage</span>
                              </button>
                            )}

                            {isInTriage && (
                              <button
                                onClick={() => setActiveEncounterRecord(record)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span>Continue Triage</span>
                              </button>
                            )}

                            {isCompleted && (
                              <button
                                onClick={() => setActiveEncounterRecord(record)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                <span>View Triage</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Triage Encounter Modal (Mandatory Vitals, Focused HPI, Focused Exam, ESI) */}
      {activeEncounterRecord && (
        <TriageEncounterModal
          triageRecord={activeEncounterRecord}
          onClose={() => setActiveEncounterRecord(null)}
          onCompleted={() => setActiveEncounterRecord(null)}
        />
      )}

      {/* Quick Check-In Arrival Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-rose-500" />
                <span>Check-In New Arrival at Triage Desk</span>
              </h2>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCheckInSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={checkInName}
                  onChange={e => setCheckInName(e.target.value)}
                  placeholder="e.g. Michael Thorne"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Age *</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={checkInAge}
                    onChange={e => setCheckInAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gender *</label>
                  <select
                    value={checkInGender}
                    onChange={e => setCheckInGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Care Pathway Destination *</label>
                <select
                  value={checkInPathway}
                  onChange={e => setCheckInPathway(e.target.value as TriageCarePathway)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold"
                >
                  <option value="Outpatient">Outpatient Clinic Intake</option>
                  <option value="Inpatient">Inpatient Admission Triage</option>
                  <option value="Emergency">Emergency & Acute Resuscitation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Presenting Chief Complaint *</label>
                <textarea
                  rows={2}
                  required
                  value={checkInComplaint}
                  onChange={e => setCheckInComplaint(e.target.value)}
                  placeholder="Patient's initial symptoms in their own words..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-md shadow-rose-600/30 cursor-pointer"
                >
                  Register in Triage Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
