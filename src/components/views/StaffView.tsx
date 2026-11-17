import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Mail,
  Phone,
  Radio,
  Search,
  Send,
  Shield,
  Stethoscope,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { StaffMember } from '../../types';

export const StaffView: React.FC = () => {
  const { staff, toggleStaffOnDuty, pageStaffMember } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Pager Modal
  const [pagingStaff, setPagingStaff] = useState<StaffMember | null>(null);
  const [pagerMessage, setPagerMessage] = useState('');
  const [pagerPriority, setPagerPriority] = useState<'Normal' | 'Urgent' | 'STAT'>('Urgent');

  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || member.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const onDutyCount = staff.filter(s => s.isOnDuty).length;

  const handleSendPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagingStaff || !pagerMessage.trim()) return;

    pageStaffMember(pagingStaff.id, pagerMessage, pagerPriority);
    setPagingStaff(null);
    setPagerMessage('');
    alert(`STAT Digital Page transmitted to ${pagingStaff.name}'s pager.`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-sky-400 uppercase tracking-widest font-semibold">
            <Users className="w-4 h-4" />
            <span>Clinical Workforce, Duty Rosters & Digital Paging</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Hospital Staff Directory & Emergency Pagers
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active physician rosters, shift duty toggles, on-call specialist telemetry, and real-time STAT digital pagers.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold">
            {onDutyCount} Clinicians Active On-Duty
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search clinician by name, role, department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedDept}
          onChange={e => setSelectedDept(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="All">All Departments</option>
          <option value="Emergency Medicine">Emergency Medicine</option>
          <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
          <option value="Cardiology">Cardiology</option>
          <option value="Neurology">Neurology</option>
          <option value="Internal Medicine">Internal Medicine</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Pathology & Laboratory">Pathology & Laboratory</option>
        </select>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map(member => (
          <div
            key={member.id}
            className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
              member.isOnDuty
                ? 'bg-slate-900/90 border-slate-800 shadow-sm'
                : 'bg-slate-900/40 border-slate-800/60 opacity-70'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <span>{member.name}</span>
                    {member.isOnDuty && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active on duty" />
                    )}
                  </h3>
                  <div className="text-xs text-cyan-400 font-mono mt-0.5">{member.role}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{member.department}</div>
                </div>

                <button
                  onClick={() => toggleStaffOnDuty(member.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                    member.isOnDuty
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {member.isOnDuty ? 'On Duty' : 'Off Duty'}
                </button>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Shift:</span>
                  <span className="text-slate-300">{member.shift}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pager Frequency:</span>
                  <span className="text-sky-400 font-semibold">{member.pagerNumber || 'CH-409'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direct Extension:</span>
                  <span className="text-slate-300">{member.phone}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {member.isOnDuty ? 'Available for STAT consult' : 'Off shift'}
              </span>

              <button
                onClick={() => setPagingStaff(member)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Send Page</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Send Digital Page */}
      {pagingStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendPage}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Transmit Digital Page to {pagingStaff.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPagingStaff(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 font-mono">
              Role: {pagingStaff.role} • Dept: {pagingStaff.department} • Pager: {pagingStaff.pagerNumber}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Priority Level</label>
              <div className="flex items-center space-x-2">
                {(['Normal', 'Urgent', 'STAT'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPagerPriority(p)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      pagerPriority === p
                        ? p === 'STAT'
                          ? 'bg-rose-950 text-rose-300 border-rose-600'
                          : 'bg-sky-950 text-sky-300 border-sky-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Page Message</label>
              <textarea
                required
                rows={3}
                value={pagerMessage}
                onChange={e => setPagerMessage(e.target.value)}
                placeholder="e.g. STAT bedside consult requested in ED Bay 2 for acute STEMI evaluation."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPagingStaff(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Transmit Tone & Message
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
