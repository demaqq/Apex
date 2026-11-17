import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  PackagePlus,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { FormularyItem, Prescription } from '../../types';

export const PharmacyView: React.FC = () => {
  const {
    formulary,
    prescriptions,
    dispensePrescription,
    updateFormularyStock,
    createPrescription,
    patients,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'prescriptions' | 'formulary' | 'interaction'>('prescriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Manual Rx Modal
  const [showNewRxModal, setShowNewRxModal] = useState(false);
  const [rxPatientId, setRxPatientId] = useState('');
  const [rxMedId, setRxMedId] = useState('');
  const [rxDosage, setRxDosage] = useState('500 mg');
  const [rxFrequency, setRxFrequency] = useState('TID (Three times daily)');
  const [rxDuration, setRxDuration] = useState('7 days');
  const [rxInstructions, setRxInstructions] = useState('Take with food');

  // Drug Interaction Simulator
  const [drug1, setDrug1] = useState<string>('Warfarin 5mg');
  const [drug2, setDrug2] = useState<string>('Aspirin 81mg');

  const pendingPrescriptions = prescriptions.filter(p => p.status === 'Pending');
  const dispensedPrescriptions = prescriptions.filter(p => p.status === 'Dispensed');

  const filteredFormulary = formulary.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(formulary.map(f => f.category)))];

  const handleCreatePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === rxPatientId);
    const med = formulary.find(m => m.id === rxMedId);
    if (!patient || !med) return;

    createPrescription({
      patientId: patient.id,
      patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
      patientMrn: patient.mrn,
      prescribedBy: 'Dr. Gregory House, MD',
      items: [
        {
          medicationId: med.id,
          medicationName: med.name,
          dosage: rxDosage,
          route: med.route,
          frequency: rxFrequency,
          duration: rxDuration,
          instructions: rxInstructions,
        },
      ],
      diagnosis: 'Clinical Indication Under Physician Care',
    });

    setShowNewRxModal(false);
    setRxPatientId('');
    setRxMedId('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 uppercase tracking-widest font-semibold">
            <Pill className="w-4 h-4" />
            <span>Central Pharmacy & Computerized Provider Order Entry (CPOE)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Pharmacy Dispensing & Formulary OS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Electronic prescriptions, barcode-ready verification, automated inventory deductions, and drug interaction engine.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowNewRxModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-amber-950/40 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New E-Prescription</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'prescriptions'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Dispensing Queue</span>
            <span className="px-1.5 py-0.2 bg-amber-950 border border-amber-800 rounded font-mono text-[10px] text-amber-300">
              {pendingPrescriptions.length} Pending
            </span>
          </button>

          <button
            onClick={() => setActiveTab('formulary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'formulary'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Hospital Formulary Catalog</span>
            <span className="text-[10px] font-mono text-slate-400">({formulary.length} Items)</span>
          </button>

          <button
            onClick={() => setActiveTab('interaction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'interaction'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Drug-Drug Interaction Checker</span>
          </button>
        </div>
      </div>

      {/* Tab 1: E-Prescription Dispensing Queue */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Pending Physician Orders Awaiting Dispensation</h2>
            <span className="text-xs text-slate-400 font-mono">
              Live CPOE Sync with Clinical Evaluation Modals
            </span>
          </div>

          {pendingPrescriptions.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-medium text-emerald-300">All Prescriptions Dispensed!</p>
              <p className="text-[11px] text-slate-500">No pending orders in the pharmacy queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPrescriptions.map(rx => (
                <div
                  key={rx.id}
                  className="bg-slate-900 border border-amber-900/60 rounded-xl p-5 space-y-4 shadow-lg shadow-amber-950/20"
                >
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-xs font-mono text-amber-400 font-semibold">{rx.rxNumber}</div>
                      <h3 className="text-sm font-bold text-white mt-0.5">{rx.patientName}</h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        MRN: {rx.patientMrn} • Prescriber: {rx.prescribedBy}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 font-bold uppercase">
                      Pending Dispense
                    </span>
                  </div>

                  {/* Prescription Items */}
                  <div className="space-y-2">
                    {rx.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center space-x-2">
                            <span>{item.medicationName}</span>
                            <span className="text-[10px] font-mono text-cyan-400">({item.dosage})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Route: {item.route} • Freq: {item.frequency} • {item.duration}
                          </div>
                          {item.instructions && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">"{item.instructions}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dispense Action */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                    <span className="text-[11px] text-slate-500 font-mono">Ordered: {rx.date}</span>
                    <button
                      onClick={() => dispensePrescription(rx.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-md shadow-emerald-950/30 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Dispense</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently Dispensed Section */}
          {dispensedPrescriptions.length > 0 && (
            <div className="mt-8 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Recently Dispensed Prescriptions (Audit Verified)
              </h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/80">
                {dispensedPrescriptions.map(rx => (
                  <div key={rx.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-white">
                          {rx.patientName} — {rx.items.map(i => i.medicationName).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {rx.rxNumber} • MRN: {rx.patientMrn} • Prescribed by {rx.prescribedBy}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Dispensed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Hospital Formulary Catalog */}
      {activeTab === 'formulary' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medication name, generic..."
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
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredFormulary.length} of {formulary.length} formulary drugs
            </span>
          </div>

          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Drug Name & Generic</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Strength & Route</th>
                  <th className="p-3">Stock On-Hand</th>
                  <th className="p-3">Controlled</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredFormulary.map(item => {
                  const currentStock = item.stock ?? item.stockLevel;
                  const isLow = currentStock <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.genericName}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.strength} • {item.route || item.dosageForm}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold ${
                            isLow ? 'text-rose-400 font-mono animate-pulse' : 'text-emerald-400'
                          }`}
                        >
                          {currentStock} {item.unit}
                        </span>
                        {isLow && (
                          <span className="ml-2 text-[10px] text-rose-400 font-sans font-semibold">
                            (LOW STOCK)
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.controlledSubstance ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            SCHEDULE II
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => updateFormularyStock(item.id, 50)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                        >
                          <PackagePlus className="w-3 h-3" />
                          <span>+50 Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Drug Interaction & Safety Checker */}
      {activeTab === 'interaction' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Drug-Drug Interaction & Contraindication Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select two clinical compounds to run the pharmacology interaction algorithm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono uppercase font-semibold">Drug A</label>
              <select
                value={drug1}
                onChange={e => setDrug1(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="Warfarin 5mg">Warfarin Sodium 5mg (Anticoagulant)</option>
                <option value="Aspirin 81mg">Aspirin 81mg (Antiplatelet)</option>
                <option value="Lisinopril 10mg">Lisinopril 10mg (ACE Inhibitor)</option>
                <option value="Potassium Chloride 20mEq">Potassium Chloride (Electrolyte)</option>
                <option value="Metformin 500mg">Metformin HCl 500mg (Biguanide)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-mono uppercase font-semibold">Drug B</label>
              <select
                value={drug2}
                onChange={e => setDrug2(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="Aspirin 81mg">Aspirin 81mg (Antiplatelet)</option>
                <option value="Warfarin 5mg">Warfarin Sodium 5mg (Anticoagulant)</option>
                <option value="Potassium Chloride 20mEq">Potassium Chloride (Electrolyte)</option>
                <option value="Lisinopril 10mg">Lisinopril 10mg (ACE Inhibitor)</option>
                <option value="Contrast Dye (Iodinated)">Contrast Media (Radiology)</option>
              </select>
            </div>
          </div>

          {/* Interaction Analysis Result Box */}
          <div className="p-5 bg-rose-950/40 border border-rose-800 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs uppercase tracking-wider font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Major Clinical Interaction Detected — High Risk Level 3</span>
            </div>
            <p className="text-xs text-rose-100 leading-relaxed">
              Concurrent administration of <strong>{drug1}</strong> and <strong>{drug2}</strong> significantly increases the risk of severe gastrointestinal or systemic hemorrhage due to additive antiplatelet and anticoagulant synergistic activity.
            </p>
            <div className="text-[11px] text-rose-300 font-mono border-t border-rose-900/60 pt-2 flex items-center justify-between">
              <span>Recommendation: Monitor INR / Prothrombin time closely or substitute with safe alternatives.</span>
              <span className="font-bold">EHR Alert Code: INTERACT-RX-409</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New E-Prescription */}
      {showNewRxModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePrescription}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Pill className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Create New Electronic Prescription (CPOE)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewRxModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Patient</label>
              <select
                required
                value={rxPatientId}
                onChange={e => setRxPatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn}) — {p.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Medication from Formulary</label>
              <select
                required
                value={rxMedId}
                onChange={e => setRxMedId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Choose Formulary Item --</option>
                {formulary.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.genericName}) — Stock: {m.stock ?? m.stockLevel} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Dosage</label>
                <input
                  type="text"
                  value={rxDosage}
                  onChange={e => setRxDosage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Frequency</label>
                <input
                  type="text"
                  value={rxFrequency}
                  onChange={e => setRxFrequency(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Special Instructions</label>
              <input
                type="text"
                value={rxInstructions}
                onChange={e => setRxInstructions(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewRxModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!rxPatientId || !rxMedId}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Sign & Transmit E-Prescription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
