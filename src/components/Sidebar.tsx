import React from 'react';
import {
  Activity,
  Bed,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Pill,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  UserCheck,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const {
    triageRecords,
    doctorQueue,
    prescriptions,
    labOrders,
    imagingOrders,
    invoices,
    beds,
    patients,
    currentUser,
    resetToDefaults,
  } = useHospital();

  const waitingTriageCount = triageRecords.filter(t => t.status === 'Not Triaged' || t.status === 'In Triage').length;
  const readyDoctorCount = doctorQueue.length;
  const pendingRxCount = prescriptions.filter(p => p.status === 'Pending').length;
  const pendingLabCount = labOrders.filter(l => l.status !== 'Completed').length;
  const pendingImagingCount = imagingOrders.filter(i => i.status !== 'Report Available').length;
  const pendingInvoiceCount = invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue').length;
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Operations Center',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-cyan-400',
    },
    {
      id: 'triage',
      label: 'Universal Triage Center',
      icon: HeartPulse,
      badge: waitingTriageCount > 0 ? `${waitingTriageCount} In Triage` : null,
      badgeColor: 'bg-rose-950 text-rose-300 border border-rose-800',
      color: 'text-rose-400',
    },
    {
      id: 'doctor_queue',
      label: "Doctor's Queue (Triaged)",
      icon: UserCheck,
      badge: readyDoctorCount > 0 ? `${readyDoctorCount} Ready` : null,
      badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-800',
      color: 'text-cyan-400',
    },
    {
      id: 'departments',
      label: 'Clinical Departments',
      icon: Layers,
      badge: '10 Depts',
      badgeColor: 'bg-indigo-950 text-indigo-300 border border-indigo-800',
      color: 'text-indigo-400',
    },
    {
      id: 'patients',
      label: 'EHR & Patients Directory',
      icon: Stethoscope,
      badge: `${patients.length}`,
      badgeColor: 'bg-slate-800 text-slate-300',
      color: 'text-blue-400',
    },
    {
      id: 'beds',
      label: 'Ward Bed Board',
      icon: Bed,
      badge: `${occupiedBeds}/${beds.length}`,
      badgeColor: 'bg-indigo-950 text-indigo-300 border border-indigo-800',
      color: 'text-indigo-400',
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy & E-Rx',
      icon: Pill,
      badge: pendingRxCount > 0 ? `${pendingRxCount} Rx` : null,
      badgeColor: 'bg-amber-950 text-amber-300 border border-amber-800',
      color: 'text-amber-400',
    },
    {
      id: 'lab',
      label: 'Diagnostic Lab (LIS)',
      icon: FlaskConical,
      badge: pendingLabCount > 0 ? `${pendingLabCount} Tests` : null,
      badgeColor: 'bg-purple-950 text-purple-300 border border-purple-800',
      color: 'text-purple-400',
    },
    {
      id: 'imaging',
      label: 'Radiology & Imaging (PACS)',
      icon: ImageIcon,
      badge: pendingImagingCount > 0 ? `${pendingImagingCount} Scans` : null,
      badgeColor: 'bg-violet-950 text-violet-300 border border-violet-800',
      color: 'text-violet-400',
    },
    {
      id: 'billing',
      label: 'Revenue & EDI Claims',
      icon: CreditCard,
      badge: pendingInvoiceCount > 0 ? `${pendingInvoiceCount} Due` : null,
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
      color: 'text-emerald-400',
    },
    {
      id: 'telehealth',
      label: 'Telehealth & Visits',
      icon: Video,
      badge: null,
      color: 'text-teal-400',
    },
    {
      id: 'staff',
      label: 'Clinical Roster & Pagers',
      icon: Users,
      badge: null,
      color: 'text-sky-400',
    },
    {
      id: 'audit',
      label: 'HIPAA Audit Trail',
      icon: ShieldCheck,
      badge: null,
      color: 'text-slate-400',
    },
  ];

  const handleReset = () => {
    if (window.confirm('Reset all hospital simulation data to initial clinical defaults?')) {
      resetToDefaults();
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-[calc(100vh-57px)] select-none overflow-y-auto">
      {/* Navigation Group */}
      <div className="p-3 space-y-1">
        <div className="px-3 pt-2 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
          Clinical Operations Modules
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${
                    isActive ? item.color : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info & Reset Action */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-200">System Mode</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              LIVE CLINICAL
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center space-x-1">
            <span>Current Role:</span>
            <span className="font-mono text-cyan-400 font-bold">{currentUser.role}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            45 CFR § 164.312 HIPAA Compliant
          </div>
        </div>

        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg border border-slate-800 hover:border-rose-900/50 transition-colors cursor-pointer"
          title="Reset sample data back to standard demo state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Records</span>
        </button>
      </div>
    </aside>
  );
};
