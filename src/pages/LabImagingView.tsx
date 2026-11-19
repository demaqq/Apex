import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { Activity, Check, ChevronRight, Download, Eye, Filter, Loader, Microscope, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import { useLabOrders, useImagingOrders } from '../data'
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { downloadCsv, formatTime } from '../lib/format'
import type { LabOrder, ImagingOrder } from '../types'

export default function LabImagingView() {
  const { state, notify } = useHospital()
  const labOrders = useLabOrders()
  const imagingOrders = useImagingOrders()
  const [labQuery, setLabQuery] = useState('')
  const [imagingQuery, setImagingQuery] = useState('')
  const [labFilter, setLabFilter] = useState('all')
  const [imagingFilter, setImagingFilter] = useState('all')
  const [view, setView] = useState<'lab' | 'imaging'>('lab')
  const [selectedLab, setSelectedLab] = useState<LabOrder | null>(null)
  const [selectedImaging, setSelectedImaging] = useState<ImagingOrder | null>(null)

  const labStatuses = useMemo(() => [...new Set(labOrders.map((o) => o.status))], [labOrders])
  const imagingStatuses = useMemo(() => [...new Set(imagingOrders.map((o) => o.status))], [imagingOrders])
  const filteredLab = labOrders.filter((o) =>
    (labFilter === 'all' || o.status === labFilter) &&
    (!labQuery || `${o.testName} ${o.patientName} ${o.mrn}`.toLowerCase().includes(labQuery.toLowerCase()))
  )
  const filteredImaging = imagingOrders.filter((o) =>
    (imagingFilter === 'all' || o.status === imagingFilter) &&
    (!imagingQuery || `${o.bodyPart} ${o.modality} ${o.patientName} ${o.mrn}`.toLowerCase().includes(imagingQuery.toLowerCase()))
  )

  const exportLab = () => downloadCsv('northstar-lab-orders.csv', [
    ['Order #', 'Patient', 'MRN', 'Test', 'Category', 'Department', 'Priority', 'Status', 'Specimen', 'Ordered By', 'Date'],
    ...labOrders.map((o) => [o.orderNumber, o.patientName, o.mrn, o.testName, o.category, o.department ?? '', o.priority, o.status, o.specimenType, o.doctorName ?? o.orderedBy ?? '', o.orderDate])
  ])
  const exportImaging = () => downloadCsv('northstar-imaging-orders.csv', [
    ['Order #', 'Patient', 'MRN', 'Modality', 'Body Part', 'Department', 'Priority', 'Status', 'Indication', 'Requested By', 'Date'],
    ...imagingOrders.map((o) => [o.orderNumber, o.patientName, o.mrn, o.modality, o.bodyPart, o.department ?? '', o.priority, o.status, o.indication, o.requestedBy, o.requestedAt])
  ])

  return (
    <motion.div className="lab-imaging-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="DIAGNOSTIC SERVICES · LAB & IMAGING"
        title="Laboratory & Imaging"
        description="Order management, specimen tracking, result verification and imaging workflows."
        actions={
          <Fragment>
            <Button variant="secondary" icon={Download} onClick={view === 'lab' ? exportLab : exportImaging}>
              Export {view === 'lab' ? 'lab orders' : 'imaging orders'}
            </Button>
            <Button icon={Plus} onClick={() => { setView(view === 'lab' ? 'imaging' : 'lab') }}>
              New {view === 'lab' ? 'imaging order' : 'lab order'}
            </Button>
          </Fragment>
        }
      />
      <div className="lab-imaging-tabs" role="tablist">
        {(['lab', 'imaging'] as const).map((v) => (
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

      {view === 'lab' && (
        <Panel className="lab-panel">
          <div className="lab-toolbar">
            <label className="lab-search">
              <Search size={16} />
              <input
                value={labQuery}
                onChange={(event) => setLabQuery(event.target.value)}
                placeholder="Search lab orders…"
              />
              {labQuery && (
                <button onClick={() => setLabQuery('')}>
                  <X size={14} />
                </button>
              )}
            </label>
            <label>
              <Filter size={15} />
              <select value={labFilter} onChange={(event) => setLabFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {labStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Specimen</th>
                  <th>Ordered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLab.map((order) => (
                  <tr key={order.id}>
                    <td><b>{order.orderNumber}</b></td>
                    <td>
                      <Avatar name={order.patientName} size="sm" />
                      <span>
                        <b>{order.patientName}</b>
                        <small>{order.mrn}</small>
                      </span>
                    </td>
                    <td>{order.testName}</td>
                    <td><Badge variant="neutral">{order.category}</Badge></td>
                    <td>
                      <Badge
                        variant={
                          order.priority === 'STAT' ? 'danger' : order.priority === 'Urgent' ? 'warning' : 'success'
                        }
                      >
                        {order.priority}
                      </Badge>
                    </td>
                    <td><StatusBadge status={order.status.toLowerCase().replace(' ', '-')} /></td>
                    <td>{order.specimenType}</td>
                    <td>{order.orderDate}</td>
                    <td>
                      <Button
                        size="sm"
                        variant={order.status === 'Completed' ? 'secondary' : 'outline'}
                        onClick={() => setSelectedLab(order)}
                      >
                        {order.status === 'Completed' ? <Eye size={14} /> : <Loader size={14} />}
                        {order.status === 'Completed' ? ' View' : ' Process'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLab.length === 0 && (
            <EmptyState icon={Microscope} title="No lab orders match" text="Try another search term or clear the status filter." />
          )}
        </Panel>
      )}

      {view === 'imaging' && (
        <Panel className="imaging-panel">
          <div className="imaging-toolbar">
            <label className="imaging-search">
              <Search size={16} />
              <input
                value={imagingQuery}
                onChange={(event) => setImagingQuery(event.target.value)}
                placeholder="Search imaging orders…"
              />
              {imagingQuery && (
                <button onClick={() => setImagingQuery('')}>
                  <X size={14} />
                </button>
              )}
            </label>
            <label>
              <Filter size={15} />
              <select value={imagingFilter} onChange={(event) => setImagingFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {imagingStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="imaging-table-wrap">
            <table className="imaging-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patient</th>
                  <th>Modality</th>
                  <th>Body Part</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Indication</th>
                  <th>Requested</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredImaging.map((order) => (
                  <tr key={order.id}>
                    <td><b>{order.orderNumber}</b></td>
                    <td>
                      <Avatar name={order.patientName} size="sm" />
                      <span>
                        <b>{order.patientName}</b>
                        <small>{order.mrn}</small>
                      </span>
                    </td>
                    <td>{order.modality}</td>
                    <td>{order.bodyPart}</td>
                    <td>
                      <Badge
                        variant={
                          order.priority === 'STAT' ? 'danger' : order.priority === 'Urgent' ? 'warning' : 'success'
                        }
                      >
                        {order.priority}
                      </Badge>
                    </td>
                    <td><StatusBadge status={order.status.toLowerCase().replace(' ', '-')} /></td>
                    <td>{order.indication}</td>
                    <td>{order.requestedAt}</td>
                    <td>
                      <Button
                        size="sm"
                        variant={order.status === 'Completed' ? 'secondary' : 'outline'}
                        onClick={() => setSelectedImaging(order)}
                      >
                        {order.status === 'Completed' ? <Eye size={14} /> : <Loader size={14} />}
                        {order.status === 'Completed' ? ' View' : ' Process'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredImaging.length === 0 && (
            <EmptyState icon={Activity} title="No imaging orders match" text="Try another search term or clear the status filter." />
          )}
        </Panel>
      )}

      {selectedLab && (
        <Modal open={!!selectedLab} onClose={() => setSelectedLab(null)} title="Lab Order Details" subtitle={`${selectedLab.orderNumber} · ${selectedLab.testName}`} size="lg">
          <div className="order-detail">
            <div className="order-header">
              <b>{selectedLab.orderNumber}</b>
              <StatusBadge status={selectedLab.status.toLowerCase().replace(' ', '-')} />
            </div>
            <div className="order-meta">
              <div>
                <p><b>Patient:</b> {selectedLab.patientName} ({selectedLab.mrn})</p>
                <p><b>Test:</b> {selectedLab.testName} · <b>Category:</b> {selectedLab.category}</p>
              </div>
              <div>
                <p><b>Priority:</b> {selectedLab.priority}</p>
                <p><b>Specimen:</b> {selectedLab.specimenType}</p>
              </div>
              <div>
                <p><b>Ordered:</b> {selectedLab.orderDate}</p>
                <p><b>Status:</b> {selectedLab.status}</p>
              </div>
            </div>
            {selectedLab.reportNotes && (
              <div className="order-result">
                <h4>Result</h4>
                <pre>{selectedLab.reportNotes}</pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {selectedImaging && (
        <Modal open={!!selectedImaging} onClose={() => setSelectedImaging(null)} title="Imaging Order Details" subtitle={`${selectedImaging.orderNumber} · ${selectedImaging.modality} - ${selectedImaging.bodyPart}`} size="lg">
          <div className="order-detail">
            <div className="order-header">
              <b>{selectedImaging.orderNumber}</b>
              <StatusBadge status={selectedImaging.status.toLowerCase().replace(' ', '-')} />
            </div>
            <div className="order-meta">
              <div>
                <p><b>Patient:</b> {selectedImaging.patientName} ({selectedImaging.mrn})</p>
                <p><b>Modality:</b> {selectedImaging.modality} · <b>Body Part:</b> {selectedImaging.bodyPart}</p>
              </div>
              <div>
                <p><b>Priority:</b> {selectedImaging.priority}</p>
                <p><b>Indication:</b> {selectedImaging.indication}</p>
              </div>
              <div>
                <p><b>Requested:</b> {selectedImaging.requestedAt}</p>
                <p><b>Status:</b> {selectedImaging.status}</p>
              </div>
            </div>
            {selectedImaging.reportText && (
              <div className="order-result">
                <h4>Report</h4>
                <pre>{selectedImaging.reportText}</pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  )
}