import { useState } from 'react'
import { Hospital, Send } from 'lucide-react'
import { Button, Chip, Modal } from './ui'
import { connectedFor } from '../lib/network'
import { formatDateTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ExternalReferralStatus, Patient, Priority } from '../types'

const SHARE = ['Summary and history', 'Examination and plan', 'Vitals and charts', 'Results and images', 'Medicines and allergies']

export function ReferOutModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { state, referOut } = useHospital()
  const hospitals = connectedFor('Referrals', state.connections, state.network)
  const [facilityId, setFacilityId] = useState(hospitals[0]?.id ?? '')
  const [urgency, setUrgency] = useState<Priority>('urgent')
  const [reason, setReason] = useState('')
  const [shared, setShared] = useState<string[]>(SHARE)
  const target = hospitals.find((item) => item.id === facilityId)
  return (
    <Modal open onClose={onClose} title="Refer to another hospital" subtitle={`${patient.name} · through the Northstar care network`} size="md">
      {hospitals.length === 0 ? <p className="record-hint">No hospitals are connected for referrals yet. The administrator can connect one under Administration → Network &amp; connections.</p> : <>
        <div className="form-grid">
          <label className="form-field"><span>Hospital</span><select value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>{hospitals.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select>{target && <small className="muted-text">{target.capabilities}</small>}</label>
          <div className="form-field"><span>Urgency</span><div className="priority-control">{(['routine', 'urgent', 'emergent'] as Priority[]).map((value) => <button type="button" key={value} aria-pressed={urgency === value} className={urgency === value ? `active ${value}` : ''} onClick={() => setUrgency(value)}>{value}</button>)}</div></div>
          <label className="form-field"><span>Reason and question <b>*</b></span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. For cardiac catheterisation; NSTEMI not settling on medical therapy." /></label>
          <div className="form-field"><span>Share with the receiving team</span><div className="share-list">{SHARE.map((item) => <label key={item} className="remember-row"><input type="checkbox" checked={shared.includes(item)} onChange={() => setShared(shared.includes(item) ? shared.filter((value) => value !== item) : [...shared, item])} />{item}</label>)}</div></div>
        </div>
        <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Send} disabled={reason.trim().length < 8 || !facilityId} onClick={() => { referOut(patient.id, facilityId, reason, urgency, shared); onClose() }}>Send referral</Button></div>
      </>}
    </Modal>
  )
}

const TONE: Record<ExternalReferralStatus, 'warning' | 'success' | 'danger' | 'neutral'> = { Sent: 'warning', Accepted: 'success', Declined: 'danger', Transferred: 'neutral' }

/** Referrals to other hospitals for one patient. */
export function ExternalReferralList({ patient }: { patient: Patient }) {
  const { state, can, updateExternalReferral } = useHospital()
  const [response, setResponse] = useState('')
  const list = state.externalReferrals.filter((item) => item.patientId === patient.id)
  if (!list.length) return null
  return (
    <div className="external-referrals">
      <div className="section-label"><Hospital size={15} />OTHER HOSPITALS</div>
      {list.map((item) => {
        const facility = state.network.find((entry) => entry.id === item.facilityId)
        const next: ExternalReferralStatus[] = item.status === 'Sent' ? ['Accepted', 'Declined'] : item.status === 'Accepted' ? ['Transferred'] : []
        return (
          <article key={item.id} className="clinical-list-card">
            <div className="clinical-card-top"><span className={`priority-label priority-${item.urgency}`}>{item.urgency}</span><Chip tone={TONE[item.status]}>{item.status}</Chip></div>
            <b>{facility?.name ?? 'Network hospital'}</b>
            <p>{item.reason}</p>
            <small className="muted-text">{item.id} · {formatDateTime(item.at)} · {item.by} · shared {item.shared.join(', ').toLowerCase()}</small>
            {item.response && <p className="record-hint">Reply: {item.response}</p>}
            {can('refer') && next.length > 0 && <div className="referral-reply"><input value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Reply from the receiving hospital (optional)" aria-label="Reply" />{next.map((status) => <Button key={status} size="sm" variant={status === 'Declined' ? 'ghost' : 'secondary'} onClick={() => { updateExternalReferral(item.id, status, response); setResponse('') }}>Mark {status.toLowerCase()}</Button>)}</div>}
          </article>
        )
      })}
    </div>
  )
}
