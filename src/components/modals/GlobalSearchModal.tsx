import React, { useState, useEffect } from 'react';
import {
  Bed,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Pill,
  Search,
  ShieldAlert,
  Stethoscope,
  User,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';

interface GlobalSearchModalProps {
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenPatientEvaluation: (patientMrn: string) => void;
  onOpenEmergencyCode: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  onClose,
  onNavigateTab,
  onOpenPatientEvaluation,
  onOpenEmergencyCode,
}) => {
  const { patients, beds, formulary, triageRecords, doctorQueue } = useHospital();
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanQuery = query.toLowerCase().trim();

  const matchingPatients = cleanQuery
    ? patients.filter(
        p => {
          const pName = p.name || `${p.firstName || ''} ${p.lastName || ''}`;
          const pConds = p.conditions || p.diagnoses || [];
          return (
            pName.toLowerCase().includes(cleanQuery) ||
            p.mrn.toLowerCase().includes(cleanQuery) ||
            pConds.some((c: string) => c.toLowerCase().includes(cleanQuery))
          );
        }
      )
    : [];

  const matchingBeds = cleanQuery
    ? beds.filter(
        b =>
          b.bedNumber.toLowerCase().includes(cleanQuery) ||
          (b.patientName && b.patientName.toLowerCase().includes(cleanQuery))
      )
    : [];

  const matchingMeds = cleanQuery
    ? formulary.filter(
        m =>
          m.name.toLowerCase().includes(cleanQuery) ||
          m.genericName.toLowerCase().includes(cleanQuery)
      )
    : [];

  const navigationCommands = [
    { id: 'dashboard', label: 'Go to Operations Dashboard', icon: LayoutDashboard },
    { id: 'triage', label: 'Go to Universal Triage Center', icon: HeartPulse },
    { id: 'doctor_queue', label: "Go to Doctor's Queue (Triaged)", icon: UserCheck },
    { id: 'patients', label: 'Go to Longitudinal EHR & Patients', icon: Stethoscope },
    { id: 'beds', label: 'Go to Inpatient Ward Bed Board', icon: Bed },
    { id: 'pharmacy', label: 'Go to Pharmacy & E-Prescriptions', icon: Pill },
    { id: 'lab', label: 'Go to Diagnostic Laboratory (LIS)', icon: FlaskConical },
    { id: 'imaging', label: 'Go to Radiology PACS Viewer', icon: ImageIcon },
    { id: 'billing', label: 'Go to Revenue Cycle & Invoicing', icon: CreditCard },
    { id: 'telehealth', label: 'Go to Telehealth Video Visits', icon: Video },
    { id: 'staff', label: 'Go to Clinical Roster & Pagers', icon: Users },
  ].filter(c => !cleanQuery || c.label.toLowerCase().includes(cleanQuery));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-950">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search patients, MRN, beds, medications, or jump to module..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* Quick Actions if empty */}
          {!cleanQuery && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                Emergency & Rapid Actions
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenEmergencyCode();
                  }}
                  className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-left hover:bg-rose-900/60 transition-colors cursor-pointer flex items-center space-x-2 text-rose-300"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-xs font-bold">Broadcast Code Blue / Emergency</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab('triage');
                  }}
                  className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-800 text-left hover:bg-cyan-900/60 transition-colors cursor-pointer flex items-center space-x-2 text-cyan-300"
                >
                  <HeartPulse className="w-4 h-4" />
                  <span className="text-xs font-bold">New Triage Assessment</span>
                </button>
              </div>
            </div>
          )}

          {/* Patients matching */}
          {matchingPatients.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                Patients Found ({matchingPatients.length})
              </span>
              <div className="space-y-1">
                {matchingPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onClose();
                      onOpenPatientEvaluation(p.mrn);
                    }}
                    className="p-3 rounded-lg bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-600 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Stethoscope className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          MRN: {p.mrn} • {p.age}y {p.gender} • {p.status}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">Open Clinical Chart →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications matching */}
          {matchingMeds.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                Formulary Medications ({matchingMeds.length})
              </span>
              <div className="space-y-1">
                {matchingMeds.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onClose();
                      onNavigateTab('pharmacy');
                    }}
                    className="p-3 rounded-lg bg-slate-950 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-600 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Pill className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {m.genericName} • Stock: {m.stock} {m.unit}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">View in Pharmacy →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beds matching */}
          {matchingBeds.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                Inpatient Beds ({matchingBeds.length})
              </span>
              <div className="space-y-1">
                {matchingBeds.map(b => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onClose();
                      onNavigateTab('beds');
                    }}
                    className="p-3 rounded-lg bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-600 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Bed className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">Bed {b.bedNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Status: {b.status} {b.patientName ? `• Occupant: ${b.patientName}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono">View Bed Board →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modules Navigation */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
              Clinical Modules & Navigation
            </span>
            <div className="grid grid-cols-2 gap-2">
              {navigationCommands.map(cmd => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onClose();
                      onNavigateTab(cmd.id);
                    }}
                    className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer flex items-center space-x-2 text-xs text-slate-300"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer shortcuts tip */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Press ESC to close</span>
          <span>ApexHealth Global Command Hub</span>
        </div>
      </div>
    </div>
  );
};
