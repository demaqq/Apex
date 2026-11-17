import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  HeartPulse,
  Plus,
  Search,
  ShieldAlert,
  Volume2,
  VolumeX,
  X,
  Users,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';

interface HeaderProps {
  onOpenTriageIntake: () => void;
  onOpenEmergencyCode: () => void;
  onOpenGlobalSearch: () => void;
  onOpenLogin: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTriageIntake,
  onOpenEmergencyCode,
  onOpenGlobalSearch,
  onOpenLogin,
  activeTab,
  setActiveTab,
}) => {
  const {
    activeBroadcast,
    resolveEmergencyBroadcast,
    audioAlertsEnabled,
    toggleAudioAlerts,
    staff,
    beds,
    triageRecords,
    doctorQueue,
    currentUser,
  } = useHospital();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const onDutyCount = staff.filter(s => s.onDuty).length;
  const occupiedBedsCount = beds.filter(b => b.status === 'occupied').length;
  const totalBedsCount = beds.length;
  const bedOccupancyPercent = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;
  const waitingTriageCount = triageRecords.filter(t => t.status === 'Not Triaged' || t.status === 'In Triage').length;
  const pendingDoctorQueueCount = doctorQueue.length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl select-none">
      {/* Active Hospital Emergency Broadcast Banner */}
      {activeBroadcast && (
        <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-white/20 rounded-full animate-ping">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold uppercase tracking-wider text-xs bg-black/40 px-2 py-0.5 rounded mr-2">
                HOSPITAL-WIDE ALERT: {activeBroadcast.codeType}
              </span>
              <span className="font-medium text-xs">
                Location: <strong className="underline">{activeBroadcast.location}</strong> — {activeBroadcast.description}
              </span>
              <span className="text-[11px] text-red-200 ml-2">
                (Initiated at {activeBroadcast.initiatedAt} by {activeBroadcast.initiator})
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => resolveEmergencyBroadcast(activeBroadcast.id)}
              className="bg-white text-red-700 hover:bg-red-50 font-bold text-xs px-3 py-1.5 rounded shadow transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resolve & Clear Code</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Command Header */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Hospital Center */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              <HeartPulse className="w-5 h-5 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold text-white tracking-tight">ApexHealth</span>
                <span className="text-[9px] uppercase font-bold tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                  Clinical OS
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  • St. Jude Medical Center
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Tier-1 Level-A Trauma Center & Universal Triage Gateway</span>
              </p>
            </div>
          </div>
        </div>

        {/* Global Search Bar (Trigger) */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <button
            onClick={onOpenGlobalSearch}
            className="w-full bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 truncate">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Search patients, MRN, triage queue, beds, lab tests, medications...</span>
            </div>
            <kbd className="hidden sm:inline-block bg-slate-900 border border-slate-700 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0">
              ⌘K / /
            </kbd>
          </button>
        </div>

        {/* Clinical Operations HUD & Action Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Telemetry Indicators */}
          <div className="hidden lg:flex items-center space-x-3 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300">
            <div
              onClick={() => setActiveTab('beds')}
              className="flex items-center space-x-1.5 cursor-pointer hover:text-cyan-400 transition-colors"
              title="Bed Occupancy"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Beds: {occupiedBedsCount}/{totalBedsCount}</span>
              <span className={`text-[10px] px-1.5 rounded font-bold font-mono ${
                bedOccupancyPercent > 85 ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'
              }`}>
                {bedOccupancyPercent}%
              </span>
            </div>

            <span className="text-slate-700">|</span>

            <div
              onClick={() => setActiveTab('triage')}
              className="flex items-center space-x-1.5 cursor-pointer hover:text-rose-400 transition-colors"
              title="Central Triage Waiting Queue"
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Triage Queue: </span>
              <span className="font-bold text-rose-300 font-mono">
                {waitingTriageCount} waiting
              </span>
            </div>

            <span className="text-slate-700">|</span>

            <div
              onClick={() => setActiveTab('doctor_queue')}
              className="flex items-center space-x-1.5 cursor-pointer hover:text-cyan-400 transition-colors"
              title="Triaged Patients Ready in Doctor's Queue"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Doctor's Queue: </span>
              <span className="font-bold text-cyan-300 font-mono">
                {pendingDoctorQueueCount} ready
              </span>
            </div>
          </div>

          {/* Sound Synthesizer Toggle */}
          <button
            onClick={toggleAudioAlerts}
            title={audioAlertsEnabled ? 'Audio alerts synthesized' : 'Audio alerts muted'}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
          >
            {audioAlertsEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Clock */}
          <div className="hidden xl:flex items-center space-x-1.5 text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentTime || '08:00:00'}</span>
          </div>

          {/* Triage Intake Action */}
          <button
            onClick={onOpenTriageIntake}
            className="bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md shadow-rose-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Register & Triage New Patient"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Triage Intake</span>
            <span className="sm:hidden">Triage</span>
          </button>

          {/* Emergency Code Launcher */}
          <button
            onClick={onOpenEmergencyCode}
            className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl shadow-md shadow-amber-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Broadcast Hospital Emergency Code"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">Code Alert</span>
          </button>

          {/* User Role Switcher Profile Chip */}
          <div className="pl-1 sm:pl-2 border-l border-slate-800 flex items-center">
            <button
              onClick={onOpenLogin}
              className="bg-slate-800 hover:bg-slate-800/80 border border-slate-700 hover:border-cyan-500/80 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 text-left transition-all shadow-sm group cursor-pointer"
              title="Click to switch role or sign in as GP, Resident, Specialist, Triage Nurse, Pharmacist, Lab Tech"
            >
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm shrink-0`}
              >
                {currentUser.name
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden md:block">
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center space-x-1">
                  <span>{currentUser.name}</span>
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-cyan-300 border border-slate-700">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold hidden xl:inline underline underline-offset-2 ml-1">
                Switch Role
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
