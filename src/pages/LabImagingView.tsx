import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock3, Download, Eye, FileCheck2, FlaskConical, Play, Plus, ScanLine, Siren } from 'lucide-react'
import { OrderModal, ResultModal } from '../components/ClinicalModals'
import { Button, DetailGrid, EmptyState, FilterSelect, Metric, Modal, OrderStepper, PageHeader, Panel, PersonCell, SearchField, Tabs } from '../components/ui'
import { stagesFor, canAdvanceOrder, needsResult, orderStage } from '../lib/clinical'
import { downloadCsv, formatDateTime, formatWait, relativeTime, today } from '../lib/format'
import { matches, useNow, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { ClinicalOrder } from '../types'

type View = 'Laboratory' | 'Imaging'
const PRIORITY_RANK = { emergent: 0, urgent: 1, routine: 2 }
const STATUS_RANK = { 'in-progress': 0, ordered: 1, completed: 2 }

export default function LabImagingView() {
  const { state, profile, currentRole, can, advanceOrder, setSelectedPatientId } = useHospital()
  const patients = usePatients()
  const now = useNow()
  const [view, setView] = useState<View>(profile?.department === 'radiology' ? 'Imaging' : 'Laboratory')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('active')
  const [ordering, setOrdering] = useState(false)
  const [reporting, setReporting] = useState<ClinicalOrder | null>(null)
  const [viewing, setViewing] = useState<ClinicalOrder | null>(null)
  const canOrder = can('refer') || can('triage') || can('manage')

  const ofKind = state.orders.filter((order) => order.kind === view)
  const active = ofKind.filter((order) => order.status !== 'completed')
  const filtered = ofKind
    .filter((order) => {
      const patient = patients.get(order.patientId)
      const statusOk = status === 'all' || (status === 'active' ? order.status !== 'completed' : status === 'referred' ? Boolean(order.externalProviderId) : order.status === status)
      return statusOk && matches(query, order.id, order.title, patient?.name, patient?.mrn, order.createdBy)
    })
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt))
  const oldest = active.reduce<ClinicalOrder | null>((first, order) => !first || order.createdAt < first.createdAt ? order : first, null)

  const exportOrders = () => downloadCsv(`${view.toLowerCase()}-orders-${today()}.csv`, [
    ['Order', 'Patient', 'MRN', 'Test', 'Priority', 'Status', 'Ordered by', 'Ordered at', 'Result'],
    ...ofKind.map((order) => [order.id, patients.get(order.patientId)?.name, patients.get(order.patientId)?.mrn, order.title, order.priority, order.status, order.createdBy, order.createdAt, order.result]),
  ])

  const actionFor = (order: ClinicalOrder) => {
    const stage = orderStage(order)
    const stages = stagesFor(order)
    const result = order.result ? <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(order)}>Result</Button> : null
    if (!currentRole || !canAdvanceOrder(order, currentRole)) return result ?? <span className="muted-text">{stage === stages.length - 1 ? 'Complete' : `Awaiting ${view === 'Imaging' ? 'radiology' : 'laboratory'}`}</span>
    return <>{needsResult(order)
      ? <Button size="sm" icon={FileCheck2} onClick={() => setReporting(order)}>{view === 'Imaging' ? 'Report' : 'Enter result'}</Button>
      : <Button size="sm" variant={stage === stages.length - 2 ? 'primary' : 'secondary'} icon={Play} onClick={() => updateAndKeep(order)}>Mark {stages[stage + 1].toLowerCase()}</Button>}{result}</>
  }
  const updateAndKeep = (order: ClinicalOrder) => advanceOrder(order.id)

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Diagnostics · Laboratory & radiology"
        title="Lab & imaging"
        description="Every diagnostic order across the hospital, from request to verified result."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportOrders}>Export {view.toLowerCase()} orders</Button>
          {canOrder && <Button icon={Plus} onClick={() => setOrdering(true)}>{view === 'Imaging' ? 'Request imaging' : 'Request tests'}</Button>}
        </>}
      />

      <div className="metrics-grid">
        <Metric label="Waiting to start" value={active.filter((order) => order.status === 'ordered').length} detail="Ordered, not yet collected or scanned" icon={view === 'Imaging' ? ScanLine : FlaskConical} tone="amber" />
        <Metric label="In progress" value={active.filter((order) => order.status === 'in-progress').length} detail="Being processed now" icon={Play} tone="blue" />
        <Metric label="Emergent" value={active.filter((order) => order.priority === 'emergent').length} detail="Open emergent requests" icon={Siren} tone="coral" />
        <Metric label="Longest wait" value={oldest ? formatWait(oldest.createdAt, now) : '—'} detail={`${ofKind.filter((order) => order.status === 'completed').length} resulted so far`} icon={Clock3} tone="teal" />
      </div>

      <Tabs<View> label="Diagnostic service" value={view} onChange={(next) => { setView(next); setQuery('') }} options={[
        { value: 'Laboratory', label: 'Laboratory', count: state.orders.filter((order) => order.kind === 'Laboratory' && order.status !== 'completed').length },
        { value: 'Imaging', label: 'Imaging', count: state.orders.filter((order) => order.kind === 'Imaging' && order.status !== 'completed').length },
      ]} />

      <Panel>
        <div className="table-toolbar">
          <SearchField value={query} onChange={setQuery} placeholder={`Search ${view === 'Imaging' ? 'studies' : 'tests'}, patients or clinicians…`} />
          <FilterSelect label="All statuses" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Open orders' }, { value: 'referred', label: 'Referred out' }, { value: 'ordered', label: 'Ordered' }, { value: 'in-progress', label: 'In progress' }, { value: 'completed', label: 'Complete' }]} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>{view === 'Imaging' ? 'Study' : 'Test'}</th><th>Patient</th><th>Priority</th><th>Progress</th><th>Requested</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {filtered.map((order) => {
                const patient = patients.get(order.patientId)
                return (
                  <tr key={order.id}>
                    <td className="wrap"><b>{order.title}</b><small>{order.id}{order.externalProviderId ? ` · referred to ${state.providers.find((provider) => provider.id === order.externalProviderId)?.name ?? 'partner'}` : ''}</small></td>
                    <td>{patient && <PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.location}`} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                    <td><span className={`priority-label priority-${order.priority}`}>{order.priority}</span></td>
                    <td><OrderStepper order={order} />{order.specimen && <small className="mono">{order.specimen.id} · {order.specimen.type}</small>}</td>
                    <td>{relativeTime(order.createdAt, now)}<small>{order.createdBy}</small></td>
                    <td className="row-actions">{actionFor(order)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={view === 'Imaging' ? ScanLine : FlaskConical} title="No orders match" text="Try another search term or change the status filter." />}
      </Panel>

      {canOrder && <OrderModal open={ordering} onClose={() => setOrdering(false)} kind={view} />}
      {reporting && <ResultModal order={reporting} open onClose={() => setReporting(null)} />}
      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.title} subtitle={`${viewing.id} · ${patients.get(viewing.patientId)?.name ?? ''}`} size="md">
          <DetailGrid items={[['Patient', patients.get(viewing.patientId)?.name], ['MRN', patients.get(viewing.patientId)?.mrn], ['Priority', viewing.priority], ['Requested', `${formatDateTime(viewing.createdAt)} · ${viewing.createdBy}`]]} />
          <h3 className="detail-heading">{orderStage(viewing) === stagesFor(viewing).length - 1 ? 'Verified result' : 'Result (awaiting verification)'}</h3>
          <p className="result-text">{viewing.result ?? 'No result text recorded.'}</p>
          <div className="modal-footer"><span /><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button></div>
        </Modal>
      )}
    </motion.div>
  )
}
