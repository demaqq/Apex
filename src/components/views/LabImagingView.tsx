import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Microscope,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Stethoscope,
  X,
  Zap,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { ImagingOrder, LabOrder, LabResultItem } from '../../types';

export const LabImagingView: React.FC = () => {
  const {
    labOrders,
    recordLabResults,
    imagingOrders,
    uploadImagingResult,
    updateImagingStatus,
    patients,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'laboratory' | 'radiology'>('laboratory');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // PACS Selected Scan viewer
  const [selectedScan, setSelectedScan] = useState<ImagingOrder | null>(
    imagingOrders.find(i => (i.images && i.images.length > 0) || (i.scans && i.scans.length > 0)) || imagingOrders[0] || null
  );

  // PACS Viewer Controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Record Lab Result Modal
  const [editingLabOrder, setEditingLabOrder] = useState<LabOrder | null>(null);
  const [testResultNotes, setTestResultNotes] = useState('');

  const filteredLabOrders = labOrders.filter(order => {
    const pMrn = order.patientMrn || order.mrn || '';
    const matchesSearch =
      order.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pMrn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredImagingOrders = imagingOrders.filter(order => {
    const matchesSearch =
      order.modality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.bodyPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.patientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveLabResult = (orderId: string) => {
    if (!editingLabOrder) return;
    recordLabResults(
      orderId,
      editingLabOrder.results || [],
      testResultNotes || 'All test parameters verified and reviewed by clinical pathologist.',
      'Dr. Robert Chase, Clinical Pathologist'
    );
    setEditingLabOrder(null);
    setTestResultNotes('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 uppercase tracking-widest font-semibold">
            <Microscope className="w-4 h-4" />
            <span>Diagnostics, Laboratory (LIS) & Radiology PACS OS</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Pathology Laboratory & Digital Imaging Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Specimen tracking, panic-value abnormal flags, LIS analyzer feeds, and cloud PACS DICOM diagnostic workstation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('laboratory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'laboratory'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Diagnostic Lab ({labOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('radiology')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-colors ${
              activeTab === 'radiology'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Radiology & PACS ({imagingOrders.length})</span>
          </button>
        </div>
      </div>

      {/* View 1: Diagnostic Laboratory (LIS) */}
      {activeTab === 'laboratory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Test, Patient, MRN..."
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
                <option value="Ordered">Ordered</option>
                <option value="Collected">Collected</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                {labOrders.filter(l => l.priority === 'STAT').length} STAT Orders
              </span>
            </div>
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLabOrders.map(order => {
              const isStat = order.priority === 'STAT';
              const isCompleted = order.status === 'Completed';
              return (
                <div
                  key={order.id}
                  className={`p-5 rounded-xl border space-y-4 ${
                    isStat
                      ? 'bg-slate-900/90 border-rose-800/80 shadow-lg shadow-rose-950/20'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-purple-400 font-semibold">
                          {order.orderNumber}
                        </span>
                        {isStat && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-700 font-bold animate-pulse">
                            STAT PRIORITY
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">{order.testName}</h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Patient: <strong>{order.patientName}</strong> ({order.patientMrn || order.mrn})
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Category: {order.category}</span>
                      <span>Specimen: {order.specimenType}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Ordered by: {order.orderedBy || order.doctorName}</span>
                      <span>{order.orderDate}</span>
                    </div>
                  </div>

                  {/* Results preview if completed */}
                  {order.results && order.results.length > 0 && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold border-b border-slate-800/80 pb-1">
                        Analyzed Parameters & Panic Alerts
                      </div>
                      <div className="space-y-1 text-xs">
                        {order.results.map((res, i) => (
                          <div key={i} className="flex items-center justify-between font-mono">
                            <span className="text-slate-300">{res.parameter}:</span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`font-bold ${
                                  res.flag.toLowerCase() === 'critical'
                                    ? 'text-rose-400 animate-pulse'
                                    : res.flag.toLowerCase() === 'high' || res.flag.toLowerCase() === 'abnormal'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {res.value} {res.unit}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                (Ref: {res.referenceRange})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.reportNotes && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                          "{order.reportNotes}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Clinical Indication: Routine Profile
                    </span>
                    {!isCompleted ? (
                      <button
                        onClick={() => {
                          setEditingLabOrder(order);
                          setTestResultNotes(order.reportNotes || '');
                        }}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enter Results & Sign</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified by {order.signedBy || order.signedOffBy || 'Pathologist'}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Radiology & PACS Viewer */}
      {activeTab === 'radiology' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Imaging Orders List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Radiology Imaging Orders (PACS Worklist)</h2>
            <div className="space-y-2.5">
              {filteredImagingOrders.map(order => {
                const isSelected = selectedScan?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedScan(order)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-400">
                        {order.modality} — {order.bodyPart}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          order.status === 'Report Available'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-1">{order.patientName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      MRN: {order.patientMrn || order.mrn} • {order.requestedAt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: PACS DICOM Workstation Viewer (8 cols) */}
          {selectedScan ? (
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    <span>{selectedScan.modality}: {selectedScan.bodyPart} Workstation</span>
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Patient: {selectedScan.patientName} ({selectedScan.patientMrn || selectedScan.mrn}) • Urgency: {selectedScan.urgency || selectedScan.priority}
                  </div>
                </div>

                {/* DICOM Toolbar Controls */}
                <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setInvert(!invert)}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      invert ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Invert
                  </button>
                  <button
                    onClick={() => setZoom(prev => Math.min(2.5, prev + 0.25))}
                    className="px-2 py-1 rounded text-slate-400 hover:text-white cursor-pointer"
                  >
                    Zoom +
                  </button>
                  <button
                    onClick={() => {
                      setBrightness(100);
                      setContrast(100);
                      setInvert(false);
                      setZoom(1);
                    }}
                    className="px-2 py-1 rounded text-slate-400 hover:text-white cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* PACS Viewport Canvas Mock */}
              <div className="relative w-full h-80 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center select-none">
                {/* Simulated DICOM Overlay Metadata */}
                <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400/90 space-y-0.5 z-10 pointer-events-none">
                  <div>STUDY: {selectedScan.orderNumber}</div>
                  <div>MODALITY: {selectedScan.modality}</div>
                  <div>PATIENT: {selectedScan.patientName}</div>
                  <div>MRN: {selectedScan.patientMrn || selectedScan.mrn}</div>
                </div>

                <div className="absolute top-3 right-3 text-[10px] font-mono text-emerald-400/90 text-right space-y-0.5 z-10 pointer-events-none">
                  <div>ZOOM: {Math.round(zoom * 100)}%</div>
                  <div>WINDOW: L:40 W:400</div>
                  <div>SLICE: 14/48 AP</div>
                </div>

                {/* Medical Scan Visual Graphic */}
                <div
                  className="transition-transform duration-100 flex items-center justify-center"
                  style={{
                    transform: `scale(${zoom})`,
                    filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                      invert ? 'invert(100%)' : ''
                    }`,
                  }}
                >
                  <div className="relative w-64 h-64 border-2 border-slate-700/60 rounded-full flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-inner">
                    {/* Simulated anatomical scan silhouette */}
                    <div className="w-48 h-48 rounded-full border border-slate-600/40 flex items-center justify-center opacity-80">
                      <div className="w-36 h-36 border border-cyan-500/20 rounded-full flex items-center justify-center">
                        <Activity className="w-20 h-20 text-cyan-400/40" />
                      </div>
                    </div>
                    <span className="absolute bottom-4 font-mono text-[9px] text-slate-500">
                      ApexPACS DICOM Engine v4.2
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 text-[10px] font-mono text-slate-400 z-10">
                  ApexHealth Digital PACS Server • Certified Diagnostic Quality
                </div>
              </div>

              {/* Radiologist Formal Diagnostic Impression */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Radiology Impression & Diagnostic Narrative
                  </span>
                  <span className="text-[11px] font-mono text-purple-400">
                    Attending: {selectedScan.technicianName || 'Dr. Allison Cameron, Radiologist'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>Findings:</strong> {selectedScan.reportText || 'Scan acquired with intravenous non-ionic contrast. No evidence of acute pulmonary embolism, intracranial hemorrhage, or large vessel occlusion.'}
                </p>
                <div className="p-2.5 bg-purple-950/30 border border-purple-800/60 rounded-lg text-xs text-purple-200">
                  <strong>Impression:</strong> {selectedScan.impression || 'Study unremarkable for acute emergent pathology. Correlate clinically.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl p-12 text-slate-500 text-xs">
              Select an imaging scan from the PACS worklist on the left.
            </div>
          )}
        </div>
      )}

      {/* Modal: Record Lab Results */}
      {editingLabOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FlaskConical className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Sign & Verify: {editingLabOrder.testName}</h3>
              </div>
              <button
                onClick={() => setEditingLabOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Patient: <strong>{editingLabOrder.patientName}</strong> ({editingLabOrder.patientMrn || editingLabOrder.mrn})
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">
                Clinical Pathologist Notes & Interpretation
              </label>
              <textarea
                rows={3}
                value={testResultNotes}
                onChange={e => setTestResultNotes(e.target.value)}
                placeholder="Enter analyzer telemetry verification or panic-value notification records..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingLabOrder(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveLabResult(editingLabOrder.id)}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Sign & Finalize Laboratory Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
