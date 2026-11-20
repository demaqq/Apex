import { useState } from 'react'
import { Link2, Plus, X } from 'lucide-react'
import { careLinks, type LinkReason } from '../lib/access'
import { departmentById } from '../data'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId, Patient } from '../types'
import { Button, Chip, DepartmentIcon } from './ui'

const REASON_TONE: Record<LinkReason, 'accent' | 'success' | 'warning' | 'neutral' | 'danger'> = { Assigned: 'accent', OPD: 'accent', Consultation: 'warning', Comorbidity: 'success', 'Shared care': 'neutral', 'Theatre list': 'warning', 'Emergency access': 'danger' }

/** Which departments can see this patient, and why. */
export function CareTeam({ patient }: { patient: Patient }) {
  const { state, can, linkDepartment, unlinkDepartment } = useHospital()
  const [adding, setAdding] = useState(false)
  const [department, setDepartment] = useState<DepartmentId>('internal-medicine')
  const [reason, setReason] = useState<'Comorbidity' | 'Shared care'>('Comorbidity')
  const [note, setNote] = useState('')
  const links = careLinks(patient, state.referrals, state.theatreCases)
  const departments = [...new Set(links.map((link) => link.department))]
  const canEdit = can('clinical-notes') && patient.status !== 'discharged'
  const options = state.departments.filter((d) => d.active !== false && !departments.includes(d.id) && !['laboratory', 'radiology', 'pharmacy'].includes(d.id))

  return (
    <section className="drawer-section">
      <div className="section-label"><Link2 size={15} />Care team<span>Departments that can see this record</span></div>
      <ul className="care-team">
        {departments.map((id) => {
          const reasons = links.filter((link) => link.department === id)
          const manual = patient.links?.find((link) => link.department === id)
          return (
            <li key={id}>
              <DepartmentIcon id={id} size={15} />
              <b>{departmentById(state.departments, id).name}</b>
              <span className="care-reasons">{reasons.map((link) => <Chip key={link.reason} tone={REASON_TONE[link.reason]}>{link.reason === 'Assigned' ? (patient.status === 'admitted' ? 'Ward' : patient.visit?.type === 'OPD' ? 'OPD' : 'Assigned') : link.reason}{link.reason === 'Comorbidity' || link.reason === 'Shared care' ? ` · ${link.detail}` : ''}</Chip>)}</span>
              {manual && canEdit && <button type="button" className="icon-button" aria-label={`Remove ${departmentById(state.departments, id).name} from the care team`} onClick={() => unlinkDepartment(patient.id, id)}><X size={14} /></button>}
            </li>
          )
        })}
      </ul>
      {canEdit && !adding && <Button size="sm" variant="ghost" icon={Plus} onClick={() => { setAdding(true); setDepartment(options[0]?.id ?? 'internal-medicine') }}>Link a department</Button>}
      {adding && (
        <div className="review-box">
          <div className="form-grid form-grid-2">
            <label className="form-field"><span>Department</span><select value={department} onChange={(e) => setDepartment(e.target.value as DepartmentId)}>{options.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label className="form-field"><span>Reason</span><select value={reason} onChange={(e) => setReason(e.target.value as 'Comorbidity' | 'Shared care')}><option>Comorbidity</option><option>Shared care</option></select></label>
            <label className="form-field span-2"><span>{reason === 'Comorbidity' ? 'Condition' : 'Agreement'}</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === 'Comorbidity' ? 'e.g. Type 2 diabetes on insulin' : 'e.g. Joint care with surgery after the fracture'} /></label>
          </div>
          <div className="card-action-row"><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button size="sm" icon={Link2} disabled={note.trim().length < 3} onClick={() => { linkDepartment(patient.id, department, reason, note.trim()); setAdding(false); setNote('') }}>Link</Button></div>
        </div>
      )}
      <p className="record-hint">Doctors and nurses see a patient when they sign in to a linked department. Comorbidity links come from the risk factors automatically; consultations come from referrals.</p>
    </section>
  )
}
