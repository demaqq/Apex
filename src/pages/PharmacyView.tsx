import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { Activity, AlertTriangle, Check, ChevronRight, Download, Filter, Loader, PackageSearch, Pill, Plus, Search, ShieldCheck, Truck, UsersRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import { useFormulary, usePrescriptions } from '../data'
import { Avatar, Button, Badge, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { downloadCsv, formatTime } from '../lib/format'
import type { FormularyItem, Prescription } from '../types'

export default function PharmacyView() {
  const { state, notify } = useHospital()
  const formulary = useFormulary()
  const prescriptions = usePrescriptions()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [view, setView] = useState<'formulary' | 'prescriptions' | 'dispensing'>('formulary')
  const [showNewPrescription, setShowNewPrescription] = useState(false)
  const [selectedItem, setSelectedItem] = useState<FormularyItem | null>(null)

  const categories = useMemo(() => [...new Set(formulary.map((item) => item.category))], [formulary])
  const filteredFormulary = formulary.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (query && !`${item.name} ${item.genericName} ${item.category}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const pendingPrescriptions = prescriptions.filter((rx) => rx.status === 'Pending')
  const dispensingPrescriptions = prescriptions.filter((rx) => rx.status === 'Dispensed')

  const exportFormulary = () => downloadCsv('northstar-formulary.csv', [
    ['ID', 'Medication', 'Generic', 'Category', 'Form', 'Strength', 'Stock', 'Reorder', 'Price', 'Route', 'Controlled'],
    ...formulary.map((item) => [item.id, item.name, item.genericName, item.category, item.dosageForm, item.strength, item.stock, item.reorderLevel, item.pricePerUnit, item.route ?? 'PO', item.controlledSubstance ? 'Yes' : 'No'])
  ])

  const exportPrescriptions = () => downloadCsv('northstar-prescriptions.csv', [
    ['Rx #', 'Patient', 'MRN', 'Medication', 'Dosage', 'Frequency', 'Duration', 'Priority', 'Status', 'Doctor', 'Department'],
    ...prescriptions.map((rx) => [rx.rxNumber, rx.patientName, rx.mrn, rx.items.map((i) => i.medicationName).join('; '), rx.items.map((i) => i.dosage).join('; '), rx.items.map((i) => i.frequency).join('; '), rx.items.map((i) => i.duration).join('; '), rx.priority ?? 'Routine', rx.status, rx.doctorName ?? rx.prescribedBy ?? '', rx.department ?? ''])
  ])

  return (
    <motion.div className="pharmacy-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="PHARMACY OPERATIONS · CLINICAL VERIFICATION"
        title="Pharmacy Management"
        description="Formulary, prescriptions, dispensing and clinical verification across the hospital."
        actions={
          <Fragment>
            <Button variant="secondary" icon={Download} onClick={view === 'formulary' ? exportFormulary : exportPrescriptions}>
              Export {view === 'formulary' ? 'formulary' : 'prescriptions'}
            </Button>
            <Button icon={Plus} onClick={() => { setView('prescriptions'); setShowNewPrescription(true) }}>
              New prescription
            </Button>
          </Fragment>
        }
      />
      <div className="pharmacy-tabs" role="tablist">
        {(['formulary', 'prescriptions', 'dispensing'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {view === 'formulary' && (
        <Panel className="formulary-panel">
          <div className="formulary-toolbar">
            <label className="formulary-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search medication…"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </label>
            <label>
              <Filter size={15} />
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="formulary-table-wrap">
            <table className="formulary-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Generic</th>
                  <th>Category</th>
                  <th>Form / Strength</th>
                  <th>Stock</th>
                  <th>Reorder</th>
                  <th>Price</th>
                  <th>Route</th>
                  <th>Controlled</th>
                </tr>
              </thead>
              <tbody>
                {filteredFormulary.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.name}</b></td>
                    <td>{item.genericName}</td>
                    <td><Badge variant="neutral">{item.category}</Badge></td>
                    <td>{item.dosageForm} / {item.strength}</td>
                    <td>
                      <Badge
                        variant={
                          item.stock <= item.reorderLevel
                            ? 'danger'
                            : item.stock <= item.reorderLevel * 2
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {item.stock} {item.unit}
                      </Badge>
                    </td>
                    <td>{item.reorderLevel} {item.unit}</td>
                    <td>${item.pricePerUnit.toFixed(2)} / {item.unit}</td>
                    <td>{item.route ?? 'PO'}</td>
                    <td>{item.controlledSubstance ? <ShieldCheck size={14} /> : <span className="muted">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredFormulary.length === 0 && (
            <EmptyState icon={Pill} title="No medications match" text="Try another search term or clear the category filter." />
          )}
        </Panel>
      )}

      {view === 'prescriptions' && (
        <Panel className="prescriptions-panel">
          <div className="prescriptions-toolbar">
            <label className="prescriptions-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search prescriptions…"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
          <div className="prescription-list">
            {prescriptions.map((rx) => (
              <article key={rx.id} className={`prescription-card ${rx.priority === 'STAT' ? 'stat' : ''}`}>
                <div className="prescription-header">
                  <div>
                    <b>{rx.rxNumber}</b>
                    <StatusBadge status={rx.status.toLowerCase()} />
                  </div>
                  <div className="rx-priority">{rx.priority ?? 'Routine'}</div>
                </div>
                <div className="prescription-body">
                  <div className="rx-patient">
                    <Avatar name={rx.patientName} size="sm" />
                    <span>
                      <b>{rx.patientName}</b>
                      <small>{rx.mrn}</small>
                    </span>
                  </div>
                  <p className="rx-doctor">{rx.doctorName ?? rx.prescribedBy ?? ''} · {rx.department ?? ''}</p>
                  <div className="rx-items">
                    {rx.items.map((item, i) => (
                      <span key={i} className="rx-item">
                        {item.medicationName} {item.dosage} {item.frequency} {item.duration}
                      </span>
                    ))}
                  </div>
                  <div className="rx-actions">
                    {rx.status === 'Pending' && (
                      <Button size="sm" onClick={() => notify(`${rx.rxNumber} marked as dispensed`, 'success')}>
                        Dispense
                        <Check size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {prescriptions.length === 0 && (
              <EmptyState icon={PackageSearch} title="No prescriptions" text="Prescriptions will appear here when clinicians place orders." />
            )}
          </div>
        </Panel>
      )}

      {view === 'dispensing' && (
        <Panel className="dispensing-panel" title="Dispensing workflow" action={<span className="panel-count">{pendingPrescriptions.length} PENDING</span>}>
          <div className="panel-subhead">Prescriptions awaiting dispensing or verification.<span>Live</span></div>
          <div className="dispensing-grid">
            {pendingPrescriptions.map((rx) => (
              <article key={rx.id} className="dispensing-card">
                <div className="dispensing-header">
                  <b>{rx.rxNumber}</b>
                  <span className="rx-priority">{rx.priority ?? 'Routine'}</span>
                </div>
                <div>
                  <Avatar name={rx.patientName} size="sm" />
                  <span>
                    <b>{rx.patientName}</b>
                    <small>{rx.mrn}</small>
                  </span>
                </div>
                <div className="dispensing-items">
                  {rx.items.map((item, i) => (
                    <span key={i} className="rx-item">
                      {item.medicationName} {item.dosage} {item.frequency}
                    </span>
                  ))}
                </div>
                <div className="dispensing-actions">
                  <Button size="sm" variant="secondary" onClick={() => notify(`${rx.rxNumber} verified`, 'info')}>
                    Verify
                  </Button>
                  <Button size="sm" onClick={() => notify(`${rx.rxNumber} dispensed`, 'success')}>
                    Dispense
                    <Check size={14} />
                  </Button>
                </div>
              </article>
            ))}
            {pendingPrescriptions.length === 0 && (
              <EmptyState icon={Truck} title="No pending prescriptions" text="All prescriptions have been processed." />
            )}
          </div>
        </Panel>
      )}

      {showNewPrescription && (
        <Modal open={showNewPrescription} onClose={() => setShowNewPrescription(false)} title="New Prescription" subtitle="Create and route a new medication order" size="lg">
          <div className="new-rx-form">
            <div className="form-row">
              <label>Patient <input placeholder="Search patient…" /></label>
              <label>Medication <input placeholder="Search formulary…" /></label>
            </div>
            <div className="form-row">
              <label>Dosage <input placeholder="e.g., 500mg" /></label>
              <label>Frequency <input placeholder="e.g., Q8H" /></label>
            </div>
            <div className="form-row">
              <label>Duration <input placeholder="e.g., 7 days" /></label>
              <label>Priority <select><option>Routine</option><option>Urgent</option><option>STAT</option></select></label>
            </div>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowNewPrescription(false)}>Cancel</Button>
              <Button onClick={() => { notify('Prescription created', 'success'); setShowNewPrescription(false) }}>Create prescription</Button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  )
}