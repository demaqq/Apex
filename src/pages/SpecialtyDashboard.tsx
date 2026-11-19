import { motion } from 'framer-motion'
import { AlertTriangle, ClipboardList, Stethoscope, Timer, Utensils, UsersRound } from 'lucide-react'
import { partograph, samSummary } from '../lib/charts'
import type { Patient } from '../types'
import { Chip, EmptyState, Metric, NewsChip, PageHeader, Panel, PersonCell } from '../components/ui'
import { departmentById } from '../data'
import { patientAlerts } from '../lib/clinical'
import { formatDateTime } from '../lib/format'
import { SPECIALTY, specialtyFor } from '../lib/specialty'
import { useHospital } from '../store/HospitalStore'

/** Department dashboard with the department's specialty assessment (Selam “Department dashboard”). */
export default function SpecialtyDashboard() {
  const { state, profile, setSelectedPatientId } = useHospital()
  const departmentId = profile?.department ?? ''
  const config = SPECIALTY[departmentId]
  const department = departmentById(state.departments, departmentId)
  if (!config) return <Panel><EmptyState icon={Stethoscope} title="No specialty assessment for this department" text="Obstetrics, cardiology, emergency, intensive care, surgery, ENT and ophthalmology have department dashboards." /></Panel>

  const patients = state.patients.filter((patient) => patient.department === departmentId && patient.status !== 'discharged')
  const rows = patients.map((patient) => ({ patient, alerts: patientAlerts(patient, state.orders), specialty: specialtyFor(patient) }))
    .sort((a, b) => b.alerts.length - a.alerts.length)
  const openOrders = state.orders.filter((order) => order.status !== 'completed' && patients.some((patient) => patient.id === order.patientId)).length

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow={`${department.name} · Department dashboard`} title={config.title} description={config.worklist} />
      <div className="metrics-grid">
        <Metric label="Active patients" value={patients.length} detail={`In ${department.shortName}`} icon={UsersRound} tone="teal" />
        <Metric label="Needing review" value={rows.filter((row) => row.alerts.length).length} detail="With at least one alert" icon={AlertTriangle} tone="coral" />
        <Metric label="Open orders" value={openOrders} detail="Not yet resulted" icon={ClipboardList} tone="amber" />
        <Metric label="Assessed" value={rows.filter((row) => row.specialty.latest).length} detail={`With a ${config.title.toLowerCase()}`} icon={Stethoscope} tone="blue" />
      </div>
      {departmentId === 'obgyn' && <LabourBoard patients={patients} onOpen={setSelectedPatientId} />}
      {departmentId === 'pediatrics' && <SamBoard patients={patients} onOpen={setSelectedPatientId} />}
      <Panel title={config.worklist}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Location</th><th>{config.title}</th><th>Alerts</th></tr></thead>
            <tbody>
              {rows.map(({ patient, alerts, specialty }) => (
                <tr key={patient.id} className="clickable-row" onClick={() => setSelectedPatientId(patient.id)}>
                  <td><PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.age} y`} /></td>
                  <td>{patient.location}</td>
                  <td className="wrap">{specialty.latest ? <>{specialty.chips.map(([label, tone]) => <Chip key={label} tone={tone}>{label}</Chip>)}<small>{formatDateTime(specialty.latest.at)}</small></> : <span className="muted-text">Not assessed — open the record’s Assessment tab</span>}<NewsChip patient={patient} /></td>
                  <td className="wrap">{alerts.length ? alerts.map((alert) => <small key={alert.text} className={alert.tone === 'danger' ? 'danger-text' : ''}>• {alert.text}</small>) : <span className="muted-text">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <EmptyState icon={UsersRound} title="No active patients" text="Patients in this department appear here." />}
      </Panel>
    </motion.div>
  )
}

function LabourBoard({ patients, onOpen }: { patients: Patient[]; onOpen: (id: string) => void }) {
  const labouring = patients.map((patient) => ({ patient, p: partograph(patient.charts?.labour ?? []) })).filter((row) => row.p)
  return (
    <Panel title="Labour ward · women with an open partograph">
      {labouring.length === 0 ? <EmptyState icon={Timer} title="No one in labour" text="Start a partograph from the record’s Charts tab." /> : (
        <div className="board-cards">
          {labouring.map(({ patient, p }) => {
            const entries = [...(patient.charts?.labour ?? [])].reverse()
            const fhr = entries.find((e) => e.fhr !== undefined); const ctx = entries.find((e) => e.contractions !== undefined)
            return (
              <button key={patient.id} type="button" className={`board-card tone-${p!.line === 'action' ? 'danger' : p!.line === 'alert' ? 'warning' : 'success'}`} onClick={() => onOpen(patient.id)}>
                <header><b>{patient.name}</b><span>{patient.location}</span></header>
                <div className="board-metrics">
                  <span><small>Cervix</small><b>{p!.latestDilation ? `${p!.latestDilation.dilationCm} cm` : '–'}</b></span>
                  <span><small>FHR</small><b className={fhr && (Number(fhr.fhr) < 110 || Number(fhr.fhr) > 160) ? 'danger-text' : ''}>{fhr?.fhr ?? '–'}</b></span>
                  <span><small>Contractions</small><b>{ctx ? `${ctx.contractions}/10′` : '–'}</b></span>
                  <span><small>Active labour</small><b>{p!.active ? `${p!.hoursActive.toFixed(1)} h` : 'Latent'}</b></span>
                </div>
                <Chip tone={p!.line === 'action' ? 'danger' : p!.line === 'alert' ? 'warning' : 'success'}>{p!.line === 'on track' ? 'Progress on track' : p!.line === 'alert' ? 'Right of alert line' : 'Action line crossed'}</Chip>
                {p!.flags.filter((f) => f.tone === 'danger').map((f) => <small key={f.text} className="danger-text">• {f.text}</small>)}
              </button>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function SamBoard({ patients, onOpen }: { patients: Patient[]; onOpen: (id: string) => void }) {
  const rows = patients.map((patient) => ({ patient, s: samSummary(patient.charts?.sam ?? []) })).filter((row) => row.s)
  return (
    <Panel title="SAM unit · children on therapeutic feeding">
      {rows.length === 0 ? <EmptyState icon={Utensils} title="No children on the SAM chart" text="Start one from the record’s Charts tab." /> : (
        <div className="board-cards">
          {rows.map(({ patient, s }) => (
            <button key={patient.id} type="button" className={`board-card tone-${s!.flags.some((f) => f.tone === 'danger') ? 'danger' : s!.readyForDischarge ? 'success' : 'neutral'}`} onClick={() => onOpen(patient.id)}>
              <header><b>{patient.name}</b><span>{patient.age} y · {patient.location}</span></header>
              <div className="board-metrics">
                <span><small>Day</small><b>{s!.day}</b></span>
                <span><small>Phase</small><b>{s!.latest.phase}</b></span>
                <span><small>Weight</small><b>{s!.latest.weightKg} kg</b></span>
                <span><small>Target</small><b>{s!.target} kg</b></span>
                <span><small>Gain</small><b>{s!.gain === null ? '–' : `${s!.gain.toFixed(1)} g/kg/d`}</b></span>
                <span><small>Oedema</small><b>{s!.latest.oedema === '0' ? 'None' : s!.latest.oedema}</b></span>
              </div>
              <small className="muted-text">{s!.plan.text}</small>
              {s!.flags.filter((f) => f.tone === 'danger').map((f) => <small key={f.text} className="danger-text">• {f.text}</small>)}
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}
