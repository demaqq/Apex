import { motion } from 'framer-motion'
import { AlertTriangle, BedDouble, ClipboardList, FlaskConical, Hourglass, Pill, ScanLine, Scissors, Siren, UserCheck } from 'lucide-react'
import { Chip, EsiBadge, Metric, PageHeader, Panel, PersonCell } from '../components/ui'
import { esiLabels } from '../data'
import { ESI_TARGET_MINUTES, patientNews2 } from '../lib/clinical'
import { minutesSince } from '../lib/format'
import { useNow } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'

/** Hospital-wide operations view with the ED scoreboard against ESI target times. */
export default function OpsCenter() {
  const { state, setSelectedPatientId } = useHospital()
  const now = useNow()
  const active = state.patients.filter((patient) => patient.status !== 'discharged')
  const inpatients = active.filter((patient) => ['admitted', 'observation'].includes(patient.status))
  const occupied = state.beds.filter((bed) => bed.patientId).length
  const awaiting = active.filter((patient) => patient.status === 'awaiting-triage')
  const ready = active.filter((patient) => patient.status === 'waiting')
  const highNews = inpatients.filter((patient) => (patientNews2(patient)?.score ?? 0) >= 5)
  const counts = [1, 2, 3, 4, 5].map((level) => active.filter((patient) => patient.esi === level && patient.status !== 'awaiting-triage').length)
  const max = Math.max(1, ...counts)
  const board = [...awaiting, ...ready].sort((a, b) => (a.status === 'awaiting-triage' ? 9 : a.esi) - (b.status === 'awaiting-triage' ? 9 : b.esi) || minutesSince(b.arrival, now) - minutesSince(a.arrival, now))
  const openOrders = (kind: string) => state.orders.filter((order) => order.kind === kind && order.status !== 'completed').length

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Operations · Live" title="Operations center" description="Capacity, acuity and waiting times across the hospital." />
      <div className="metrics-grid">
        <Metric label="Bed occupancy" value={`${Math.round(occupied / Math.max(1, state.beds.length) * 100)}%`} detail={`${occupied} of ${state.beds.length} beds · ${inpatients.length} inpatients`} icon={BedDouble} tone="blue" progress={occupied / Math.max(1, state.beds.length) * 100} />
        <Metric label="Awaiting triage" value={awaiting.length} detail="Registered at the front desk" icon={Hourglass} tone="amber" />
        <Metric label="Ready for doctor" value={ready.length} detail="Triaged and waiting" icon={UserCheck} tone="teal" />
        <Metric label="NEWS2 of 5 or more" value={highNews.length} detail={`${state.codes.filter((code) => code.active).length} active emergency codes`} icon={AlertTriangle} tone="coral" />
      </div>

      <Panel title="Triage acuity of active patients">
        <div style={{ padding: '6px 18px 16px', display: 'grid', gap: 10 }}>
          {counts.map((count, index) => {
            const level = index + 1
            return (
              <div key={level} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 30px', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13 }}>ESI {level} · {esiLabels[level].name}</span>
                <div style={{ height: 12, borderRadius: 6, background: 'var(--sunken)' }}><motion.div initial={{ width: 0 }} animate={{ width: `${count / max * 100}%` }} transition={{ duration: 0.6 }} style={{ height: 12, borderRadius: 6, background: esiLabels[level].color }} /></div>
                <b className="mono" style={{ textAlign: 'right' }}>{count}</b>
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="ED scoreboard: waiting patients against target times">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Patient</th><th>ESI</th><th>Stage</th><th className="num">Waiting</th><th className="num">Target</th><th>Status</th></tr></thead>
            <tbody>
              {board.map((patient) => {
                const waited = minutesSince(patient.arrival, now)
                const triaged = patient.status !== 'awaiting-triage'
                const target = triaged ? ESI_TARGET_MINUTES[patient.esi] : null
                const over = target !== null && waited > target
                return (
                  <tr key={patient.id} className="clickable-row" onClick={() => setSelectedPatientId(patient.id)}>
                    <td><PersonCell name={patient.name} detail={patient.mrn} /></td>
                    <td>{triaged ? <EsiBadge level={patient.esi} compact /> : <Chip tone="warning">Not triaged</Chip>}</td>
                    <td>{triaged ? `Ready for doctor · ${patient.location}` : 'Awaiting triage'}</td>
                    <td className="num mono">{waited} min</td>
                    <td className="num mono">{target === null ? '–' : target === 0 ? 'Immediate' : `${target} min`}</td>
                    <td>{target === null ? null : <Chip tone={over ? 'danger' : 'success'}>{over ? 'Over target' : 'Within target'}</Chip>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {board.length === 0 && <p className="table-footnote">No patients waiting.</p>}
        <p className="table-footnote">Targets: ESI 1 immediate, 2 within 10 min, 3 within 30, 4 within 60, 5 within 120. Untriaged waits are measured from registration.</p>
      </Panel>

      <div className="metrics-grid">
        <Metric label="Prescriptions in progress" value={state.prescriptions.filter((rx) => ['Pending', 'Verified', 'Dispensed'].includes(rx.status)).length} detail="Not yet administered" icon={Pill} tone="teal" />
        <Metric label="Open lab requests" value={openOrders('Laboratory')} detail="Requested to verification" icon={FlaskConical} tone="blue" />
        <Metric label="Open imaging studies" value={openOrders('Imaging')} detail="Requested to report" icon={ScanLine} tone="amber" />
        <Metric label="Theatre cases" value={state.theatreCases.filter((item) => item.stage < 4).length} detail="Not yet handed over" icon={Scissors} tone="coral" />
      </div>
      <p className="table-footnote"><Siren size={13} /> Active emergency codes appear as banners on every screen. <ClipboardList size={13} /> Press <span className="kbd">D</span> to open this view.</p>
    </motion.div>
  )
}
