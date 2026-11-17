import React, { useState } from 'react';
import {
  Bed as BedIcon,
  CheckCircle2,
  Clock,
  Filter,
  HeartPulse,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { Bed, BedStatus, Patient } from '../../types';

interface BedsViewProps {
  onNavigateTab: (tab: string) => void;
}

export const BedsView: React.FC<BedsViewProps> = ({ onNavigateTab }) => {
  const { beds, wards, patients, updateBedStatus, transferPatientBed, assignBedToPatient, releaseBed } =
    useHospital();

  const [selectedWard, setSelectedWard] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Admit / Assign Modal state
  const [assigningBed, setAssigningBed] = useState<Bed | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Transfer Modal state
  const [transferringBed, setTransferringBed] = useState<Bed | null>(null);
  const [targetBedId, setTargetBedId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  // Filtered beds
  const filteredBeds = beds.filter(bed => {
    const matchesWard = selectedWard === 'All' || bed.wardId === selectedWard;
    const matchesStatus = statusFilter === 'All' || bed.status === statusFilter;
    const matchesSearch =
      bed.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bed.patientName && bed.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (bed.patientMrn && bed.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesWard && matchesStatus && matchesSearch;
  });

  // Calculate statistics
  const totalBeds = beds.length;
  const occupiedCount = beds.filter(b => b.status === 'occupied').length;
  const availableCount = beds.filter(b => b.status === 'available').length;
  const cleaningCount = beds.filter(b => b.status === 'cleaning').length;
  const reservedCount = beds.filter(b => b.status === 'reserved').length;

  const handleAssignPatient = () => {
    if (!assigningBed || !selectedPatientId) return;
    const patient = patients.find(p => p.id === selectedPatientId);
    if (patient) {
      assignBedToPatient(assigningBed.id, patient);
      setAssigningBed(null);
      setSelectedPatientId('');
    }
  };

  const handleTransfer = () => {
    if (!transferringBed || !targetBedId || !transferringBed.patientMrn) return;
    const patient = patients.find(p => p.mrn === transferringBed.patientMrn);
    if (patient) {
      transferPatientBed(patient.id, transferringBed.id, targetBedId, transferReason || 'Clinical Step-down / Ward Transfer');
      setTransferringBed(null);
      setTargetBedId('');
      setTransferReason('');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            <BedIcon className="w-4 h-4" />
            <span>Inpatient Bed Management & Ward Census</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Hospital Bed Board & Floor Operations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time census tracking, patient-to-bed allocation, telemetry monitoring, and turnover cleaning cycles.
          </p>
        </div>

        {/* Status Count Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-semibold">
            {availableCount} Available
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-800 text-indigo-300 font-semibold">
            {occupiedCount} Occupied ({Math.round((occupiedCount / totalBeds) * 100)}%)
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 font-semibold">
            {cleaningCount} Cleaning
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-purple-950/70 border border-purple-800 text-purple-300 font-semibold">
            {reservedCount} Reserved
          </span>
        </div>
      </div>

      {/* Ward Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Ward Selector */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedWard('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
              selectedWard === 'All'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Wards ({beds.length})
          </button>
          {wards.map(ward => {
            const wardBeds = beds.filter(b => b.wardId === ward.id);
            const wardOccupied = wardBeds.filter(b => b.status === 'occupied').length;
            return (
              <button
                key={ward.id}
                onClick={() => setSelectedWard(ward.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                  selectedWard === ward.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{ward.name}</span>
                <span className="ml-1.5 text-[10px] font-mono opacity-80">
                  ({wardOccupied}/{wardBeds.length})
                </span>
              </button>
            );
          })}
        </div>

        {/* Status & Search Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Bed, Patient, MRN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="cleaning">Cleaning</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Bed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBeds.map(bed => {
          const ward = wards.find(w => w.id === bed.wardId);
          return (
            <div
              key={bed.id}
              className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                bed.status === 'occupied'
                  ? 'bg-slate-900/90 border-indigo-900/80 shadow-md shadow-indigo-950/20'
                  : bed.status === 'available'
                  ? 'bg-slate-900/80 border-emerald-900/70 hover:border-emerald-600/80'
                  : bed.status === 'cleaning'
                  ? 'bg-slate-900/80 border-amber-900/70'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Top Row: Bed Number & Status */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-white font-mono">{bed.bedNumber}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {ward?.name || bed.wardId}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      bed.status === 'available'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : bed.status === 'occupied'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                        : bed.status === 'cleaning'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                        : 'bg-purple-950 text-purple-300 border border-purple-700'
                    }`}
                  >
                    {bed.status}
                  </span>
                </div>

                {/* Bed Body Content */}
                <div className="mt-3">
                  {bed.status === 'occupied' ? (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{bed.patientName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        MRN: <span className="text-cyan-400">{bed.patientMrn}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Admitted: <span className="text-slate-300 font-mono">{bed.admittedDate || 'Today'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(bed.features || ['Telemetry', 'Oxygen Ports']).map((f: string, i: number) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : bed.status === 'cleaning' ? (
                    <div className="py-4 text-center space-y-1">
                      <Sparkles className="w-6 h-6 text-amber-400 mx-auto animate-bounce" />
                      <p className="text-xs font-medium text-amber-300">Terminal Disinfection</p>
                      <p className="text-[10px] text-slate-500">Scheduled turnover in progress</p>
                    </div>
                  ) : bed.status === 'available' ? (
                    <div className="py-4 text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                      <p className="text-xs font-medium text-emerald-300">Ready for Admission</p>
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        {(bed.features || ['Telemetry', 'Oxygen Ports']).map((f: string, i: number) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-500">
                      Reserved for Incoming Scheduled Surgery
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {bed.status === 'occupied' ? (
                  <>
                    <button
                      onClick={() => setTransferringBed(bed)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Transfer Bed
                    </button>
                    <button
                      onClick={() => releaseBed(bed.id)}
                      className="px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Discharge
                    </button>
                  </>
                ) : bed.status === 'available' ? (
                  <button
                    onClick={() => setAssigningBed(bed)}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Admit Patient to Bed
                  </button>
                ) : bed.status === 'cleaning' ? (
                  <button
                    onClick={() => updateBedStatus(bed.id, 'available')}
                    className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Mark Cleaning Complete
                  </button>
                ) : (
                  <button
                    onClick={() => updateBedStatus(bed.id, 'available')}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
                  >
                    Release Reservation
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Admit Patient to Bed */}
      {assigningBed && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BedIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Admit Patient to Bed {assigningBed.bedNumber}</h3>
              </div>
              <button
                onClick={() => setAssigningBed(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an admitted or triaged patient requiring an inpatient bed:
            </p>

            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">-- Choose Patient from Roster --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name || `${p.firstName || ''} ${p.lastName || ''}`} ({p.mrn}) — {p.status} • {(p.conditions && p.conditions[0]) || (p.diagnoses && p.diagnoses[0]) || 'Under Observation'}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setAssigningBed(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!selectedPatientId}
                onClick={handleAssignPatient}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Confirm Bed Admission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer Bed */}
      {transferringBed && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Transfer Patient from {transferringBed.bedNumber}</h3>
              </div>
              <button
                onClick={() => setTransferringBed(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Patient: <strong>{transferringBed.patientName}</strong> ({transferringBed.patientMrn})
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Target Bed</label>
              <select
                value={targetBedId}
                onChange={e => setTargetBedId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Select Available Destination Bed --</option>
                {beds
                  .filter(b => b.status === 'available')
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bedNumber} ({wards.find(w => w.id === b.wardId)?.name})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Clinical Transfer Reason</label>
              <input
                type="text"
                placeholder="e.g. ICU Step-down to Med-Surg or telemetry requirement"
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setTransferringBed(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!targetBedId}
                onClick={handleTransfer}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Execute Ward Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
