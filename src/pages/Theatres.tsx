import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, HeartPulse, Scissors, Syringe } from 'lucide-react'
import { Button, Chip, Metric, PageHeader, Panel, PersonCell, Stepper } from '../components/ui'
import { ASA, SAFETY_CHECKLIST, THEATRES, THEATRE_ACTIONS, THEATRE_STAGES } from '../lib/clinical'
import { formatTime } from '../lib/format'
import { usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { TheatreCase } from '../types'

/** Today's theatre list, WHO-style safety checklist and anaesthesia record. */
export default function Theatres() {
  const { state, can, advanceTheatreCase, toggleChecklist, setSelectedPatientId } = useHospital()
  const patients = usePatients()
  const [selectedId, setSelectedId] = useState<string | null>(state.theatreCases.find((item) => item.stage === 2)?.id ?? null)
  const selected = state.theatreCases.find((item) => item.id === selectedId) ?? null
  const canRun = can('theatre') || can('manage')
  const cases = [...state.theatreCases].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Surgery · Theatres" title="Operating theatres" description="Move each case from pre-op check to ward handover. The safety checklist and anaesthesia assessment are required before theatre." />
      <div className="metrics-grid">
        {THEATRES.map((room) => {
          const inUse = state.theatreCases.find((item) => item.room === room && item.stage === 2)
          return <Metric key={room} label={room} value={inUse ? 'In use' : 'Available'} detail={inUse ? inUse.procedure : 'Ready for the next case'} icon={Scissors} tone={inUse ? 'coral' : 'green'} />
        })}
        <Metric label="In recovery" value={state.theatreCases.filter((item) => item.stage === 3).length} detail={`${state.theatreCases.filter((item) => item.stage === 4).length} handed over to wards`} icon={HeartPulse} tone="blue" />
      </div>

      <Panel title="Today’s list">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Time</th><th>Theatre</th><th>Patient</th><th>Procedure and team</th><th>Progress</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {cases.map((item) => {
                const patient = patients.get(item.patientId)
                const allergies = patient?.allergies.filter((allergy) => !/no known|not yet/i.test(allergy)) ?? []
                return (
                  <tr key={item.id} className={selectedId === item.id ? 'selected-row' : ''}>
                    <td className="mono">{item.time}</td>
                    <td>{item.room}</td>
                    <td>{patient && <PersonCell name={patient.name} detail={patient.mrn} onClick={() => setSelectedPatientId(patient.id)} />}{allergies.map((allergy) => <Chip key={allergy} tone="danger">Allergy: {allergy}</Chip>)}</td>
                    <td className="wrap"><b>{item.procedure}</b><small>{item.surgeon}</small>
                      {item.stage === 1 && <div className="checklist">{SAFETY_CHECKLIST.map((label, index) => <label key={label} className="remember-row"><input type="checkbox" checked={item.checklist[index]} disabled={!canRun} onChange={() => toggleChecklist(item.id, index)} />{label}</label>)}</div>}
                    </td>
                    <td><Stepper steps={THEATRE_STAGES} current={item.stage} /></td>
                    <td className="row-actions">
                      {canRun && item.stage < 4 && <Button size="sm" icon={ArrowRight} onClick={() => advanceTheatreCase(item.id)}>{THEATRE_ACTIONS[item.stage]}</Button>}
                      <Button size="sm" variant={selectedId === item.id ? 'primary' : 'ghost'} icon={Syringe} onClick={() => setSelectedId(item.id)}>Anaesthesia{item.anaesthesia ? ' ✓' : ''}</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && <AnaesthesiaPanel key={selected.id} item={selected} />}
    </motion.div>
  )
}

function AnaesthesiaPanel({ item }: { item: TheatreCase }) {
  const { state, can, saveAnaesthesia, logAnaesthesia } = useHospital()
  const patient = state.patients.find((candidate) => candidate.id === item.patientId)
  const editable = can('anaesthesia') || can('manage')
  const [asa, setAsa] = useState(0)
  const [technique, setTechnique] = useState('')
  const [airway, setAirway] = useState('')
  const [entry, setEntry] = useState({ hr: '', sbp: '', spo2: '', note: '' })
  const [error, setError] = useState('')
  const record = item.anaesthesia

  const savePre = () => {
    if (!asa || !technique || airway.trim().length < 3) { setError('Choose the ASA class and technique and describe the airway.'); return }
    saveAnaesthesia(item.id, { asa: asa as 1 | 2 | 3 | 4 | 5, technique, airway: airway.trim() }); setError('')
  }
  const addEntry = () => {
    if (!entry.hr || !entry.sbp || !entry.spo2) { setError('Enter heart rate, systolic pressure and SpO₂.'); return }
    logAnaesthesia(item.id, { hr: Number(entry.hr), sbp: Number(entry.sbp), spo2: Number(entry.spo2), note: entry.note.trim() }); setEntry({ hr: '', sbp: '', spo2: '', note: '' }); setError('')
  }

  return (
    <Panel title={`Anaesthesia record · ${patient?.name ?? ''} · ${item.procedure}`}>
      <div style={{ padding: '6px 18px 16px' }}>
        {patient?.allergies.filter((allergy) => !/no known|not yet/i.test(allergy)).map((allergy) => <Chip key={allergy} tone="danger">Allergy: {allergy}</Chip>)}
        {record
          ? <p className="record-hint" style={{ fontSize: 13 }}><b>ASA {record.asa}</b> ({ASA[record.asa]}) · {record.technique}<br />Airway: {record.airway}<br />Assessed by {record.by}</p>
          : <p className="record-hint">No pre-anaesthesia assessment yet. It is required before the patient goes to theatre.</p>}
        {editable && item.stage < 2 && (
          <div className="form-grid form-grid-3" style={{ marginTop: 8 }}>
            <label className="form-field"><span>ASA class</span><select value={asa} onChange={(event) => setAsa(Number(event.target.value))}><option value={0}>Choose…</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} – {ASA[level]}</option>)}</select></label>
            <label className="form-field"><span>Technique</span><select value={technique} onChange={(event) => setTechnique(event.target.value)}><option value="">Choose…</option>{['General anaesthesia', 'Spinal', 'Regional block', 'Local with sedation'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="form-field"><span>Airway assessment</span><input value={airway} onChange={(event) => setAirway(event.target.value)} placeholder="e.g. Mallampati 2, normal mouth opening" /></label>
            <div className="panel-actions span-3"><Button onClick={savePre}>Save assessment</Button></div>
          </div>
        )}
        {record && record.log.length > 0 && (
          <table className="data-table compact" style={{ marginTop: 12 }}>
            <thead><tr><th>Time</th><th className="num">HR</th><th className="num">SBP</th><th className="num">SpO₂</th><th>Drugs and events</th></tr></thead>
            <tbody>{record.log.map((row) => <tr key={row.at}><td className="mono">{formatTime(row.at)}</td><td className="num">{row.hr}</td><td className="num">{row.sbp}</td><td className="num">{row.spo2}%</td><td className="wrap">{row.note}</td></tr>)}</tbody>
          </table>
        )}
        {editable && record && item.stage === 2 && (
          <div className="ddx-add" style={{ marginTop: 12 }}>
            <input type="number" placeholder="HR" aria-label="Heart rate" value={entry.hr} onChange={(event) => setEntry({ ...entry, hr: event.target.value })} style={{ maxWidth: 90 }} />
            <input type="number" placeholder="SBP" aria-label="Systolic blood pressure" value={entry.sbp} onChange={(event) => setEntry({ ...entry, sbp: event.target.value })} style={{ maxWidth: 90 }} />
            <input type="number" placeholder="SpO₂" aria-label="Oxygen saturation" value={entry.spo2} onChange={(event) => setEntry({ ...entry, spo2: event.target.value })} style={{ maxWidth: 90 }} />
            <input placeholder="Drugs given and events" aria-label="Drugs and events" value={entry.note} onChange={(event) => setEntry({ ...entry, note: event.target.value })} />
            <Button size="sm" onClick={addEntry}>Add entry</Button>
          </div>
        )}
        {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      </div>
    </Panel>
  )
}
