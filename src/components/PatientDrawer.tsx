import { AnimatePresence, motion } from 'framer-motion'
import { Activity, AlertCircle, ArrowRight, BedDouble, Check, ClipboardList, Clock3, Download, FileText, FlaskConical, HeartPulse, MapPin, MessageSquareText, Network, Plus, Send, Stethoscope, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CompleteReferralModal, OrderModal, ReferralModal, ResultModal, RetriageModal, TransferModal } from './ClinicalModals'
import { Avatar, Button, DepartmentIcon, EsiBadge, Modal, StatusBadge } from './ui'
import { useHospital } from '../store/HospitalStore'
import { downloadPatientSummary, formatDate, formatTime, getEncounterType, relativeTime, statusLabels } from '../lib/format'
import type { ClinicalOrder, Referral } from '../types'

type Tab = 'overview' | 'orders' | 'referrals' | 'timeline'

export default function PatientDrawer() {
  const { state, profile, selectedPatientId, setSelectedPatientId, can, addNote, updateOrder, updateReferral, dischargePatient, notify } = useHospital()
  const patient = state.patients.find((item) => item.id === selectedPatientId)
  const [tab, setTab] = useState<Tab>('overview')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [retriageOpen, setRetriageOpen] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [dischargeOpen, setDischargeOpen] = useState(false)
  const [resultOrder, setResultOrder] = useState<ClinicalOrder | null>(null)
  const [completeReferral, setCompleteReferral] = useState<Referral | null>(null)

  useEffect(() => {
    if (selectedPatientId) { setTab('overview'); setNoteOpen(false); setNote('') }
  }, [selectedPatientId])

  useEffect(() => {
    if (!selectedPatientId) return
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape' && !retriageOpen && !referralOpen && !orderOpen && !transferOpen && !resultOrder && !completeReferral) setSelectedPatientId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedPatientId, setSelectedPatientId, retriageOpen, referralOpen, orderOpen, transferOpen, resultOrder, completeReferral])

  const department = patient ? state.departments.find((item) => item.id === patient.department) : null
  const patientOrders = useMemo(() => patient ? state.orders.filter((item) => item.patientId === patient.id) : [], [state.orders, patient])
  const patientReferrals = useMemo(() => patient ? state.referrals.filter((item) => item.patientId === patient.id) : [], [state.referrals, patient])
  const close = () => setSelectedPatientId(null)
  const ownsPatient = !!patient && (profile?.id === 'administrator' || patient.department === profile?.department)
  const canReferPatient = ownsPatient && can('refer')
  const completedOrders = patientOrders.filter((order) => order.status === 'completed').length
  const openReferrals = patientReferrals.filter((referral) => ['pending', 'accepted'].includes(referral.status)).length
  const completedReferrals = patientReferrals.filter((referral) => referral.status === 'completed').length

  const saveNote = () => {
    if (!patient || !note.trim()) return
    addNote(patient.id, note)
    setNote(''); setNoteOpen(false); setTab('timeline')
  }

  return <>
    <AnimatePresence>
      {patient && <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
        <motion.aside className="patient-drawer" role="dialog" aria-modal="true" aria-label={`${patient.name} clinical record`} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 330 }}>
          <div className="drawer-topbar"><span><span className="live-dot" />SHARED CLINICAL EPISODE</span><button className="icon-button" onClick={close} aria-label="Close patient record"><X size={20} /></button></div>
          <div className="patient-identity">
            <div className="patient-identity-main"><Avatar name={patient.name} size="xl" /><div><div className="patient-name-row"><h2>{patient.name}</h2><EsiBadge level={patient.esi} compact /></div><p>{patient.mrn} <span>·</span> {patient.age} years <span>·</span> {patient.sex}</p><div className="patient-location"><MapPin size={14} />{department?.name} <span>/</span> {patient.location}</div></div></div>
            <div className="patient-identity-meta"><span className={`encounter-label ${getEncounterType(patient)}`}>{getEncounterType(patient)}</span><StatusBadge status={patient.status} /><button className="icon-button" title="Export episode summary" onClick={() => { if (department) downloadPatientSummary(patient, department.name); notify('Episode summary downloaded', 'info') }}><Download size={18} /></button></div>
          </div>

          {patient.status !== 'discharged' && <div className="drawer-actions">
            {ownsPatient && patient.department === 'emergency' && can('triage') && <Button size="sm" variant="secondary" icon={Activity} onClick={() => setRetriageOpen(true)}>Reassess</Button>}
            {canReferPatient && <Button size="sm" variant="secondary" icon={Network} onClick={() => setReferralOpen(true)}>Refer</Button>}
            {ownsPatient && (profile?.id === 'physician' || profile?.id === 'administrator') && <Button size="sm" variant="secondary" icon={FlaskConical} onClick={() => setOrderOpen(true)}>Order</Button>}
            {can('transfer') && (profile?.id === 'coordinator' || ownsPatient) && <Button size="sm" variant="secondary" icon={BedDouble} onClick={() => setTransferOpen(true)}>Transfer</Button>}
            {can('notes') && <Button size="sm" variant="ghost" icon={MessageSquareText} onClick={() => setNoteOpen((value) => !value)}>Note</Button>}
          </div>}

          <div className="drawer-tabs" role="tablist">
            {(['overview', 'orders', 'referrals', 'timeline'] as Tab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'orders' ? `Orders ${patientOrders.length ? `(${patientOrders.length})` : ''}` : item === 'referrals' ? `Referrals ${patientReferrals.length ? `(${patientReferrals.length})` : ''}` : item.charAt(0).toUpperCase() + item.slice(1)}</button>)}
          </div>

          <div className="drawer-content">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
                {noteOpen && <div className="note-composer"><label htmlFor="clinical-note">Add to the shared timeline</label><textarea id="clinical-note" autoFocus rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Assessment, plan, safety-netting or handoff note…" /><div><Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button><Button size="sm" disabled={!note.trim()} onClick={saveNote}>Save note<Send size={14} /></Button></div></div>}

                {tab === 'overview' && <>
                  <section className="clinical-course" aria-label="Patient clinical course">
                    <div className="course-heading"><span>CLINICAL COURSE</span><b>{getEncounterType(patient)} review</b></div>
                    <div className="course-steps">
                      <article className="complete"><span><Check size={13} /></span><div><small>01 · ASSESS</small><b>ESI {patient.esi} · Observations documented</b></div></article>
                      <article className={patientOrders.length > 0 && completedOrders === patientOrders.length ? 'complete' : 'current'}><span><FlaskConical size={13} /></span><div><small>02 · INVESTIGATE</small><b>{patientOrders.length ? `${completedOrders}/${patientOrders.length} imaging, lab & orders complete` : 'No diagnostics ordered'}</b></div></article>
                      <article className={openReferrals ? 'current' : 'complete'}><span><Network size={13} /></span><div><small>03 · COORDINATE</small><b>{patientReferrals.length ? `${openReferrals} open · ${completedReferrals} consultations complete` : 'No specialist referrals'}</b></div></article>
                      <article className={patient.status === 'discharged' ? 'complete' : 'current'}><span><BedDouble size={13} /></span><div><small>04 · DISPOSITION</small><b>{statusLabels[patient.status]} · {patient.location}</b></div></article>
                    </div>
                  </section>
                  <section className="drawer-section"><div className="section-label"><HeartPulse size={15} />LATEST OBSERVATIONS<span>at triage / last review</span></div><div className="observation-grid">
                    <div className={patient.vitals.hr >= 120 ? 'abnormal' : ''}><span>Heart rate</span><b>{patient.vitals.hr}<small>/min</small></b></div>
                    <div className={patient.vitals.rr >= 30 || patient.vitals.rr < 8 ? 'abnormal' : ''}><span>Respiratory rate</span><b>{patient.vitals.rr}<small>/min</small></b></div>
                    <div className={patient.vitals.spo2 < 94 ? 'abnormal' : ''}><span>SpO₂</span><b>{patient.vitals.spo2}<small>%</small></b></div>
                    <div className={patient.vitals.bpSys < 90 ? 'abnormal' : ''}><span>Blood pressure</span><b>{patient.vitals.bpSys}/{patient.vitals.bpDia}<small>mmHg</small></b></div>
                    <div className={patient.vitals.temp >= 38 ? 'abnormal' : ''}><span>Temperature</span><b>{patient.vitals.temp}<small>°C</small></b></div>
                    <div><span>GCS / pain</span><b>{patient.vitals.gcs}<small>/15</small> · {patient.vitals.pain}<small>/10</small></b></div>
                  </div></section>
                  <section className="drawer-section"><div className="section-label"><FileText size={15} />CLINICAL SUMMARY</div><div className="clinical-summary"><label>Presenting complaint</label><p>{patient.complaint}</p><label>History & management</label><p>{patient.history}</p></div></section>
                  <section className="drawer-section detail-list">
                    <div><span><AlertCircle size={15} />Allergies</span><b className={!patient.allergies.includes('No known allergies') ? 'allergy-text' : ''}>{patient.allergies.join(', ')}</b></div>
                    <div><span><BedDouble size={15} />Encounter type</span><b style={{ textTransform: 'capitalize' }}>{getEncounterType(patient)} · {patient.status === 'discharged' ? 'Completed episode' : 'Active episode'}</b></div>
                    <div><span><Stethoscope size={15} />Assigned clinician</span><b>{patient.assignedTo}</b></div>
                    <div><span><Clock3 size={15} />Arrival</span><b>{formatDate(patient.arrival)} · {formatTime(patient.arrival)}</b></div>
                    <div><span><Activity size={15} />Acuity rationale</span><b>{patient.esiOverride || `${patient.resources} anticipated resources${patient.riskFactors.length ? ` · ${patient.riskFactors.join(', ')}` : ''}`}</b></div>
                  </section>
                  {ownsPatient && can('discharge') && patient.status !== 'discharged' && <button className="discharge-link" onClick={() => setDischargeOpen(true)}>Complete episode & discharge patient<ArrowRight size={15} /></button>}
                </>}

                {tab === 'orders' && <section className="drawer-section"><div className="section-label"><ClipboardList size={15} />DIAGNOSTICS & CLINICAL ORDERS</div>
                  {patientOrders.length === 0 ? <div className="drawer-empty"><ClipboardList size={25} /><p>No orders on this episode yet.</p>{ownsPatient && (profile?.id === 'physician' || profile?.id === 'administrator') && <Button size="sm" icon={Plus} onClick={() => setOrderOpen(true)}>Place first order</Button>}</div> : <div className="clinical-card-list">{patientOrders.map((order) => <article key={order.id} className="clinical-list-card"><div className="clinical-card-top"><span className="order-kind">{order.kind}</span><StatusBadge status={order.status} /></div><h3>{order.title}</h3><p>{order.id} · {order.createdBy} · {relativeTime(order.createdAt)}</p>{order.result && <div className="result-box"><b>Verified result</b><p>{order.result}</p></div>}{can('results') && (profile?.id === 'administrator' || order.department === profile?.department) && order.status !== 'completed' && <div className="card-action-row">{order.status === 'ordered' ? <Button size="sm" variant="secondary" onClick={() => updateOrder(order.id, 'in-progress')}>Start {order.kind === 'Medication' ? 'preparation' : 'study'}<ArrowRight size={14} /></Button> : <Button size="sm" onClick={() => setResultOrder(order)}>Enter result<FileText size={14} /></Button>}</div>}</article>)}</div>}
                </section>}

                {tab === 'referrals' && <section className="drawer-section"><div className="section-label"><Network size={15} />INTERDEPARTMENTAL REFERRALS</div>
                  {patientReferrals.length === 0 ? <div className="drawer-empty"><Network size={25} /><p>No referrals on this episode yet.</p>{canReferPatient && <Button size="sm" icon={Plus} onClick={() => setReferralOpen(true)}>Request consultation</Button>}</div> : <div className="clinical-card-list">{patientReferrals.map((referral) => {
                    const receiving = state.departments.find((item) => item.id === referral.to)
                    const sending = state.departments.find((item) => item.id === referral.from)
                    const ownsReferral = profile?.department === referral.to || profile?.id === 'administrator'
                    return <article key={referral.id} className="clinical-list-card"><div className="clinical-card-top"><span className={`priority-label priority-${referral.priority}`}>{referral.priority}</span><StatusBadge status={referral.status} /></div><div className="referral-route"><span><DepartmentIcon id={referral.from} size={16} />{sending?.shortName}</span><ArrowRight size={15} /><span><DepartmentIcon id={referral.to} size={16} />{receiving?.shortName}</span></div><p className="referral-reason">{referral.reason}</p><p>{referral.id} · {referral.createdBy} · {relativeTime(referral.createdAt)}</p>{referral.recommendation && <div className="result-box"><b>Recommendation</b><p>{referral.recommendation}</p></div>}{ownsReferral && ['pending', 'accepted'].includes(referral.status) && <div className="card-action-row">{referral.status === 'pending' ? <><Button size="sm" onClick={() => updateReferral(referral.id, 'accepted')}>Accept<Check size={14} /></Button><Button size="sm" variant="ghost" onClick={() => updateReferral(referral.id, 'declined', 'Declined after record review. Sending team asked to clarify the clinical question and resubmit if needed.')}>Decline</Button></> : <Button size="sm" onClick={() => setCompleteReferral(referral)}>Complete consultation<Check size={14} /></Button>}</div>}</article>
                  })}</div>}
                </section>}

                {tab === 'timeline' && <section className="drawer-section"><div className="section-label"><Clock3 size={15} />COMPLETE EPISODE TIMELINE<span>{patient.timeline.length} events</span></div><div className="patient-timeline">{[...patient.timeline].sort((a, b) => b.at.localeCompare(a.at)).map((event) => <article key={event.id}><div className={`timeline-icon timeline-${event.type}`}>{event.type === 'triage' ? <Activity size={15} /> : event.type === 'transfer' ? <BedDouble size={15} /> : event.type === 'referral' ? <Network size={15} /> : event.type === 'order' || event.type === 'result' ? <FlaskConical size={15} /> : event.type === 'note' ? <MessageSquareText size={15} /> : <UserRound size={15} />}</div><div><span>{formatDate(event.at)} · {formatTime(event.at)}</span><h3>{event.title}</h3><p>{event.detail}</p><small>{event.author}</small></div></article>)}</div></section>}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="drawer-footer"><span><span className="live-dot" />Updates shared across departments</span><b>{statusLabels[patient.status]}</b></div>
        </motion.aside>
      </motion.div>}
    </AnimatePresence>

    {patient && <>
      <RetriageModal patient={patient} open={retriageOpen} onClose={() => setRetriageOpen(false)} />
      <ReferralModal patient={patient} open={referralOpen} onClose={() => setReferralOpen(false)} />
      <OrderModal patient={patient} open={orderOpen} onClose={() => setOrderOpen(false)} />
      <TransferModal patient={patient} open={transferOpen} onClose={() => setTransferOpen(false)} />
      <Modal open={dischargeOpen} onClose={() => setDischargeOpen(false)} title="Complete this clinical episode?" subtitle={`${patient.name} · ${patient.mrn}`} size="sm"><div className="confirm-copy"><span><Check size={23} /></span><p>This records the patient as discharged, updates department capacity and retains the full episode in the record archive.</p></div><div className="modal-footer"><Button variant="ghost" onClick={() => setDischargeOpen(false)}>Keep episode open</Button><Button onClick={() => { dischargePatient(patient.id); setDischargeOpen(false) }}>Confirm discharge<Check size={16} /></Button></div></Modal>
    </>}
    {resultOrder && <ResultModal order={resultOrder} open={!!resultOrder} onClose={() => setResultOrder(null)} />}
    {completeReferral && <CompleteReferralModal referral={completeReferral} open={!!completeReferral} onClose={() => setCompleteReferral(null)} />}
  </>
}