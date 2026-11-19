import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { AlertTriangle, Check, ChevronRight, Download, Eye, Filter, Loader, Search, ShieldCheck, UserCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import { useAuditEvents } from '../data'
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { downloadCsv, formatTime } from '../lib/format'
import type { AuditEvent } from '../types'

export default function AuditView() {
  const { state, notify } = useHospital()
  const auditEvents = useAuditEvents()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [view, setView] = useState<'audit' | 'emergency'>('audit')

  const categories = useMemo(() => [...new Set(auditEvents.map((e) => e.category))], [auditEvents])
  const filtered = auditEvents.filter((e) => (category === 'all' || e.category === category) && (severity === 'all' || e.category === severity) && (!query || `${e.userName ?? e.user ?? ''} ${e.action} ${e.details} ${e.category} ${e.patientMrn ?? ''}`.toLowerCase().includes(query.toLowerCase())))

  const criticalCount = auditEvents.filter((e) => ['SECURITY', 'AUTH', 'EMERGENCY'].includes(e.category)).length
  const clinicalCount = auditEvents.filter((e) => ['CLINICAL', 'TRIAGE', 'MEDICATION', 'ADMISSION'].includes(e.category)).length
  const systemCount = auditEvents.filter((e) => ['BILLING', 'LABORATORY'].includes(e.category)).length

  const exportAudit = () => downloadCsv('northstar-audit.csv', [['ID', 'Timestamp', 'User', 'Role', 'Category', 'Action', 'Details', 'Patient MRN', 'IP Address'], ...auditEvents.map((e) => [e.id, e.timestamp, e.userName ?? e.user ?? '', e.role ?? e.userRole ?? '', e.category, e.action, e.details, e.patientMrn ?? '', e.ipAddress ?? ''])])

  return <motion.div className="audit-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader eyebrow="COMPLIANCE & SECURITY · AUDIT TRAIL" title="Audit & Emergency Codes" description="System-wide audit trail, security events, emergency code activations and compliance monitoring." actions={<Fragment><Button variant="secondary" icon={Download} onClick={exportAudit}>Export audit log</Button><Button variant="outline" icon={UserCheck} onClick={() => notify('Emergency code test initiated', 'warning')}>Test emergency code</Button></Fragment>} />
    <div className="metrics-grid audit-metrics">
      <div className="metric metric-coral"><div className="metric-icon"><AlertTriangle size={20} /></div><div className="metric-body"><p className="metric-label">Security events</p><p className="metric-value">{criticalCount}</p><p className="metric-detail">Auth, security, emergency</p></div></div>
      <div className="metric metric-blue"><div className="metric-icon"><ShieldCheck size={20} /></div><div className="metric-body"><p className="metric-label">Clinical actions</p><p className="metric-value">{clinicalCount}</p><p className="metric-detail">Triage, meds, admissions</p></div></div>
      <div className="metric metric-teal"><div className="metric-icon"><Loader size={20} /></div><div className="metric-body"><p className="metric-label">System events</p><p className="metric-value">{systemCount}</p><p className="metric-detail">Billing, lab, pharmacy</p></div></div>
      <div className="metric metric-amber"><div className="metric-icon"><UserCheck size={20} /></div><div className="metric-body"><p className="metric-label">Total events</p><p className="metric-value">{auditEvents.length}</p><p className="metric-detail">This session</p></div></div>
    </div>

    <div className="audit-tabs" role="tablist">
      {(['audit', 'emergency'] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>)}
    </div>

    {view === 'audit' && <Panel className="audit-panel">
      <div className="audit-toolbar"><label className="audit-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit trail…" />{query && <button onClick={() => setQuery('')}><X size={14} /></button>}</label><label><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></label><label><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">All severity</option><option value="SECURITY">Security</option><option value="AUTH">Authentication</option><option value="EMERGENCY">Emergency</option><option value="CLINICAL">Clinical</option></select></label></div>
      <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Category</th><th>Action</th><th>Details</th><th>Patient</th><th>IP</th><th>Action</th></tr></thead><tbody>
        {filtered.slice(0, 100).map((event) => <tr key={event.id}><td>{event.timestamp}</td><td><b>{event.userName ?? event.user ?? 'System'}</b></td><td>{event.role ?? event.userRole ?? ''}</td><td><Badge variant={['SECURITY', 'AUTH', 'EMERGENCY'].includes(event.category) ? 'danger' : event.category === 'CLINICAL' || event.category === 'TRIAGE' || event.category === 'MEDICATION' ? 'info' : 'neutral'}>{event.category}</Badge></td><td>{event.action}</td><td className="audit-details">{event.details}</td><td>{event.patientMrn ?? 'N/A'}</td><td>{event.ipAddress ?? 'N/A'}</td><td><Button size="sm" variant="outline" onClick={() => setSelectedEvent(event)}>View<Eye size={14} /></Button></td></tr>)}
      </tbody></table></div>
      {filtered.length === 0 && <EmptyState icon={ShieldCheck} title="No audit events match" text="Try another search term or clear the filters." />}
      <div className="audit-footer"><span>Showing {Math.min(filtered.length, 100)} of {filtered.length} events. Log is append-only and tamper-evident.</span></div>
    </Panel>}

    {selectedEvent && <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Audit Event Details" subtitle={`${selectedEvent.category} · ${selectedEvent.action}`} size="lg"><div className="audit-event-detail"><div className="event-header"><Badge variant={['SECURITY', 'AUTH', 'EMERGENCY'].includes(selectedEvent.category) ? 'danger' : 'info'}>{selectedEvent.category}</Badge><span>{selectedEvent.timestamp}</span></div><div className="event-field"><b>Event ID:</b> {selectedEvent.id}</div><div className="event-field"><b>User:</b> {selectedEvent.userName ?? selectedEvent.user ?? 'System'} ({selectedEvent.role ?? selectedEvent.userRole ?? 'N/A'})</div><div className="event-field"><b>Action:</b> {selectedEvent.action}</div><div className="event-field"><b>Details:</b> {selectedEvent.details}</div><div className="event-field"><b>Patient MRN:</b> {selectedEvent.patientMrn ?? 'N/A'}</div><div className="event-field"><b>IP Address:</b> {selectedEvent.ipAddress ?? 'N/A'}</div><div className="modal-footer"><Button variant="ghost" onClick={() => setSelectedEvent(null)}>Close</Button></div></div></Modal>}

    {view === 'emergency' && <Panel className="emergency-codes-panel" title="Emergency code activations">
      <div className="emergency-codes-grid">
        <div className="emergency-code-card code-blue"><div className="code-header"><span className="code-badge">CODE BLUE</span><StatusBadge status="active" /></div><p>Cardiac arrest response</p><div className="code-meta"><span>Location: ICU Bed 12</span><span>Initiated: Dr. Ana Costa</span><span>Time: 2 min ago</span></div><Button size="sm" variant="secondary" className="code-respond">Respond<Check size={14} /></Button></div>
        <div className="emergency-code-card code-red"><div className="code-header"><span className="code-badge">CODE RED</span><StatusBadge status="active" /></div><p>Fire emergency</p><div className="code-meta"><span>Location: Level 2 Storage</span><span>Initiated: Security Desk</span><span>Time: 12 min ago</span></div><Button size="sm" variant="secondary" className="code-respond">Respond<Check size={14} /></Button></div>
        <div className="emergency-code-card code-trauma"><div className="code-header"><span className="code-badge">CODE TRAUMA</span><StatusBadge status="active" /></div><p>Level 1 trauma activation</p><div className="code-meta"><span>Location: Emergency Bay 1</span><span>Initiated: EMS Dispatch</span><span>Time: 30 sec ago</span></div><Button size="sm" variant="secondary" className="code-respond">Respond<Check size={14} /></Button></div>
        <div className="emergency-code-card code-stroke"><div className="code-header"><span className="code-badge">CODE STROKE</span><StatusBadge status="standby" /></div><p>Acute stroke protocol</p><div className="code-meta"><span>Ready for activation</span><span>Neurology on call</span></div><Button size="sm" variant="outline" className="code-respond">Activate</Button></div>
        <div className="emergency-code-card code-stemi"><div className="code-header"><span className="code-badge">CODE STEMI</span><StatusBadge status="standby" /></div><p>STEMI activation</p><div className="code-meta"><span>Ready for activation</span><span>Cardiology on call</span></div><Button size="sm" variant="outline" className="code-respond">Activate</Button></div>
        <div className="emergency-code-card code-amber"><div className="code-header"><span className="code-badge">CODE AMBER</span><StatusBadge status="standby" /></div><p>Infant abduction</p><div className="code-meta"><span>Ready for activation</span><span>Security on standby</span></div><Button size="sm" variant="outline" className="code-respond">Activate</Button></div>
      </div>
    </Panel>}
  </motion.div>
}
