import { motion } from 'framer-motion'
import { AlertTriangle, ClipboardList, Stethoscope, UsersRound } from 'lucide-react'
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
