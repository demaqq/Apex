import { useState } from 'react'
import { motion } from 'framer-motion'
import { BedDouble, BedSingle, Ban, Sparkles } from 'lucide-react'
import { Chip, DepartmentIcon, FilterSelect, Metric, NewsChip, PageHeader, Panel, Tabs } from '../components/ui'
import { departmentById } from '../data'
import { useHospital } from '../store/HospitalStore'
import type { BedState } from '../types'

const STATES: BedState[] = ['Available', 'Reserved', 'Blocked', 'Cleaning', 'Out of service']
const stateTone = (state: BedState) => state === 'Available' ? 'success' : state === 'Cleaning' ? 'warning' : 'neutral'

/** Bed-by-bed board per ward, as in Selam. */
export default function BedBoard() {
  const { state, profile, can, setBedState, setSelectedPatientId } = useHospital()
  const [scope, setScope] = useState<'mine' | 'all'>(profile && state.wards.some((ward) => ward.department === profile.department) && profile.id !== 'administrator' && profile.id !== 'coordinator' ? 'mine' : 'all')
  const [filter, setFilter] = useState('all')
  const canEdit = can('beds')
  const patients = new Map(state.patients.map((patient) => [patient.id, patient]))
  const wards = state.wards.filter((ward) => scope === 'all' || ward.department === profile?.department)
  const beds = state.beds.filter((bed) => wards.some((ward) => ward.id === bed.wardId))
  const occupied = beds.filter((bed) => bed.patientId).length
  const available = beds.filter((bed) => !bed.patientId && bed.state === 'Available').length
  const cleaning = beds.filter((bed) => !bed.patientId && bed.state === 'Cleaning').length

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Wards · Live" title="Bed board" description="Every bed, who is in it, and which ones are ready for the next patient." />
      <div className="metrics-grid">
        <Metric label="Occupied" value={occupied} detail={`${Math.round(occupied / Math.max(1, beds.length) * 100)}% of ${beds.length} beds`} icon={BedDouble} tone="coral" progress={occupied / Math.max(1, beds.length) * 100} />
        <Metric label="Available" value={available} detail="Clean and ready" icon={BedSingle} tone="green" />
        <Metric label="Being cleaned" value={cleaning} detail="Turned over after discharge or transfer" icon={Sparkles} tone="amber" />
        <Metric label="Reserved or blocked" value={beds.length - occupied - available - cleaning} detail="Reserved, blocked or out of service" icon={Ban} tone="blue" />
      </div>
      <div className="toolbar-row">
        {profile && state.wards.some((ward) => ward.department === profile.department) && <Tabs<'mine' | 'all'> label="Ward scope" value={scope} onChange={setScope} options={[{ value: 'mine', label: `${departmentById(state.departments, profile.department).shortName} wards` }, { value: 'all', label: 'All wards' }]} />}
        <FilterSelect label="All beds" value={filter} onChange={setFilter} options={[{ value: 'occupied', label: 'Occupied' }, ...STATES.map((value) => ({ value, label: value }))]} />
      </div>
      {wards.map((ward) => {
        const wardBeds = state.beds.filter((bed) => bed.wardId === ward.id).filter((bed) => filter === 'all' || (filter === 'occupied' ? bed.patientId : !bed.patientId && bed.state === filter))
        if (!wardBeds.length) return null
        const used = state.beds.filter((bed) => bed.wardId === ward.id && bed.patientId).length
        return (
          <Panel key={ward.id} title={ward.name} action={<span className="inline-icon muted-text"><DepartmentIcon id={ward.department} size={15} /><span className="mono">{used}/{ward.beds} occupied</span></span>}>
            <div className="bed-grid">
              {wardBeds.map((bed) => {
                const patient = bed.patientId ? patients.get(bed.patientId) : undefined
                return (
                  <div key={bed.id} className={`bed-tile ${patient ? 'occupied' : `state-${bed.state.toLowerCase().replace(/\s+/g, '-')}`}`}>
                    <b className="mono">Bed {String(bed.number).padStart(2, '0')}</b>
                    {patient
                      ? <><button type="button" className="link-button" onClick={() => setSelectedPatientId(patient.id)}>{patient.name}</button><span className="bed-meta"><span className="mono">{patient.mrn}</span><NewsChip patient={patient} /></span></>
                      : canEdit
                        ? <select aria-label={`State of ${ward.name} bed ${bed.number}`} value={bed.state} onChange={(event) => setBedState(bed.id, event.target.value as BedState)}>{STATES.map((value) => <option key={value}>{value}</option>)}</select>
                        : <Chip tone={stateTone(bed.state)}>{bed.state}</Chip>}
                  </div>
                )
              })}
            </div>
          </Panel>
        )
      })}
      <p className="table-footnote">Transfers and discharges free the old bed and set it to cleaning automatically.</p>
    </motion.div>
  )
}
