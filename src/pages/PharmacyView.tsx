import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BadgeCheck, Ban, CalendarX2, ClipboardList, Download, PackageCheck, PackageMinus, PackagePlus, Pencil, Pill, Plus, ShieldCheck } from 'lucide-react'
import { Badge, Button, Chip, EmptyState, FilterSelect, Metric, Modal, PageHeader, Panel, PersonCell, SearchField, StatusBadge, Tabs } from '../components/ui'
import { departmentById } from '../data'
import { downloadCsv, formatCurrency, formatDate, formatDateTime, relativeTime, today } from '../lib/format'
import { interactionBetween } from '../lib/clinical'
import { matches, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { FormularyItem, Prescription } from '../types'
import { CollectionDesk, CollectModal, EPrescribeModal } from '../components/EPrescription'
import { IN_HOUSE, pharmacyName } from '../lib/telehealth'

type View = 'queue' | 'collection' | 'prescriptions' | 'formulary' | 'inventory' | 'interactions'

/** 'expired', 'soon' (within 90 days) or 'ok'. */
const expiryState = (expiry?: string) => {
  if (!expiry) return 'ok'
  const days = (new Date(expiry).getTime() - Date.now()) / 86_400_000
  return days < 0 ? 'expired' : days <= 90 ? 'soon' : 'ok'
}

const stockTone = (item: FormularyItem) => item.stock <= item.reorderLevel ? 'danger' : item.stock <= item.reorderLevel * 1.5 ? 'warning' : 'success'

export default function PharmacyView() {
  const { state, can, restock, setPrescriptionStatus, setSelectedPatientId } = useHospital()
  const canDispense = can('dispense') || can('manage')
  const canPrescribe = can('prescribe') || can('manage')
  const canStock = can('stock-receive') || can('stock-adjust') || can('formulary-edit')
  const patients = usePatients()
  const [view, setView] = useState<View>('queue')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [collecting, setCollecting] = useState<string | null>(null)

  const medication = useMemo(() => new Map(state.formulary.map((item) => [item.id, item])), [state.formulary])
  const queue = state.prescriptions.filter((rx) => rx.status === 'Pending' || rx.status === 'Verified')
    .sort((a, b) => ({ STAT: 0, Urgent: 1, Routine: 2 }[a.priority] - { STAT: 0, Urgent: 1, Routine: 2 }[b.priority]) || a.createdAt.localeCompare(b.createdAt))
  const lowStock = state.formulary.filter((item) => item.stock <= item.reorderLevel)
  const categories = [...new Set(state.formulary.map((item) => item.category))].sort()

  const rxLabel = (rx: Prescription) => rx.items.map((item) => `${medication.get(item.medicationId)?.name ?? 'Unknown'} ${item.dosage}`).join(' · ')
  const prescriptions = state.prescriptions.filter((rx) => {
    const patient = patients.get(rx.patientId)
    return (filter === 'all' || rx.status === filter) && matches(query, rx.id, patient?.name, patient?.mrn, rx.prescriber, rx.diagnosis, rxLabel(rx))
  })
  const formulary = state.formulary.filter((item) => (filter === 'all' || item.category === filter) && matches(query, item.name, item.genericName, item.category))

  const changeView = (next: View) => { setView(next); setQuery(''); setFilter('all') }

  const exportCurrent = () => view === 'formulary'
    ? downloadCsv(`formulary-${today()}.csv`, [['ID', 'Medication', 'Generic', 'Category', 'Form', 'Strength', 'Stock', 'Unit', 'Reorder level', 'Unit price', 'Route', 'Controlled'], ...state.formulary.map((item) => [item.id, item.name, item.genericName, item.category, item.dosageForm, item.strength, item.stock, item.unit, item.reorderLevel, item.pricePerUnit, item.route, item.controlled ? 'Yes' : 'No'])])
    : downloadCsv(`prescriptions-${today()}.csv`, [['Rx', 'Patient', 'MRN', 'Medicines', 'Priority', 'Status', 'Prescriber', 'Department', 'Created'], ...state.prescriptions.map((rx) => [rx.id, patients.get(rx.patientId)?.name, patients.get(rx.patientId)?.mrn, rxLabel(rx), rx.priority, rx.status, rx.prescriber, departmentById(state.departments, rx.department).name, rx.createdAt])])

  const actionsFor = (rx: Prescription) => <>
    {canDispense && rx.status === 'Pending' && <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => setPrescriptionStatus(rx.id, 'Verified')}>Verify</Button>}
    {canDispense && rx.status === 'Verified' && !rx.eRx && <Button size="sm" icon={PackageCheck} onClick={() => setPrescriptionStatus(rx.id, 'Dispensed')}>Dispense</Button>}
    {canDispense && rx.status === 'Verified' && rx.eRx && <Button size="sm" icon={PackageCheck} onClick={() => setPrescriptionStatus(rx.id, 'Ready for collection')}>Mark ready</Button>}
    {canDispense && (rx.status === 'Ready for collection' || rx.status === 'Part collected') && <Button size="sm" icon={PackageCheck} onClick={() => setCollecting(rx.id)}>Hand over</Button>}
    {!canDispense && ['Pending', 'Verified'].includes(rx.status) && <span className="muted-text">With pharmacy</span>}
    {canDispense && ['Pending', 'Verified', 'Ready for collection'].includes(rx.status) && <Button size="sm" variant="ghost" icon={Ban} onClick={() => setPrescriptionStatus(rx.id, 'Cancelled')} aria-label={`Cancel ${rx.id}`}>Cancel</Button>}
  </>

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Pharmacy · Clinical verification"
        title="Pharmacy"
        description="Verify and dispense prescriptions, hand over e-prescriptions to patients, and keep an eye on formulary stock."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportCurrent}>Export {view === 'formulary' ? 'formulary' : 'prescriptions'}</Button>
          {canPrescribe && <Button icon={Plus} onClick={() => setCreating(true)}>New prescription</Button>}
        </>}
      />

      <div className="metrics-grid">
        <Metric label="Awaiting verification" value={queue.filter((rx) => rx.status === 'Pending').length} detail={`${queue.filter((rx) => rx.priority === 'STAT').length} STAT in queue`} icon={ClipboardList} tone="amber" />
        <Metric label="Ready to dispense" value={queue.filter((rx) => rx.status === 'Verified').length} detail="Verified by a pharmacist" icon={BadgeCheck} tone="blue" />
        <Metric label="Dispensed" value={state.prescriptions.filter((rx) => rx.status === 'Dispensed').length} detail="Released to wards and patients" icon={PackageCheck} tone="teal" />
        <Metric label="Below reorder level" value={lowStock.length} detail={lowStock.length ? lowStock.map((item) => item.name).join(', ') : 'All lines stocked'} icon={AlertTriangle} tone="coral" />
      </div>

      <Tabs<View> label="Pharmacy views" value={view} onChange={changeView} options={[{ value: 'queue', label: 'Work queue', count: queue.length }, ...(canDispense ? [{ value: 'collection' as View, label: 'e-Prescription pickup', count: state.prescriptions.filter((rx) => rx.eRx && (rx.status === 'Ready for collection' || rx.status === 'Part collected')).length || undefined }] : []), { value: 'prescriptions', label: 'All prescriptions' }, { value: 'formulary', label: 'Formulary' }, ...(canDispense || canStock ? [{ value: 'inventory' as View, label: 'Inventory', count: state.formulary.filter((item) => item.stock <= item.reorderLevel || expiryState(item.expiry) !== 'ok').length || undefined }] : []), { value: 'interactions', label: 'Interaction checker' }]} />

      {view === 'queue' && (
        <div className="card-grid">
          {queue.map((rx) => {
            const patient = patients.get(rx.patientId)
            return (
              <article key={rx.id} className={`work-card priority-${rx.priority.toLowerCase()}`}>
                <header><b>{rx.id}</b><span className={`rx-priority rx-${rx.priority.toLowerCase()}`}>{rx.priority}</span>{rx.eRx && <span className="erx-tag">{rx.eRx.pharmacy && rx.eRx.pharmacy !== IN_HOUSE ? `e-Rx · sent to ${pharmacyName(rx.eRx.pharmacy, state)}` : 'e-Rx · patient collects'}</span>}<StatusBadge status={rx.status} /></header>
                {patient && <PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.location}`} onClick={() => setSelectedPatientId(patient.id)} />}
                {!can('controlled-drugs') && rx.items.some((item) => medication.get(item.medicationId)?.controlled) && <p className="allergy-flag"><ShieldCheck size={13} />Controlled medicine — release needs controlled-drugs authority</p>}
                {patient && patient.allergies[0] !== 'No known allergies' && <p className="allergy-flag"><AlertTriangle size={13} />Allergies: {patient.allergies.join(', ')}</p>}
                <ul className="rx-lines">
                  {rx.items.map((item, index) => {
                    const med = medication.get(item.medicationId)
                    return <li key={index}><b>{med?.name} {item.dosage}</b><span>{item.frequency} · {item.duration} · qty {item.quantity}</span>{med && med.stock < item.quantity && <em>Insufficient stock</em>}</li>
                  })}
                </ul>
                <footer><small>{rx.prescriber} · {relativeTime(rx.createdAt)}</small><div>{actionsFor(rx)}</div></footer>
              </article>
            )
          })}
          {queue.length === 0 && <Panel><EmptyState icon={PackageCheck} title="Queue clear" text="Every prescription has been verified and dispensed." /></Panel>}
        </div>
      )}

      {view === 'prescriptions' && (
        <Panel>
          <div className="table-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Search patient, Rx number or medicine…" />
            <FilterSelect label="All statuses" value={filter} onChange={setFilter} options={['Pending', 'Verified', 'Ready for collection', 'Part collected', 'Dispensed', 'Cancelled']} />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Rx</th><th>Patient</th><th>Medicines</th><th>Priority</th><th>Status</th><th>Prescriber</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const patient = patients.get(rx.patientId)
                  return (
                    <tr key={rx.id}>
                      <td><b>{rx.id}</b><small>{rx.eRx ? <span className="mono">{rx.eRx.code} · </span> : null}{relativeTime(rx.createdAt)}</small></td>
                      <td>{patient && <PersonCell name={patient.name} detail={patient.mrn} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                      <td className="wrap">{rxLabel(rx)}</td>
                      <td><span className={`rx-priority rx-${rx.priority.toLowerCase()}`}>{rx.priority}</span></td>
                      <td><StatusBadge status={rx.status} /></td>
                      <td>{rx.prescriber}<small>{departmentById(state.departments, rx.department).shortName}</small></td>
                      <td className="row-actions">{actionsFor(rx)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {prescriptions.length === 0 && <EmptyState icon={Pill} title="No prescriptions match" text="Try another search term or clear the status filter." />}
        </Panel>
      )}

      {view === 'formulary' && (
        <Panel>
          <div className="table-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Search medication…" />
            <FilterSelect label="All categories" value={filter} onChange={setFilter} options={categories} />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Medication</th><th>Category</th><th>Form / strength</th><th>Route</th><th className="num">Stock</th><th className="num">Reorder at</th><th className="num">Unit price</th>{canDispense && <th aria-label="Actions" />}</tr></thead>
              <tbody>
                {formulary.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.name}{item.controlled && <ShieldCheck size={13} className="controlled-icon" aria-label="Controlled drug" />}</b><small>{item.genericName}</small></td>
                    <td><Badge variant="neutral">{item.category}</Badge></td>
                    <td>{item.dosageForm} · {item.strength}</td>
                    <td>{item.route}</td>
                    <td className="num"><Badge variant={stockTone(item)}>{item.stock.toLocaleString()} {item.unit}</Badge></td>
                    <td className="num">{item.reorderLevel.toLocaleString()}</td>
                    <td className="num">{formatCurrency(item.pricePerUnit)}</td>
                    {canDispense && <td className="row-actions">{can('stock-receive') && <Button size="sm" variant="ghost" onClick={() => restock(item.id, 50)}>+50 restock</Button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {formulary.length === 0 && <EmptyState icon={Pill} title="No medications match" text="Try another search term or clear the category filter." />}
        </Panel>
      )}

      {view === 'collection' && canDispense && <CollectionDesk />}
      {view === 'inventory' && (canDispense || canStock) && <Inventory />}
      {view === 'interactions' && <InteractionChecker />}

      <EPrescribeModal open={creating} onClose={() => setCreating(false)} />
      {collecting && state.prescriptions.find((rx) => rx.id === collecting) && <CollectModal rx={state.prescriptions.find((rx) => rx.id === collecting)!} onClose={() => setCollecting(null)} />}
    </motion.div>
  )
}

function InteractionChecker() {
  const { state } = useHospital()
  const [a, setA] = useState(state.formulary.find((item) => item.generic === 'warfarin')?.id ?? state.formulary[0].id)
  const [b, setB] = useState(state.formulary.find((item) => item.generic === 'aspirin')?.id ?? state.formulary[1].id)
  const medA = state.formulary.find((item) => item.id === a)!
  const medB = state.formulary.find((item) => item.id === b)!
  const hit = medA.generic === medB.generic ? null : interactionBetween(medA.generic, medB.generic)
  return (
    <Panel>
      <div className="table-toolbar">
        <label className="form-field" style={{ flex: 1 }}><span>Medicine A</span><select value={a} onChange={(event) => setA(event.target.value)}>{state.formulary.map((item) => <option key={item.id} value={item.id}>{item.name} {item.strength}</option>)}</select></label>
        <label className="form-field" style={{ flex: 1 }}><span>Medicine B</span><select value={b} onChange={(event) => setB(event.target.value)}>{state.formulary.map((item) => <option key={item.id} value={item.id}>{item.name} {item.strength}</option>)}</select></label>
      </div>
      <div style={{ padding: 16 }}>
        {medA.generic === medB.generic
          ? <p className="rx-warnings"><span className="warning"><AlertTriangle size={14} />Same medicine selected twice — this would be duplicate therapy.</span></p>
          : hit
            ? <div className="rx-warnings"><p className={hit[2] === 'High' ? 'danger' : 'warning'}><AlertTriangle size={14} /><b>{hit[2]} interaction.</b> {hit[3]}</p></div>
            : <p className="rx-warnings"><span className="success"><ShieldCheck size={14} />No interaction recorded between {medA.name} and {medB.name} in this reference.</span></p>}
        <p className="record-hint">Contraindications — {medA.name}: {medA.contraindications.join('; ') || 'none listed'}. {medB.name}: {medB.contraindications.join('; ') || 'none listed'}.</p>
        <p className="record-hint">Decision support only. Check an up-to-date drug reference before acting.</p>
      </div>
    </Panel>
  )
}

function Inventory() {
  const { state, can, receiveStock, writeOffStock, saveFormularyItem } = useHospital()
  const [query, setQuery] = useState('')
  const [receiving, setReceiving] = useState<FormularyItem | null>(null)
  const [writingOff, setWritingOff] = useState<FormularyItem | null>(null)
  const [editing, setEditing] = useState<FormularyItem | null>(null)
  const meds = new Map(state.formulary.map((item) => [item.id, item]))
  const low = state.formulary.filter((item) => item.stock <= item.reorderLevel)
  const soon = state.formulary.filter((item) => expiryState(item.expiry) === 'soon')
  const expired = state.formulary.filter((item) => expiryState(item.expiry) === 'expired')
  const value = state.formulary.reduce((sum, item) => sum + item.stock * item.pricePerUnit, 0)
  const list = state.formulary.filter((item) => matches(query, item.name, item.genericName, item.category, item.batch, item.supplier))
    .sort((a, b) => Number(b.stock <= b.reorderLevel) - Number(a.stock <= a.reorderLevel) || a.name.localeCompare(b.name))
  const blank: FormularyItem = { id: '', name: '', genericName: '', generic: '', contraindications: [], category: 'Analgesic', dosageForm: 'Tablet', strength: '', stock: 0, unit: 'tablet', reorderLevel: 50, pricePerUnit: 0, route: 'PO' }

  return <>
    <div className="metrics-grid">
      <Metric label="Stock value" value={formatCurrency(value)} detail={`${state.formulary.length} medicines`} icon={Pill} tone="teal" />
      <Metric label="Below reorder level" value={low.length} detail={low.map((item) => item.name).join(', ') || 'All lines stocked'} icon={AlertTriangle} tone="coral" />
      <Metric label="Expiring in 90 days" value={soon.length} detail={soon.map((item) => item.name).join(', ') || 'Nothing due'} icon={CalendarX2} tone="amber" />
      <Metric label="Expired" value={expired.length} detail={expired.length ? 'Write off and quarantine' : 'None'} icon={PackageMinus} tone="blue" />
    </div>
    <Panel>
      <div className="table-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Search medicine, batch or supplier…" />
        {can('formulary-edit') && <Button icon={Plus} onClick={() => setEditing(blank)}>Add medicine</Button>}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Medicine</th><th className="num">In stock</th><th className="num">Reorder at</th><th>Batch · expiry</th><th>Supplier</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {list.map((item) => {
              const exp = expiryState(item.expiry)
              return (
                <tr key={item.id}>
                  <td><b>{item.name} {item.strength}</b><small>{item.dosageForm} · {item.category}{item.controlled ? ' · controlled' : ''}</small></td>
                  <td className="num"><Badge variant={stockTone(item)}>{item.stock.toLocaleString()} {item.unit}</Badge></td>
                  <td className="num">{item.reorderLevel.toLocaleString()}</td>
                  <td>{item.batch ? <span className="mono">{item.batch}</span> : <span className="muted-text">—</span>}{item.expiry && <small>{exp === 'expired' ? <Chip tone="danger">Expired {formatDate(item.expiry)}</Chip> : exp === 'soon' ? <Chip tone="warning">Expires {formatDate(item.expiry)}</Chip> : `Expires ${formatDate(item.expiry)}`}</small>}</td>
                  <td>{item.supplier ?? <span className="muted-text">—</span>}</td>
                  <td className="row-actions">
                    {can('stock-receive') && <Button size="sm" icon={PackagePlus} onClick={() => setReceiving(item)}>Receive</Button>}
                    {can('stock-adjust') && <Button size="sm" variant="ghost" icon={PackageMinus} onClick={() => setWritingOff(item)}>Write off</Button>}
                    {can('formulary-edit') && <button type="button" className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}><Pencil size={15} /></button>}
                    {!can('stock-receive') && !can('stock-adjust') && !can('formulary-edit') && <span className="muted-text">View only</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
    <Panel title="Stock movements">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>When</th><th>Medicine</th><th>Movement</th><th className="num">Quantity</th><th>Details</th><th>By</th></tr></thead>
          <tbody>{state.stockMovements.slice(0, 30).map((move) => <tr key={move.id}><td>{formatDateTime(move.at)}</td><td>{meds.get(move.medicationId)?.name ?? '—'}</td><td><Chip tone={move.type === 'Received' ? 'success' : move.type === 'Written off' ? 'danger' : 'neutral'}>{move.type}</Chip></td><td className={`num ${move.quantity < 0 ? 'danger-text' : ''}`}>{move.quantity > 0 ? '+' : ''}{move.quantity}</td><td className="wrap">{move.note}</td><td>{move.by}</td></tr>)}</tbody>
        </table>
      </div>
      {state.stockMovements.length === 0 && <p className="table-footnote">Receipts, dispensing and write-offs appear here.</p>}
    </Panel>
    {receiving && <ReceiveModal item={receiving} onClose={() => setReceiving(null)} onSave={(input) => { receiveStock(receiving.id, input); setReceiving(null) }} />}
    {writingOff && <WriteOffModal item={writingOff} onClose={() => setWritingOff(null)} onSave={(quantity, reason) => { writeOffStock(writingOff.id, quantity, reason); setWritingOff(null) }} />}
    {editing && <MedicineModal item={editing} onClose={() => setEditing(null)} onSave={(item) => { saveFormularyItem(item); setEditing(null) }} />}
  </>
}

function ReceiveModal({ item, onClose, onSave }: { item: FormularyItem; onClose: () => void; onSave: (input: { quantity: number; batch: string; expiry: string; supplier: string }) => void }) {
  const [quantity, setQuantity] = useState('')
  const [batch, setBatch] = useState('')
  const [expiry, setExpiry] = useState('')
  const [supplier, setSupplier] = useState(item.supplier ?? '')
  const pastExpiry = expiry && new Date(expiry).getTime() < Date.now()
  return (
    <Modal open onClose={onClose} title={`Receive ${item.name} ${item.strength}`} subtitle={`Currently ${item.stock} ${item.unit} in stock`} size="sm">
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Quantity ({item.unit}) <b>*</b></span><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label className="form-field"><span>Batch number</span><input value={batch} onChange={(event) => setBatch(event.target.value)} /></label>
        <label className="form-field"><span>Expiry date</span><input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></label>
        <label className="form-field"><span>Supplier</span><input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="e.g. EPSS" /></label>
      </div>
      {pastExpiry && <div className="inline-error" role="alert"><AlertTriangle size={16} />This batch has already expired.</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={PackagePlus} disabled={!(Number(quantity) > 0) || Boolean(pastExpiry)} onClick={() => onSave({ quantity: Math.floor(Number(quantity)), batch: batch.trim(), expiry, supplier: supplier.trim() })}>Add to stock</Button></div>
    </Modal>
  )
}

function WriteOffModal({ item, onClose, onSave }: { item: FormularyItem; onClose: () => void; onSave: (quantity: number, reason: string) => void }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState(expiryState(item.expiry) === 'expired' ? 'Expired' : 'Damaged')
  return (
    <Modal open onClose={onClose} title={`Write off ${item.name}`} subtitle={`${item.stock} ${item.unit} in stock`} size="sm">
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Quantity <b>*</b></span><input type="number" min={1} max={item.stock} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label className="form-field"><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}>{['Expired', 'Damaged', 'Recalled', 'Stock count correction', 'Lost'].map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" icon={PackageMinus} disabled={!(Number(quantity) > 0)} onClick={() => onSave(Math.floor(Number(quantity)), reason)}>Write off</Button></div>
    </Modal>
  )
}

function MedicineModal({ item, onClose, onSave }: { item: FormularyItem; onClose: () => void; onSave: (item: FormularyItem) => void }) {
  const [form, setForm] = useState(item)
  const [contra, setContra] = useState(item.contraindications.join(', '))
  const set = <K extends keyof FormularyItem>(key: K, value: FormularyItem[K]) => setForm({ ...form, [key]: value })
  const valid = form.name.trim() && form.strength.trim() && form.unit.trim()
  return (
    <Modal open onClose={onClose} title={item.id ? `Edit ${item.name}` : 'Add a medicine'} subtitle="Appears in prescribing, dispensing and the interaction checker" size="md">
      <div className="form-grid form-grid-3">
        <label className="form-field"><span>Brand or common name <b>*</b></span><input value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label className="form-field"><span>Generic name</span><input value={form.genericName} onChange={(event) => set('genericName', event.target.value)} /></label>
        <label className="form-field"><span>Category</span><input value={form.category} onChange={(event) => set('category', event.target.value)} /></label>
        <label className="form-field"><span>Form</span><input value={form.dosageForm} onChange={(event) => set('dosageForm', event.target.value)} /></label>
        <label className="form-field"><span>Strength <b>*</b></span><input value={form.strength} onChange={(event) => set('strength', event.target.value)} placeholder="500 mg" /></label>
        <label className="form-field"><span>Route</span><input value={form.route} onChange={(event) => set('route', event.target.value)} /></label>
        <label className="form-field"><span>Unit <b>*</b></span><input value={form.unit} onChange={(event) => set('unit', event.target.value)} placeholder="tablet" /></label>
        <label className="form-field"><span>Reorder level</span><input type="number" min={0} value={form.reorderLevel} onChange={(event) => set('reorderLevel', Number(event.target.value))} /></label>
        <label className="form-field"><span>Unit price</span><input type="number" min={0} step="0.01" value={form.pricePerUnit} onChange={(event) => set('pricePerUnit', Number(event.target.value))} /></label>
        <label className="form-field span-3"><span>Contraindications <small className="muted-text">comma separated</small></span><input value={contra} onChange={(event) => setContra(event.target.value)} /></label>
        <label className="remember-row"><input type="checkbox" checked={Boolean(form.controlled)} onChange={(event) => set('controlled', event.target.checked)} />Controlled medicine</label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => onSave({ ...form, id: form.id || `med-${Date.now().toString(36)}`, name: form.name.trim(), genericName: form.genericName.trim() || form.name.trim(), generic: item.id ? item.generic : (form.genericName || form.name).trim().toLowerCase().split(' ')[0], contraindications: contra.split(',').map((value) => value.trim()).filter(Boolean) })}>{item.id ? 'Save' : 'Add medicine'}</Button></div>
    </Modal>
  )
}
