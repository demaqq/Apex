import { useState } from 'react'
import { motion } from 'framer-motion'
import { Apple, ArrowRight, Droplets, Dumbbell, Plus } from 'lucide-react'
import { OrderModal } from '../components/ClinicalModals'
import { Button, Chip, EmptyState, Metric, OrderStepper, PageHeader, Panel, PersonCell, Tabs } from '../components/ui'
import { stagesFor, SERVICE_KINDS, canAdvanceOrder, orderStage } from '../lib/clinical'
import { relativeTime } from '../lib/format'
import { useNow, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { OrderKind } from '../types'

/** Physiotherapy, nutrition and blood bank worklist (Selam service worklist). */
export default function Services() {
  const { state, currentRole, can, advanceOrder, setSelectedPatientId } = useHospital()
  const patients = usePatients()
  const now = useNow()
  const [kind, setKind] = useState<OrderKind>('Physiotherapy')
  const [requesting, setRequesting] = useState(false)
  const orders = state.orders.filter((order) => order.kind === kind).sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.createdAt.localeCompare(b.createdAt))
  const open = (value: OrderKind) => state.orders.filter((order) => order.kind === value && order.status !== 'completed').length
  const canRequest = can('prescribe') || can('refer') || can('manage') || can('triage')

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Allied health · Blood bank" title="Therapy & blood bank" description="Requests for physiotherapy, nutrition and blood products, from request to completion." actions={canRequest ? <Button icon={Plus} onClick={() => setRequesting(true)}>New {kind.toLowerCase()} request</Button> : undefined} />
      <div className="metrics-grid">
        <Metric label="Physiotherapy" value={open('Physiotherapy')} detail="Open requests" icon={Dumbbell} tone="teal" />
        <Metric label="Nutrition" value={open('Nutrition')} detail="Open requests" icon={Apple} tone="green" />
        <Metric label="Blood bank" value={open('Blood bank')} detail="Requests in progress" icon={Droplets} tone="coral" />
        <Metric label="Completed" value={state.orders.filter((order) => SERVICE_KINDS.includes(order.kind) && order.status === 'completed').length} detail="Across all three services" icon={ArrowRight} tone="blue" />
      </div>
      <Tabs<OrderKind> label="Service" value={kind} onChange={setKind} options={SERVICE_KINDS.map((value) => ({ value, label: value, count: open(value) }))} />
      <Panel>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>Request</th><th>Priority</th><th>Progress</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {orders.map((order) => {
                const patient = patients.get(order.patientId)
                const stage = orderStage(order)
                return (
                  <tr key={order.id}>
                    <td>{patient && <PersonCell name={patient.name} detail={`${patient.mrn} · ${patient.location}`} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                    <td className="wrap"><b>{order.title}</b><small>{order.createdBy} · {relativeTime(order.createdAt, now)}</small></td>
                    <td><span className={`priority-label priority-${order.priority}`}>{order.priority}</span></td>
                    <td><OrderStepper order={order} /></td>
                    <td className="row-actions">{currentRole && canAdvanceOrder(order, currentRole) ? <Button size="sm" variant="secondary" icon={ArrowRight} onClick={() => advanceOrder(order.id)}>Mark {stagesFor(order)[stage + 1].toLowerCase()}</Button> : order.status === 'completed' ? <Chip tone="success">Complete</Chip> : <span className="muted-text">{kind === 'Blood bank' && stage === 3 ? 'Ward to transfuse' : 'With the service'}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && <EmptyState icon={Dumbbell} title={`No ${kind.toLowerCase()} requests`} text="Requests from any ward appear here." />}
      </Panel>
      {canRequest && <OrderModal open={requesting} onClose={() => setRequesting(false)} kind={kind} />}
    </motion.div>
  )
}
