import { motion } from 'framer-motion'
import { AlertTriangle, ClipboardCheck, Droplets, PackageCheck, Syringe } from 'lucide-react'
import { Button, Chip, EmptyState, Metric, OrderStepper, PageHeader, Panel, PersonCell } from '../components/ui'
import { formatTime, relativeTime } from '../lib/format'
import { orderStage } from '../lib/clinical'
import { useNow, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'

/** Medication and transfusion round: administer dispensed medicines and issued blood. */
export default function MedRound() {
  const { state, profile, can, setPrescriptionStatus, advanceOrder, setSelectedPatientId } = useHospital()
  const patients = usePatients()
  const now = useNow()
  const mine = (patientId: string) => profile?.id === 'administrator' || patients.get(patientId)?.department === profile?.department || profile?.id === 'physician'
  const medicines = new Map(state.formulary.map((item) => [item.id, item]))
  const ready = state.prescriptions.filter((rx) => rx.status === 'Dispensed' && mine(rx.patientId))
  const waiting = state.prescriptions.filter((rx) => ['Pending', 'Verified'].includes(rx.status) && mine(rx.patientId))
  const given = state.prescriptions.filter((rx) => rx.status === 'Administered' && mine(rx.patientId))
  const blood = state.orders.filter((order) => order.kind === 'Blood bank' && order.status !== 'completed')
  const canGive = can('administer') || can('manage')

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Nursing · Medication administration" title="Medication round" description="Give dispensed medicines and issued blood products, and record each administration." />
      <div className="metrics-grid">
        <Metric label="Ready to give" value={ready.length} detail="Dispensed by pharmacy" icon={Syringe} tone="teal" />
        <Metric label="With pharmacy" value={waiting.length} detail="Awaiting verification or dispensing" icon={PackageCheck} tone="amber" />
        <Metric label="Given this episode" value={given.length} detail="Recorded administrations" icon={ClipboardCheck} tone="blue" />
        <Metric label="Blood products" value={blood.length} detail="Requests in progress" icon={Droplets} tone="coral" />
      </div>

      <Panel title="Due now">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Medicine</th><th>Allergies</th><th>Dispensed</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {ready.map((rx) => {
                const patient = patients.get(rx.patientId)
                const allergies = patient?.allergies.filter((allergy) => !/no known|not yet/i.test(allergy)) ?? []
                return (
                  <tr key={rx.id}>
                    <td>{patient && <PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.location}`} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                    <td className="wrap">{rx.items.map((item) => <div key={item.medicationId}><b>{medicines.get(item.medicationId)?.name} {item.dosage}</b><small>{medicines.get(item.medicationId)?.route} · {item.frequency}</small></div>)}</td>
                    <td>{allergies.length ? <Chip tone="danger"><AlertTriangle size={12} />{allergies.join(', ')}</Chip> : <span className="muted-text">None known</span>}</td>
                    <td>{rx.dispensedBy ?? 'Pharmacy'}<small className="mono">{rx.id}</small></td>
                    <td className="row-actions">{canGive ? <Button size="sm" icon={Syringe} onClick={() => setPrescriptionStatus(rx.id, 'Administered')}>Record given</Button> : <span className="muted-text">Nurse to give</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {ready.length === 0 && <EmptyState icon={ClipboardCheck} title="Nothing due" text="Dispensed medicines for your unit appear here." />}
      </Panel>

      <Panel title="Blood and transfusion">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Request</th><th>Progress</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {blood.map((order) => {
                const patient = patients.get(order.patientId)
                const issued = orderStage(order) === 3
                return (
                  <tr key={order.id}>
                    <td>{patient && <PersonCell name={patient.name} detail={patient.mrn} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                    <td className="wrap"><b>{order.title}</b><small>{order.createdBy} · {relativeTime(order.createdAt, now)}</small></td>
                    <td><OrderStepper order={order} /></td>
                    <td className="row-actions">{issued && canGive ? <Button size="sm" icon={Droplets} onClick={() => advanceOrder(order.id)}>Mark transfused</Button> : <span className="muted-text">{issued ? 'Ready to transfuse' : 'With blood bank'}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {blood.length === 0 && <p className="table-footnote">No blood product requests.</p>}
      </Panel>

      {given.length > 0 && (
        <Panel title="Administered">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Patient</th><th>Medicine</th><th>Given</th></tr></thead>
              <tbody>{given.map((rx) => <tr key={rx.id}><td>{patients.get(rx.patientId)?.name}</td><td>{rx.items.map((item) => `${medicines.get(item.medicationId)?.name} ${item.dosage}`).join(', ')}</td><td>{rx.administrations?.map((dose) => `${formatTime(dose.at)} · ${dose.by}`).join('; ')}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      )}
    </motion.div>
  )
}
