import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  HeartPulse,
  Radio,
  ShieldAlert,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { EmergencyBroadcast } from '../../types';

interface EmergencyCodeModalProps {
  onClose: () => void;
}

export const EmergencyCodeModal: React.FC<EmergencyCodeModalProps> = ({ onClose }) => {
  const { triggerEmergencyBroadcast } = useHospital();

  const [codeType, setCodeType] = useState<EmergencyBroadcast['codeType']>('code_blue');
  const [location, setLocation] = useState('ED Resuscitation Bay 1');
  const [description, setDescription] = useState('Cardiac arrest in progress, CPR initiated, crash cart requested.');

  const codes: {
    type: EmergencyBroadcast['codeType'];
    title: string;
    label: string;
    color: string;
    defaultLoc: string;
    defaultDesc: string;
  }[] = [
    {
      type: 'code_blue',
      title: 'Code Blue',
      label: 'Adult Cardiac Arrest / Respiratory Failure',
      color: 'bg-blue-950 text-blue-300 border-blue-600',
      defaultLoc: 'ED Resuscitation Bay 1',
      defaultDesc: 'Cardiac arrest in progress, CPR initiated, crash cart requested.',
    },
    {
      type: 'trauma_code',
      title: 'Trauma STAT',
      label: 'Severe Polytrauma Inbound / Massive Transfusion',
      color: 'bg-rose-950 text-rose-300 border-rose-600',
      defaultLoc: 'Trauma Bay Alpha',
      defaultDesc: 'Level 1 trauma inbound via Medevac, MTP protocol activated.',
    },
    {
      type: 'code_stroke',
      title: 'Code Stroke',
      label: 'Acute Ischemic / Hemorrhagic Stroke Alert',
      color: 'bg-amber-950 text-amber-300 border-amber-600',
      defaultLoc: 'CT Scanner Suite 2',
      defaultDesc: 'Sudden onset hemiplegia and aphasia, LVO suspected, stat non-contrast head CT.',
    },
    {
      type: 'code_stemi',
      title: 'Code STEMI',
      label: 'ST-Elevation Myocardial Infarction',
      color: 'bg-red-950 text-red-300 border-red-600',
      defaultLoc: 'Cardiac Cath Lab 1',
      defaultDesc: 'Acute anterolateral STEMI, interventional cardiology team paged.',
    },
    {
      type: 'code_red',
      title: 'Code Red',
      label: 'Fire / Smoke Evacuation Protocol',
      color: 'bg-orange-950 text-orange-300 border-orange-600',
      defaultLoc: 'North Wing Floor 3',
      defaultDesc: 'Smoke detector activated in mechanical service room.',
    },
    {
      type: 'code_amber',
      title: 'Code Amber',
      label: 'Infant / Child Abduction Security Lock',
      color: 'bg-yellow-950 text-yellow-300 border-yellow-600',
      defaultLoc: 'Maternity Ward 4',
      defaultDesc: 'All hospital perimeter exits locked down, security dispatched.',
    },
  ];

  const handleSelectCode = (c: typeof codes[0]) => {
    setCodeType(c.type);
    setLocation(c.defaultLoc);
    setDescription(c.defaultDesc);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    triggerEmergencyBroadcast(codeType, location, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleBroadcast}
        className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-base font-bold text-white">Broadcast Hospital-Wide Emergency Alert</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Code Buttons Grid */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">
            Select Emergency Protocol
          </label>
          <div className="grid grid-cols-2 gap-2">
            {codes.map(c => {
              const isSelected = codeType === c.type;
              return (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => handleSelectCode(c)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${c.color} shadow-lg ring-1 ring-rose-500`
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{c.title}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{c.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">
            Specific Hospital Location / Room / Bay
          </label>
          <input
            required
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500 font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">
            Operational Clinical Directives / Description
          </label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500 font-mono"
          />
        </div>

        <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          <span>
            Executing broadcast triggers synthesized audio annunciators, emergency headers across all clinical terminals, and pages rapid response teams.
          </span>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-lg shadow-rose-950/50 cursor-pointer flex items-center space-x-2"
          >
            <Radio className="w-4 h-4 animate-ping" />
            <span>TRANSMIT STAT BROADCAST</span>
          </button>
        </div>
      </form>
    </div>
  );
};
