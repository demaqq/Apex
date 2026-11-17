import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bed,
  CheckCircle2,
  Clock,
  Flame,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  Pill,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { EsiLevel } from '../../types';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenTriageIntake: () => void;
  onOpenEmergencyCode: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenTriageIntake,
  onOpenEmergencyCode,
}) => {
  const {
    triageRecords,
    doctorQueue,
    patients,
    beds,
    prescriptions,
    labOrders,
    imagingOrders,
    invoices,
    staff,
    activeBroadcast,
  } = useHospital();

  // Metrics computation
  const waitingTriage = triageRecords.filter(t => t.status === 'Not Triaged' || t.status === 'In Triage');
  const readyDoctor = doctorQueue;
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const totalBeds = beds.length;
  const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

  const pendingRx = prescriptions.filter(p => p.status === 'Pending').length;
  const pendingLabs = labOrders.filter(l => l.status !== 'Completed').length;
  const onDutyStaff = staff.filter(s => s.isOnDuty).length;

  // ESI Acuity Distribution among active triage & doctor queue
  const activePatients = [...triageRecords.filter(t => t.status !== 'Admitted' && t.status !== 'Discharged')];
  const esiCounts: Record<EsiLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  activePatients.forEach(p => {
    if (p.esiLevel) {
      esiCounts[p.esiLevel] = (esiCounts[p.esiLevel] || 0) + 1;
    }
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Top Banner: Emergency Broadcast Active? */}
      {activeBroadcast && (
        <div className="p-4 bg-rose-950/80 border-2 border-rose-500 rounded-xl flex items-center justify-between text-rose-100 animate-pulse shadow-lg shadow-rose-950/50">
          <div className="flex items-center space-x-3">
            <Flame className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-base flex items-center space-x-2">
                <span>ACTIVE HOSPITAL ALERT: {activeBroadcast.codeType.toUpperCase()}</span>
                <span className="text-xs px-2 py-0.5 bg-rose-900 border border-rose-600 rounded text-white uppercase font-mono">
                  {activeBroadcast.location}
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-0.5">{activeBroadcast.description}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('triage')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>Open ED Triage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Hospital Operational Command Center & Census</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center space-x-3">
            <span>St. Jude Medical Center — Tier 1 Trauma Hospital</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry, universal intake triage, physician consultation queues, and department bandwidth.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenEmergencyCode}
            className="px-3.5 py-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Broadcast Code</span>
          </button>
          <button
            onClick={onOpenTriageIntake}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
          >
            <HeartPulse className="w-4 h-4" />
            <span>New Patient Triage Intake</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Command Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Universal Triage Status */}
        <div
          onClick={() => onNavigateTab('triage')}
          className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-rose-950/20 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Universal Triage Center</span>
            <div className="p-2 bg-rose-950/60 border border-rose-800/60 rounded-lg text-rose-400">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">{waitingTriage.length}</span>
            <span className="text-xs text-rose-400 font-medium">Patients Awaiting Assessment</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Critical ESI 1-2:</span>
            <span className="font-bold text-rose-400 font-mono">
              {waitingTriage.filter(t => t.esiLevel === 1 || t.esiLevel === 2).length} STAT
            </span>
          </div>
        </div>

        {/* Doctor Queue */}
        <div
          onClick={() => onNavigateTab('doctor_queue')}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/20 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Doctor's Queue (Triaged)</span>
            <div className="p-2 bg-cyan-950/60 border border-cyan-800/60 rounded-lg text-cyan-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">{readyDoctor.length}</span>
            <span className="text-xs text-cyan-400 font-medium">Ready For Consultation</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Avg Wait Time:</span>
            <span className="font-bold text-cyan-300 font-mono">14 mins</span>
          </div>
        </div>

        {/* Inpatient Bed Occupancy */}
        <div
          onClick={() => onNavigateTab('beds')}
          className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-950/20 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Ward Bed Census</span>
            <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-lg text-indigo-400">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">{occupancyRate}%</span>
            <span className="text-xs text-indigo-400 font-medium">
              {occupiedBeds}/{totalBeds} Occupied
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>ICU Capacity:</span>
            <span className="font-bold text-amber-400 font-mono">3 / 4 Beds Full</span>
          </div>
        </div>

        {/* Clinical Staff On Duty */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-950/20 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Staff & Pagers</span>
            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white font-mono">{onDutyStaff}</span>
            <span className="text-xs text-emerald-400 font-medium">Clinicians On Duty</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Specialists On Call:</span>
            <span className="font-bold text-emerald-300 font-mono">6 Available</span>
          </div>
        </div>
      </div>

      {/* Central Split Section: ESI Acuity Distribution & Urgent Attention List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: ESI Acuity Spectrum */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Emergency Severity Index (ESI) Breakdown</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Live Acuity</span>
          </div>

          <div className="space-y-3">
            {/* ESI 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-rose-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>ESI 1 — Resuscitation (Immediate STAT)</span>
                </span>
                <span className="font-mono font-bold text-white">{esiCounts[1]}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (esiCounts[1] / (activePatients.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* ESI 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-orange-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>ESI 2 — Emergent (High Risk & Confusion)</span>
                </span>
                <span className="font-mono font-bold text-white">{esiCounts[2]}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (esiCounts[2] / (activePatients.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* ESI 3 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-amber-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>ESI 3 — Urgent (Multiple Resources Required)</span>
                </span>
                <span className="font-mono font-bold text-white">{esiCounts[3]}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (esiCounts[3] / (activePatients.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* ESI 4 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>ESI 4 — Less Urgent (Single Diagnostic)</span>
                </span>
                <span className="font-mono font-bold text-white">{esiCounts[4]}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (esiCounts[4] / (activePatients.length || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* ESI 5 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-blue-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>ESI 5 — Non-Urgent (Refill / Exam)</span>
                </span>
                <span className="font-mono font-bold text-white">{esiCounts[5]}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (esiCounts[5] / (activePatients.length || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-200">Universal Triage Rule:</span> Every patient must undergo
            vital signs logging, focused medical history, and clinical exam before queueing for physician evaluation.
          </div>
        </div>

        {/* Right Column (2 spans): Active Emergency & Urgent Doctor Queue Highlights */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Triaged Patients Ready for Doctor Consultation</h2>
            </div>
            <button
              onClick={() => onNavigateTab('doctor_queue')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>View Full Queue ({readyDoctor.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {readyDoctor.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No patients currently waiting in Doctor's Queue. New arrivals must complete Universal Triage first.
            </div>
          ) : (
            <div className="space-y-2.5">
              {readyDoctor.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab('doctor_queue')}
                  className="p-3 bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 rounded-lg flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center font-mono ${
                        item.esiLevel === 1
                          ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                          : item.esiLevel === 2
                          ? 'bg-orange-950 text-orange-300 border border-orange-700'
                          : item.esiLevel === 3
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}
                    >
                      ESI {item.esiLevel}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-cyan-400 flex items-center space-x-2">
                        <span>{item.patientName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.age}y {item.gender} • MRN: {item.patientMrn || item.mrn}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{item.chiefComplaint}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {item.targetDepartment}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">{item.arrivalTime}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auxiliary Operational Pillars (Pharmacy, Diagnostics, Billing) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pharmacy & Formulary */}
        <div
          onClick={() => onNavigateTab('pharmacy')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pill className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-white">Pharmacy Dispensing</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">
              {pendingRx} Pending Rx
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            E-Prescription queue with real-time stock deductions, controlled drug verification, and allergy cross-checks.
          </p>
        </div>

        {/* Diagnostic Laboratory & Radiology */}
        <div
          onClick={() => onNavigateTab('lab')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-4 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FlaskConical className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-white">Diagnostics & PACS</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded">
              {pendingLabs} Tests Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            LIS lab orders, abnormal panic value alerts, and DICOM-compatible digital imaging review.
          </p>
        </div>

        {/* Revenue Cycle & Invoicing */}
        <div
          onClick={() => onNavigateTab('billing')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">Revenue Cycle</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
              {invoices.length} Invoices
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            EDI 837 claims submission, ICD-10 & CPT itemized statements, and co-pay payment tracking.
          </p>
        </div>
      </div>
    </div>
  );
};
