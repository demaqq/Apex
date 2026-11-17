import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { Invoice } from '../../types';

export const BillingView: React.FC = () => {
  const { invoices, submitInsuranceClaim, recordInvoicePayment, createInvoice, patients } =
    useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(invoices[0] || null);

  // New Invoice Modal
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [invoicePatientId, setInvoicePatientId] = useState('');

  const filteredInvoices = invoices.filter(inv => {
    const pMrn = inv.patientMrn || inv.mrn || '';
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pMrn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalPending = totalBilled - totalPaid;

  const handleCreateNewInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === invoicePatientId);
    if (!patient) return;

    createInvoice(patient.id, [
      {
        id: `item-${Date.now()}-1`,
        description: 'Level 4 Emergency Department Facility Fee & Triage',
        quantity: 1,
        unitPrice: 450,
        total: 450,
        cptCode: '99284',
      },
      {
        id: `item-${Date.now()}-2`,
        description: 'Attending Physician Clinical Evaluation (Comprehensive)',
        quantity: 1,
        unitPrice: 280,
        total: 280,
        cptCode: '99223',
      },
      {
        id: `item-${Date.now()}-3`,
        description: 'Diagnostic Pathology Profile (CBC + CMP)',
        quantity: 1,
        unitPrice: 195,
        total: 195,
        cptCode: '80053',
      },
    ]);

    setShowNewInvoiceModal(false);
    setInvoicePatientId('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">
            <CreditCard className="w-4 h-4" />
            <span>Revenue Cycle Management & EDI 837 Electronic Claims</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Hospital Billing & Insurance Clearinghouse
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ICD-10 clinical coding, CPT fee schedules, HIPAA 5010 electronic claim generation, and patient payment processing.
          </p>
        </div>

        <button
          onClick={() => setShowNewInvoiceModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Billing Charge Capture</span>
        </button>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Total Billed Charges</span>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            ${totalBilled.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono mt-1 block">
            Across {invoices.length} Active Accounts
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Payments Collected</span>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            ${totalPaid.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            {Math.round((totalPaid / (totalBilled || 1)) * 100)}% Collection Rate
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Claims In Clearinghouse</span>
          <div className="mt-2 text-2xl font-bold text-cyan-400 font-mono">
            ${totalPending.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            Awaiting Payer Remittance
          </span>
        </div>
      </div>

      {/* Main Billing Split: List + Invoice Detail Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Invoice List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Invoice #, Patient, MRN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Claim Submitted">Claim Submitted</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="space-y-2">
            {filteredInvoices.map(inv => {
              const isSelected = selectedInvoice?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : inv.status === 'Claim Submitted'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-1">{inv.patientName}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
                    <span>MRN: {inv.patientMrn || inv.mrn}</span>
                    <span className="font-bold text-white">${inv.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Itemized Statement & EDI Claim Actions (7 cols) */}
        {selectedInvoice ? (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                  Itemized Hospital Statement
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedInvoice.invoiceNumber}</h2>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Issued: {selectedInvoice.issuedDate || selectedInvoice.date} • Due: {selectedInvoice.dueDate}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => alert(`Generated PDF Statement for ${selectedInvoice.invoiceNumber}`)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Patient & Insurance Payer Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/70 border border-slate-800 rounded-lg text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-mono font-semibold">Billed Patient</div>
                <div className="font-bold text-white mt-0.5">{selectedInvoice.patientName}</div>
                <div className="text-slate-400 font-mono">MRN: {selectedInvoice.patientMrn || selectedInvoice.mrn}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 uppercase font-mono font-semibold">Primary Payer</div>
                <div className="font-bold text-cyan-400 mt-0.5">{selectedInvoice.insuranceProvider || 'Primary Health Insurance'}</div>
                <div className="text-slate-400 font-mono">Claim ID: {selectedInvoice.insuranceClaimId || 'UNSUBMITTED'}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">CPT Code</th>
                    <th className="p-2.5">Clinical Service / Charge Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {selectedInvoice.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-cyan-400 font-semibold">{item.cptCode || '99281'}</td>
                      <td className="p-2.5 text-white font-sans">{item.description}</td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">${item.unitPrice}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">${item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal Gross Charges:</span>
                <span>${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payer Copay / Deductible:</span>
                <span>${(selectedInvoice.totalAmount * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm border-t border-slate-800 pt-2">
                <span>Total Balance Due:</span>
                <span className="text-emerald-400">
                  ${(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono">
                Status: <strong className="text-white">{selectedInvoice.status}</strong>
              </div>

              <div className="flex items-center space-x-2">
                {selectedInvoice.status !== 'Claim Submitted' && selectedInvoice.status !== 'Paid' && (
                  <button
                    onClick={() => submitInsuranceClaim(selectedInvoice.id)}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Submit EDI 837 Electronic Claim</span>
                  </button>
                )}

                {selectedInvoice.status !== 'Paid' && (
                  <button
                    onClick={() => recordInvoicePayment(selectedInvoice.id, 'Credit Card')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Patient Co-Pay</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 flex items-center justify-center p-12 text-slate-500 text-xs">
            Select an invoice to review itemized clinical billing.
          </div>
        )}
      </div>

      {/* Modal: New Charge Capture */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewInvoice}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Capture Clinical Charges & Create Invoice</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Patient</label>
              <select
                required
                value={invoicePatientId}
                onChange={e => setInvoicePatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn}) — {p.insurance.provider}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400">
              Generates standardized clinical charges including ED facility fees, attending physician consultation, and pathology diagnostic panels.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!invoicePatientId}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Generate Invoice & Codes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
