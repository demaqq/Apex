import React from 'react';
import {
  Bed,
  Command,
  CreditCard,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Keyboard,
  LayoutDashboard,
  Pill,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  X,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const shortcutGroups = [
    {
      category: 'Primary Module Navigation',
      shortcuts: [
        { key: 'D', description: 'Operations Command Center & Census', icon: LayoutDashboard },
        { key: 'T', description: 'Universal Central Triage Center', icon: HeartPulse },
        { key: 'Q', description: "Doctor's Consultation Queue (Triaged)", icon: UserCheck },
        { key: 'P', description: 'Longitudinal EHR & Patients Directory', icon: Stethoscope },
        { key: 'B', description: 'Inpatient Ward Bed Board & Census', icon: Bed },
        { key: 'R', description: 'Pharmacy Dispensing & E-Prescriptions', icon: Pill },
        { key: 'L', description: 'Diagnostic Pathology Laboratory (LIS)', icon: FlaskConical },
        { key: 'I', description: 'Radiology PACS Viewer & Imaging Scans', icon: ImageIcon },
        { key: 'M', description: 'Revenue Cycle & Claims Billing', icon: CreditCard },
      ],
    },
    {
      category: 'Rapid Actions & Hotkeys',
      shortcuts: [
        { key: 'N', description: 'New Patient Triage Registration Intake', icon: HeartPulse },
        { key: 'C', description: 'Broadcast Hospital Emergency Code (STAT)', icon: ShieldAlert },
        { key: '/', description: 'Open Global Command Search & Patient Lookup', icon: Search },
        { key: '?', description: 'Display this Keyboard Shortcuts Reference', icon: Keyboard },
        { key: 'Esc', description: 'Close any active modal or return to view', icon: X },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Professional PC-First Keyboard Shortcuts Reference
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          ApexHealth is optimized for rapid clinical navigation with zero-latency single-key shortcuts:
        </p>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                {group.category}
              </span>
              <div className="space-y-1.5">
                {group.shortcuts.map((sc, sIdx) => {
                  const Icon = sc.icon;
                  return (
                    <div
                      key={sIdx}
                      className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-200">{sc.description}</span>
                      </div>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-cyan-300 shadow-sm">
                        {sc.key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
          <span>ApexHealth Clinical Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
