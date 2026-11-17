import React from 'react';
import {
  ChevronRight,
  Home,
  HeartPulse,
  UserCheck,
  Stethoscope,
  Bed,
  Pill,
  FlaskConical,
  Image as ImageIcon,
  Layers,
  CreditCard,
  Video,
  Users,
  ShieldCheck,
  ArrowLeft,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { Patient, TriageRecord } from '../../types';

interface BreadcrumbsProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  activeTriageRecord?: TriageRecord | null;
  onCloseTriageRecord?: () => void;
  evaluatingPatient?: Patient | null;
  onCloseEvaluation?: () => void;
  selectedPatient?: Patient | null;
  onClearSelectedPatient?: () => void;
}

interface CrumbItem {
  label: string;
  tabKey?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrent?: boolean;
  badge?: string;
  badgeColor?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeTab,
  onNavigateTab,
  activeTriageRecord,
  onCloseTriageRecord,
  evaluatingPatient,
  onCloseEvaluation,
  selectedPatient,
  onClearSelectedPatient,
}) => {
  const { currentUser, activeBroadcast } = useHospital();

  // Build the hierarchical breadcrumb path based on tab and active sub-views
  const getCrumbs = (): CrumbItem[] => {
    const crumbs: CrumbItem[] = [
      {
        label: 'Dashboard',
        tabKey: 'dashboard',
        icon: Home,
        onClick: () => {
          if (activeTriageRecord && onCloseTriageRecord) onCloseTriageRecord();
          if (evaluatingPatient && onCloseEvaluation) onCloseEvaluation();
          if (selectedPatient && onClearSelectedPatient) onClearSelectedPatient();
          onNavigateTab('dashboard');
        },
      },
    ];

    switch (activeTab) {
      case 'dashboard':
        crumbs[0].isCurrent = true;
        break;

      case 'triage':
        crumbs.push({
          label: 'Triage Center',
          tabKey: 'triage',
          icon: HeartPulse,
          isCurrent: !activeTriageRecord,
          onClick: () => {
            if (activeTriageRecord && onCloseTriageRecord) onCloseTriageRecord();
            onNavigateTab('triage');
          },
        });
        if (activeTriageRecord) {
          crumbs.push({
            label: `Patient Assessment (${activeTriageRecord.patientName})`,
            isCurrent: true,
            badge: `ESI ${activeTriageRecord.esiLevel || 'Pending'}`,
            badgeColor: 'bg-rose-950 text-rose-300 border-rose-700',
          });
        }
        break;

      case 'doctor_queue':
        crumbs.push({
          label: "Doctor's Queue",
          tabKey: 'doctor_queue',
          icon: UserCheck,
          isCurrent: !evaluatingPatient,
          onClick: () => {
            if (evaluatingPatient && onCloseEvaluation) onCloseEvaluation();
            onNavigateTab('doctor_queue');
          },
        });
        if (evaluatingPatient) {
          crumbs.push({
            label: `Clinical Evaluation (${evaluatingPatient.name || `${evaluatingPatient.firstName} ${evaluatingPatient.lastName}`})`,
            isCurrent: true,
            badge: evaluatingPatient.mrn,
            badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          });
        }
        break;

      case 'departments':
        crumbs.push({
          label: 'Clinical Departments',
          tabKey: 'departments',
          icon: Layers,
          isCurrent: true,
          badge: '40+ Specialties',
          badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
        });
        break;

      case 'patients':
        crumbs.push({
          label: 'Patients Directory',
          tabKey: 'patients',
          icon: Stethoscope,
          isCurrent: !selectedPatient,
          onClick: () => {
            if (selectedPatient && onClearSelectedPatient) onClearSelectedPatient();
            onNavigateTab('patients');
          },
        });
        if (selectedPatient) {
          crumbs.push({
            label: `Patient Chart: ${selectedPatient.firstName} ${selectedPatient.lastName}`,
            isCurrent: true,
            badge: selectedPatient.mrn,
            badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
          });
        }
        break;

      case 'beds':
        crumbs.push({
          label: 'Ward Bed Board',
          tabKey: 'beds',
          icon: Bed,
          isCurrent: true,
          badge: 'Bed Allocation & Census',
          badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
        });
        break;

      case 'pharmacy':
        crumbs.push({
          label: 'Pharmacy & E-Rx',
          tabKey: 'pharmacy',
          icon: Pill,
          isCurrent: true,
          badge: 'CPOE Dispensing',
          badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        });
        break;

      case 'lab':
        crumbs.push({
          label: 'Diagnostics',
          onClick: () => onNavigateTab('lab'),
        });
        crumbs.push({
          label: 'Laboratory (LIS)',
          tabKey: 'lab',
          icon: FlaskConical,
          isCurrent: true,
          badge: 'Specimen Worklist',
          badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
        });
        break;

      case 'imaging':
        crumbs.push({
          label: 'Diagnostics',
          onClick: () => onNavigateTab('imaging'),
        });
        crumbs.push({
          label: 'Radiology & PACS',
          tabKey: 'imaging',
          icon: ImageIcon,
          isCurrent: true,
          badge: 'DICOM Viewer',
          badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
        });
        break;

      case 'billing':
        crumbs.push({
          label: 'Revenue Cycle',
          onClick: () => onNavigateTab('billing'),
        });
        crumbs.push({
          label: 'Billing & EDI Claims',
          tabKey: 'billing',
          icon: CreditCard,
          isCurrent: true,
          badge: 'ANSI 837',
          badgeColor: 'bg-teal-950 text-teal-300 border-teal-700',
        });
        break;

      case 'telehealth':
        crumbs.push({
          label: 'Virtual Care',
          onClick: () => onNavigateTab('telehealth'),
        });
        crumbs.push({
          label: 'Telehealth Consultations',
          tabKey: 'telehealth',
          icon: Video,
          isCurrent: true,
          badge: 'WebRTC Room',
          badgeColor: 'bg-sky-950 text-sky-300 border-sky-700',
        });
        break;

      case 'staff':
        crumbs.push({
          label: 'Operations',
          onClick: () => onNavigateTab('staff'),
        });
        crumbs.push({
          label: 'Staff & Rosters',
          tabKey: 'staff',
          icon: Users,
          isCurrent: true,
        });
        break;

      case 'audit':
        crumbs.push({
          label: 'Compliance',
          onClick: () => onNavigateTab('audit'),
        });
        crumbs.push({
          label: 'HIPAA Audit Trail',
          tabKey: 'audit',
          icon: ShieldCheck,
          isCurrent: true,
          badge: 'Immutable Log',
          badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        });
        break;

      default:
        crumbs.push({
          label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
          isCurrent: true,
        });
        break;
    }

    return crumbs;
  };

  const crumbs = getCrumbs();
  const canGoBack = crumbs.length > 1;

  const handleBack = () => {
    if (activeTriageRecord && onCloseTriageRecord) {
      onCloseTriageRecord();
      return;
    }
    if (evaluatingPatient && onCloseEvaluation) {
      onCloseEvaluation();
      return;
    }
    if (selectedPatient && onClearSelectedPatient) {
      onClearSelectedPatient();
      return;
    }
    // Step back to dashboard
    onNavigateTab('dashboard');
  };

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs select-none backdrop-blur-sm z-20 flex-shrink-0"
    >
      {/* Left: Quick Back Button + Breadcrumbs List */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
        {canGoBack && (
          <button
            onClick={handleBack}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shadow-sm"
            title="Go back to previous level"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>
        )}

        <ol className="flex items-center space-x-1.5 flex-nowrap">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            const Icon = crumb.icon;

            return (
              <li key={`${crumb.label}-${index}`} className="flex items-center space-x-1.5 flex-shrink-0">
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}

                {crumb.isCurrent ? (
                  <div className="flex items-center space-x-1.5 font-semibold text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-800/60 shadow-sm">
                    {Icon && <Icon className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{crumb.label}</span>
                    {crumb.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-medium ${
                          crumb.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {crumb.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={crumb.onClick}
                    className="flex items-center space-x-1 text-slate-400 hover:text-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition-colors"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{crumb.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right: Active Role Context Indicator */}
      <div className="hidden md:flex items-center space-x-3 flex-shrink-0 ml-4">
        {activeBroadcast && (
          <div className="flex items-center space-x-1.5 text-rose-300 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-full text-[11px] animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span className="font-semibold uppercase tracking-wider">{activeBroadcast.codeType}</span>
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-full">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-300 font-medium">{currentUser.name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-mono text-[10px]">{currentUser.title}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{currentUser.department}</span>
        </div>
      </div>
    </nav>
  );
};
