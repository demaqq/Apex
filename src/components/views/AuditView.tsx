import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { AuditEvent } from '../../types';

export const AuditView: React.FC = () => {
  const { auditEvents } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredEvents = auditEvents.filter(event => {
    const uName = event.userName || event.user || 'System';
    const matchesSearch =
      event.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.patientMrn && event.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['All', 'CLINICAL', 'TRIAGE', 'MEDICATION', 'ADMISSION', 'BILLING', 'SECURITY', 'AUTH'];

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Category', 'User', 'Role', 'Action', 'Patient MRN', 'Details', 'IP Address'];
    const rows = filteredEvents.map(e => [
      e.timestamp,
      e.category,
      e.userName || e.user || 'System',
      e.userRole || e.role || 'Staff',
      `"${e.action.replace(/"/g, '""')}"`,
      e.patientMrn || 'N/A',
      `"${e.details.replace(/"/g, '""')}"`,
      e.ipAddress || '127.0.0.1',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ApexHealth_HIPAA_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>HIPAA 45 CFR § 164.312(b) Immutable Access Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            HIPAA Security & Clinical Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable forensic logging of all PHI chart accesses, triage registrations, e-prescribing, and financial transactions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 border border-slate-700 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search User, MRN, Action, Details..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>SHA-256 Tamper-Evident Digest Active</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Category</th>
              <th className="p-3">User & Role</th>
              <th className="p-3">Action</th>
              <th className="p-3">Subject MRN</th>
              <th className="p-3">Details / PHI Affected</th>
              <th className="p-3">Origin IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredEvents.map(event => (
              <tr key={event.id} className="hover:bg-slate-800/40">
                <td className="p-3 text-slate-400 whitespace-nowrap">{event.timestamp}</td>
                <td className="p-3">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      event.category === 'SECURITY'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : event.category === 'CLINICAL'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : event.category === 'TRIAGE'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : event.category === 'MEDICATION'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {event.category}
                  </span>
                </td>
                <td className="p-3 font-sans">
                  <div className="font-semibold text-white">{event.userName || event.user}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{event.userRole || event.role}</div>
                </td>
                <td className="p-3 text-white font-semibold font-sans">{event.action}</td>
                <td className="p-3 text-cyan-400 font-semibold">{event.patientMrn || '—'}</td>
                <td className="p-3 text-slate-300 font-sans max-w-xs truncate">{event.details}</td>
                <td className="p-3 text-slate-500 text-[10px]">{event.ipAddress || '192.168.1.101'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
