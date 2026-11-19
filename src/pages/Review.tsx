import { motion } from 'framer-motion'
import { FilePenLine, PenLine } from 'lucide-react'
import { Button, Chip, EmptyState, PageHeader, Panel, PersonCell } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'

/** Notes and evaluations by doctors in training that need a senior co-signature. */
export default function Review() {
  const { state, can, profile, cosignNote, setSelectedPatientId } = useHospital()
  const patients = usePatients()
  const canCosign = can('cosign')
  const pending = state.cosignNotes.filter((note) => note.status === 'Pending review' && (canCosign || note.author === profile?.name))
  const done = state.cosignNotes.filter((note) => note.status === 'Co-signed' && (canCosign || note.author === profile?.name)).slice(0, 10)

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Clinical governance" title="Notes to review" description={canCosign ? 'Notes and evaluations by doctors in training, waiting for your co-signature.' : 'Your notes waiting for a senior co-signature.'} />
      <div className="card-grid">
        {pending.map((note) => {
          const patient = patients.get(note.patientId)
          return (
            <article key={note.id} className="work-card priority-urgent">
              <header>{patient && <PersonCell name={patient.name} detail={patient.mrn} onClick={() => setSelectedPatientId(patient.id)} />}<Chip tone="warning">Pending review</Chip></header>
              <p className="work-card-reason">{note.text}</p>
              <footer><small><PenLine size={13} />{note.author} · {formatDateTime(note.at)}</small>{canCosign && <Button size="sm" icon={FilePenLine} onClick={() => cosignNote(note.id)}>Co-sign</Button>}</footer>
            </article>
          )
        })}
        {pending.length === 0 && <Panel><EmptyState icon={FilePenLine} title="Nothing waiting for review" text="Notes written by interns appear here until a consultant co-signs them." /></Panel>}
      </div>
      {done.length > 0 && (
        <Panel title="Recently co-signed">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Patient</th><th>Note</th><th>Author</th><th>Co-signed by</th></tr></thead>
              <tbody>{done.map((note) => <tr key={note.id}><td>{patients.get(note.patientId)?.name}</td><td className="wrap">{note.text}</td><td>{note.author}</td><td>{note.cosignedBy}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      )}
    </motion.div>
  )
}
