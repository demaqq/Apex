import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Chip, DepartmentIcon, PageHeader, Panel } from '../components/ui'
import { departmentById } from '../data'
import { observationFlags } from '../lib/clinical'
import { relativeTime } from '../lib/format'
import { useNow, useRedact } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'

/** Live map of how patients move through the hospital, with animated pathways. */
export default function CareFlow() {
  const { state, setSelectedPatientId } = useHospital()
  const navigate = useNavigate()
  const now = useNow()
  const redact = useRedact()
  const open = (kind: string) => state.orders.filter((order) => order.kind === kind && order.status !== 'completed').length
  const inpatients = state.patients.filter((patient) => ['admitted', 'observation'].includes(patient.status))
  const abnormal = inpatients.filter((patient) => observationFlags(patient.vitals, patient.age).length).length
  const cases = state.theatreCases

  const nodes: Array<{ to: string; x: number; y: number; title: string; value: number; sub: string; alert?: boolean }> = [
    { to: '/front-desk', x: 20, y: 150, title: 'Front desk', value: state.patients.filter((p) => p.status === 'awaiting-triage').length, sub: 'awaiting triage' },
    { to: '/triage', x: 210, y: 150, title: 'Triage', value: state.patients.filter((p) => p.status === 'waiting').length, sub: 'waiting for doctor' },
    { to: '/beds', x: 400, y: 150, title: 'Wards and clinics', value: inpatients.length, sub: `${abnormal} abnormal obs`, alert: abnormal > 0 },
    { to: '/lab-imaging', x: 590, y: 10, title: 'Laboratory', value: open('Laboratory'), sub: 'open requests' },
    { to: '/lab-imaging', x: 590, y: 100, title: 'Imaging', value: open('Imaging'), sub: 'open studies' },
    { to: '/pharmacy', x: 590, y: 190, title: 'Pharmacy', value: state.prescriptions.filter((rx) => ['Pending', 'Verified'].includes(rx.status)).length, sub: 'to verify or dispense' },
    { to: '/theatres', x: 400, y: 290, title: 'Operating theatres', value: cases.filter((c) => c.stage === 2).length, sub: `${cases.filter((c) => c.stage < 2).length} scheduled` },
    { to: '/theatres', x: 590, y: 290, title: 'Recovery to ward', value: cases.filter((c) => c.stage === 3).length, sub: `${cases.filter((c) => c.stage === 4).length} handed over` },
  ]
  const edges = [[170, 185, 210, 185], [360, 185, 400, 185], [550, 185, 590, 45], [550, 185, 590, 135], [550, 185, 590, 225], [475, 220, 475, 290], [550, 325, 590, 325]]

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Live · Patient flow" title="Care flow" description="How patients are moving through the hospital right now. Select a stage to open it." />
      <Panel>
        <div style={{ padding: 16 }}>
          <svg className="flow-map" viewBox="0 0 760 370" role="img" aria-label="Live patient flow between departments">
            {edges.map(([x1, y1, x2, y2], index) => <path key={index} className="flow-edge" d={`M${x1} ${y1}L${x2} ${y2}`} />)}
            {nodes.map((node) => (
              <g key={node.title} className={`flow-node ${node.alert ? 'alert' : ''}`} tabIndex={0} role="button" aria-label={`${node.title}: ${node.value} ${node.sub}`} transform={`translate(${node.x} ${node.y})`} onClick={() => navigate(node.to)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(node.to) }}>
                <rect width="150" height="70" rx="12" />
                <text x="14" y="22">{node.title}</text>
                <text className="n" x="14" y="52">{node.value}</text>
                <text className="s" x={String(node.value).length * 15 + 22} y="51">{node.sub}</text>
              </g>
            ))}
          </svg>
        </div>
      </Panel>
      <Panel title="Latest movements">
        <div className="activity-feed">
          {state.activities.slice(0, 8).map((activity) => (
            <button key={activity.id} onClick={() => activity.patientId && setSelectedPatientId(activity.patientId)}>
              <span className="activity-department"><DepartmentIcon id={activity.department} size={17} /></span>
              <div><p><b>{activity.actor}</b> {redact.text(activity.action)}</p><span>{relativeTime(activity.at, now)} · {departmentById(state.departments, activity.department).shortName}</span></div>
            </button>
          ))}
        </div>
        {state.activities.length === 0 && <p className="table-footnote">No activity yet.</p>}
      </Panel>
      <p className="table-footnote"><Chip tone="neutral">Tip</Chip> Press <span className="kbd">F</span> anywhere to open this map.</p>
    </motion.div>
  )
}
