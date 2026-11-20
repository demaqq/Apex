import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, FileCheck2, FlaskConical, Play, Plus, Printer, ScanLine, Siren, Truck } from 'lucide-react'
import { OrderModal, ResultModal } from '../components/ClinicalModals'
import { Button, Chip, DetailGrid, EmptyState, FilterSelect, Metric, Modal, OrderStepper, PageHeader, Panel, PersonCell, SearchField, Tabs } from '../components/ui'
import { CatalogueEditor } from '../components/CatalogueEditor'
import { RequestFormModal } from '../components/RequestForm'
import { AttachImagesButton, canAttachImages, ImageStrip } from '../components/OrderImages'
import { stagesFor, canAdvanceOrder, needsResult, orderStage } from '../lib/clinical'
import { catalogueItem, imagingChecks, isSentOut, LAB_SECTIONS, labSectionOf, MODALITIES, modalityOf, sentOutLabel } from '../lib/diagnostics'
import { downloadCsv, formatDateTime, formatWait, relativeTime, today } from '../lib/format'
import { matches, useNow, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { ClinicalOrder } from '../types'

type Kind = 'Laboratory' | 'Imaging'
type View = 'worklist' | 'sent-out' | 'catalogue'
const PRIORITY_RANK = { emergent: 0, urgent: 1, routine: 2 }
const STATUS_RANK = { 'in-progress': 0, ordered: 1, completed: 2 }
const REJECT_REASONS = ['Haemolysed', 'Clotted', 'Insufficient volume', 'Unlabelled or mislabelled', 'Wrong container']

const COPY: Record<Kind, { eyebrow: string; title: string; description: string; group: string; noun: string; nouns: string; request: string; icon: typeof FlaskConical }> = {
  Laboratory: { eyebrow: 'Diagnostics · Clinical laboratory', title: 'Laboratory', description: 'Specimens by section, from collection and analysis to a verified result in the patient’s record.', group: 'Section', noun: 'test', nouns: 'tests', request: 'Request tests', icon: FlaskConical },
  Imaging: { eyebrow: 'Diagnostics · Radiology & imaging', title: 'Imaging', description: 'X-ray, ultrasound, CT, MRI, PET-CT and more: safety checks, scheduling, reporting and images back to the record.', group: 'Modality', noun: 'study', nouns: 'studies', request: 'Request imaging', icon: ScanLine },
}

export default function DiagnosticsView({ kind }: { kind: Kind }) {
  const { state, currentRole, can, advanceOrder, rejectSpecimen, setSelectedPatientId } = useHospital()
  const copy = COPY[kind]
  const imaging = kind === 'Imaging'
  const patients = usePatients()
  const now = useNow()
  const [view, setView] = useState<View>('worklist')
  const [group, setGroup] = useState('All')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('active')
  const [ordering, setOrdering] = useState(false)
  const [reporting, setReporting] = useState<ClinicalOrder | null>(null)
  const [viewing, setViewing] = useState<ClinicalOrder | null>(null)
  const [rejecting, setRejecting] = useState<ClinicalOrder | null>(null)
  const [printing, setPrinting] = useState<string[] | null>(null)
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const canOrder = can('refer') || can('triage') || can('manage') || can('prescribe')

  const groupOf = (order: ClinicalOrder) => imaging ? modalityOf(order, state.investigations) : labSectionOf(order, state.investigations)
  const groups: readonly string[] = imaging ? MODALITIES : LAB_SECTIONS
  const ofKind = state.orders.filter((order) => order.kind === kind)
  const inHouse = ofKind.filter((order) => !isSentOut(order))
  const sentOut = ofKind.filter(isSentOut)
  const active = inHouse.filter((order) => order.status !== 'completed')
  const source = view === 'sent-out' ? sentOut : inHouse
  const filtered = source
    .filter((order) => {
      const patient = patients.get(order.patientId)
      const statusOk = status === 'all' || (status === 'active' ? order.status !== 'completed' : order.status === status)
      return statusOk && (group === 'All' || groupOf(order) === group) && matches(query, order.id, order.title, patient?.name, patient?.mrn, order.createdBy)
    })
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt))
  const oldest = active.reduce<ClinicalOrder | null>((first, order) => !first || order.createdAt < first.createdAt ? order : first, null)
  const groupCounts = groups.map((name) => [name, source.filter((order) => order.status !== 'completed' && groupOf(order) === name).length] as const)

  const exportOrders = () => downloadCsv(`${kind.toLowerCase()}-orders-${today()}.csv`, [
    ['Order', 'Patient', 'MRN', imaging ? 'Study' : 'Test', copy.group, 'Priority', 'Status', 'Where', 'Ordered by', 'Ordered at', 'Result'],
    ...ofKind.map((order) => [order.id, patients.get(order.patientId)?.name, patients.get(order.patientId)?.mrn, order.title, groupOf(order), order.priority, order.status, isSentOut(order) ? sentOutLabel(order, state.providers) : 'In-house', order.createdBy, order.createdAt, order.result]),
  ])

  const actionFor = (order: ClinicalOrder) => {
    const stage = orderStage(order)
    const stages = stagesFor(order)
    const result = order.result ? <Button size="sm" variant="ghost" icon={Eye} onClick={() => setViewing(order)}>Result</Button> : null
    const print = isSentOut(order) ? <Button size="sm" variant="ghost" icon={Printer} onClick={() => setPrinting([order.id])}>Request form</Button> : null
    if (!currentRole || !canAdvanceOrder(order, currentRole)) return <>{print}{result ?? <span className="muted-text">{stage === stages.length - 1 ? 'Complete' : isSentOut(order) ? 'Awaiting outside result' : `Awaiting ${imaging ? 'imaging' : 'laboratory'}`}</span>}</>
    const reject = !imaging && !isSentOut(order) && stage >= 1 && stage <= 2 && currentRole === 'laboratory' ? <Button size="sm" variant="ghost" onClick={() => setRejecting(order)}>Reject sample</Button> : null
    return <>{print}{reject}{needsResult(order)
      ? <Button size="sm" icon={FileCheck2} onClick={() => setReporting(order)}>{isSentOut(order) ? 'Enter outside result' : imaging ? 'Report' : 'Enter result'}</Button>
      : stage < stages.length - 1 ? <Button size="sm" variant={stage === stages.length - 2 ? 'primary' : 'secondary'} icon={Play} onClick={() => advanceOrder(order.id)}>Mark {stages[stage + 1].toLowerCase()}</Button> : null}{result}</>
  }

  const Icon = copy.icon
  return (
    <motion.div className={`ops-page diagnostics-${kind.toLowerCase()}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description}
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportOrders}>Export</Button>
          {canOrder && <Button icon={Plus} onClick={() => setOrdering(true)}>{copy.request}</Button>}
        </>} />

      <div className="metrics-grid">
        <Metric label={imaging ? 'To schedule or scan' : 'Specimens to receive'} value={active.filter((order) => order.status === 'ordered').length} detail={imaging ? 'Requested, not yet scanned' : 'Requested, not yet collected'} icon={Icon} tone="amber" />
        <Metric label={imaging ? 'Scanned, to report' : 'In analysis'} value={active.filter((order) => order.status === 'in-progress').length} detail={imaging ? 'Acquired or in progress' : 'Collected and being processed'} icon={Play} tone="blue" />
        <Metric label="Emergent" value={active.filter((order) => order.priority === 'emergent').length} detail="Open emergent requests" icon={Siren} tone="coral" />
        <Metric label="Sent out" value={sentOut.filter((order) => order.status !== 'completed').length} detail={`Awaiting an outside result · longest in-house wait ${oldest ? formatWait(oldest.createdAt, now) : '—'}`} icon={Truck} tone="teal" />
      </div>

      <Tabs<View> label={copy.title} value={view} onChange={(next) => { setView(next); setGroup('All'); setStatus('active') }} options={[
        { value: 'worklist', label: 'Worklist', count: active.length },
        { value: 'sent-out', label: 'Sent out', count: sentOut.filter((order) => order.status !== 'completed').length },
        { value: 'catalogue', label: imaging ? 'Study catalogue' : 'Test catalogue' },
      ]} />

      {view === 'catalogue' ? <CatalogueEditor kind={kind} /> : (
        <Panel>
          {view === 'sent-out' && <p className="table-footnote admin-note">{imaging ? 'Studies' : 'Tests'} not available here. The patient takes the printed request to an outside {imaging ? 'imaging centre' : 'laboratory'}; enter the result when it comes back. Electronic exchange with partner hospitals and diagnostic centres is planned.</p>}
          <div className="table-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder={`Search ${copy.nouns}, patients or clinicians…`} />
            <FilterSelect label="All statuses" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Open' }, { value: 'ordered', label: 'Requested' }, { value: 'in-progress', label: 'In progress' }, { value: 'completed', label: 'Complete' }]} />
          </div>
          <div className="chip-filter" role="group" aria-label={copy.group}>
            <button type="button" className={group === 'All' ? 'on' : ''} onClick={() => setGroup('All')}>All<small>{source.filter((order) => order.status !== 'completed').length}</small></button>
            {groupCounts.map(([name, count]) => <button key={name} type="button" className={group === name ? 'on' : ''} onClick={() => setGroup(name)}>{name}{count > 0 && <small>{count}</small>}</button>)}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>{imaging ? 'Study' : 'Test'}</th><th>Patient</th><th>Priority</th><th>Progress</th><th>Requested</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {filtered.map((order) => {
                  const patient = patients.get(order.patientId)
                  const item = catalogueItem(order, state.investigations)
                  const modality = imaging ? modalityOf(order, state.investigations) : undefined
                  return (
                    <tr key={order.id}>
                      <td className="wrap">
                        <b>{order.title}</b>
                        <span className="dx-meta"><Chip tone="neutral">{groupOf(order)}</Chip>{!imaging && item?.specimen && <small>{item.specimen}{item.container ? ` · ${item.container}` : ''}</small>}{item?.tatHours && <small>TAT {item.tatHours < 1 ? `${Math.round(item.tatHours * 60)} min` : `${item.tatHours} h`}</small>}</span>
                        {imaging && modality && !isSentOut(order) && order.status !== 'completed' && <span className="dx-checks">{imagingChecks(patient, modality, state.orders, item?.prep).map((check) => <Chip key={check.text} tone={check.tone}>{check.text}</Chip>)}</span>}
                        <small>{order.id}{isSentOut(order) ? ` · ${sentOutLabel(order, state.providers)}` : ''}</small>
                        {order.billing === 'Unpaid' && !(state.settings.offModules ?? []).includes('reception') && <Chip tone="warning">Awaiting payment at reception</Chip>}
                        {imaging && <ImageStrip order={order} compact />}
                      </td>
                      <td>{patient && <PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.location}`} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                      <td><span className={`priority-label priority-${order.priority}`}>{order.priority}</span></td>
                      <td><OrderStepper order={order} />{order.specimen && <small className="mono">{order.specimen.id} · {order.specimen.type}</small>}</td>
                      <td>{relativeTime(order.createdAt, now)}<small>{order.createdBy}</small></td>
                      <td className="row-actions">{actionFor(order)}{imaging && canAttachImages(order, currentRole) && <AttachImagesButton order={order} label="Images" />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <EmptyState icon={view === 'sent-out' ? Truck : Icon} title={view === 'sent-out' ? `No ${copy.nouns} sent out` : 'No orders match'} text={view === 'sent-out' ? `${imaging ? 'Studies' : 'Tests'} that are not offered here appear once requested.` : 'Try another search term, section or status.'} />}
        </Panel>
      )}

      {canOrder && <OrderModal open={ordering} onClose={() => setOrdering(false)} kind={kind} />}
      {printing && <RequestFormModal orderIds={printing} onClose={() => setPrinting(null)} />}
      {rejecting && (
        <Modal open onClose={() => setRejecting(null)} title={`Reject sample · ${rejecting.title}`} subtitle={`${rejecting.specimen?.id ?? ''} · ${patients.get(rejecting.patientId)?.name ?? ''}`} size="sm">
          <label className="form-field"><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}>{REJECT_REASONS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <p className="record-hint">The order goes back to “Requested” and the ward is asked to send a new sample.</p>
          <div className="modal-footer"><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" onClick={() => { rejectSpecimen(rejecting.id, reason); setRejecting(null) }}>Reject sample</Button></div>
        </Modal>
      )}
      {reporting && <ResultModal order={reporting} open onClose={() => setReporting(null)} />}
      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.title} subtitle={`${viewing.id} · ${patients.get(viewing.patientId)?.name ?? ''}`} size="md">
          <DetailGrid items={[['Patient', patients.get(viewing.patientId)?.name], ['MRN', patients.get(viewing.patientId)?.mrn], ['Priority', viewing.priority], ['Requested', `${formatDateTime(viewing.createdAt)} · ${viewing.createdBy}`], ...(isSentOut(viewing) ? [['Done at', sentOutLabel(viewing, state.providers)] as [string, string]] : []), ...(catalogueItem(viewing, state.investigations)?.refRange ? [['Reference range', catalogueItem(viewing, state.investigations)!.refRange!] as [string, string]] : [])]} />
          <h3 className="detail-heading">{orderStage(viewing) === stagesFor(viewing).length - 1 ? 'Verified result' : 'Result (awaiting verification)'}</h3>
          <p className="result-text">{viewing.result ?? 'No result text recorded.'}</p>
          {imaging && <ImageStrip order={viewing} />}
          <div className="modal-footer"><span /><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button></div>
        </Modal>
      )}
    </motion.div>
  )
}

export const LaboratoryView = () => <DiagnosticsView kind="Laboratory" />
export const ImagingView = () => <DiagnosticsView kind="Imaging" />
