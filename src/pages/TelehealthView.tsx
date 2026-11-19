import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Ban, CalendarCheck, CalendarClock, CalendarPlus, Check, Download, Play, Video } from 'lucide-react'
import { Button, DepartmentIcon, EmptyState, FilterSelect, Metric, Modal, PageHeader, Panel, PersonCell, SearchField, StatusBadge, Tabs } from '../components/ui'
import { departmentById } from '../data'
import { downloadCsv, formatDateTime, formatTime, relativeTime, today } from '../lib/format'
import { matches, useNow, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { Appointment, AppointmentStatus, DepartmentId } from '../types'

type View = 'upcoming' | 'all'

const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

export default function TelehealthView() {
  const { state, profile, setAppointmentStatus, setSelectedPatientId } = useHospital()
  const isClinician = ['physician', 'consultant', 'intern'].includes(profile?.id ?? '')
  const [mineOnly, setMineOnly] = useState(isClinician && state.appointments.some((apt) => apt.clinician === profile?.name))
  const patients = usePatients()
  const now = useNow()
  const [view, setView] = useState<View>('upcoming')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [scheduling, setScheduling] = useState(false)

  const sorted = state.appointments.filter((apt) => !mineOnly || apt.clinician === profile?.name).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const live = sorted.filter((apt) => apt.status === 'In progress')
  const upcoming = sorted.filter((apt) => apt.status === 'Scheduled')
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = startOfDay.getTime() + 86_400_000
  const todayCount = sorted.filter((apt) => apt.status !== 'Cancelled' && new Date(apt.startsAt).getTime() >= startOfDay.getTime() && new Date(apt.startsAt).getTime() < endOfDay).length
  const filtered = sorted.filter((apt) => {
    const patient = patients.get(apt.patientId)
    return (status === 'all' || apt.status === status) && matches(query, apt.id, patient?.name, patient?.mrn, apt.clinician, apt.reason)
  })

  const exportSchedule = () => downloadCsv(`visits-${today()}.csv`, [
    ['Visit', 'Patient', 'MRN', 'Clinician', 'Department', 'Starts', 'Minutes', 'Mode', 'Status', 'Reason'],
    ...sorted.map((apt) => [apt.id, patients.get(apt.patientId)?.name, patients.get(apt.patientId)?.mrn, apt.clinician, departmentById(state.departments, apt.department).name, apt.startsAt, apt.durationMinutes, apt.mode, apt.status, apt.reason]),
  ])

  const actionsFor = (apt: Appointment) => <>
    {apt.status === 'Scheduled' && <Button size="sm" icon={Play} onClick={() => setAppointmentStatus(apt.id, 'In progress')}>Start</Button>}
    {apt.status === 'In progress' && <Button size="sm" icon={Check} onClick={() => setAppointmentStatus(apt.id, 'Completed')}>Complete</Button>}
    {apt.status === 'Scheduled' && <Button size="sm" variant="ghost" icon={Ban} onClick={() => setAppointmentStatus(apt.id, 'Cancelled')}>Cancel</Button>}
  </>

  const visitCard = (apt: Appointment) => {
    const patient = patients.get(apt.patientId)
    const department = departmentById(state.departments, apt.department)
    return (
      <article key={apt.id} className={`work-card ${apt.status === 'In progress' ? 'is-live' : ''}`}>
        <header>
          <b>{formatTime(apt.startsAt)}</b>
          <span className="muted-text">{relativeTime(apt.startsAt, now)} · {apt.durationMinutes} min</span>
          {apt.status === 'In progress' ? <span className="live-badge"><span className="live-dot" />Live</span> : <span className="mode-label">{apt.mode === 'Video' ? <Video size={13} /> : <CalendarCheck size={13} />}{apt.mode}</span>}
        </header>
        {patient && <PersonCell name={patient.name} detail={patient.mrn} onClick={() => setSelectedPatientId(patient.id)} />}
        <p className="work-card-reason">{apt.reason}</p>
        <footer><small><DepartmentIcon id={apt.department} size={13} />{apt.clinician} · {department.shortName}</small><div>{actionsFor(apt)}</div></footer>
      </article>
    )
  }

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Virtual care · Clinics"
        title="Telehealth & clinic visits"
        description="Run video consultations and follow-up clinics from one schedule."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportSchedule}>Export schedule</Button>
          <Button icon={CalendarPlus} onClick={() => setScheduling(true)}>Schedule visit</Button>
        </>}
      />

      <div className="metrics-grid">
        <Metric label="Live now" value={live.length} detail="Video visits in progress" icon={Video} tone="green" />
        <Metric label="Today" value={todayCount} detail="Visits booked for today" icon={CalendarClock} tone="blue" />
        <Metric label="Upcoming" value={upcoming.length} detail="Scheduled and not yet started" icon={CalendarPlus} tone="amber" />
        <Metric label="Completed" value={sorted.filter((apt) => apt.status === 'Completed').length} detail={`${sorted.filter((apt) => apt.status === 'Cancelled').length} cancelled`} icon={CalendarCheck} tone="teal" />
      </div>

      <div className="toolbar-row">
      <Tabs<View> label="Visit views" value={view} onChange={(next) => { setView(next); setQuery(''); setStatus('all') }} options={[{ value: 'upcoming', label: 'Live & upcoming', count: live.length + upcoming.length }, { value: 'all', label: 'All visits' }]} />
        {isClinician && <div className="segmented"><button type="button" className={mineOnly ? 'on' : ''} onClick={() => setMineOnly(true)}>My visits</button><button type="button" className={mineOnly ? '' : 'on'} onClick={() => setMineOnly(false)}>All visits</button></div>}
      </div>

      {view === 'upcoming' && (
        <>
          {live.length > 0 && <><h2 className="section-title">In progress</h2><div className="card-grid">{live.map(visitCard)}</div></>}
          <h2 className="section-title">Upcoming</h2>
          <div className="card-grid">
            {upcoming.map(visitCard)}
            {upcoming.length === 0 && <Panel><EmptyState icon={CalendarClock} title="Nothing scheduled" text="Schedule a visit to see it here." action={<Button size="sm" icon={CalendarPlus} onClick={() => setScheduling(true)}>Schedule visit</Button>} /></Panel>}
          </div>
        </>
      )}

      {view === 'all' && (
        <Panel>
          <div className="table-toolbar">
            <SearchField value={query} onChange={setQuery} placeholder="Search patient, clinician or reason…" />
            <FilterSelect label="All statuses" value={status} onChange={setStatus} options={['Scheduled', 'In progress', 'Completed', 'Cancelled'] satisfies AppointmentStatus[]} />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Patient</th><th>Clinician</th><th>Mode</th><th>Reason</th><th>Status</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {filtered.map((apt) => {
                  const patient = patients.get(apt.patientId)
                  return (
                    <tr key={apt.id}>
                      <td><b>{formatDateTime(apt.startsAt)}</b><small>{apt.durationMinutes} min</small></td>
                      <td>{patient && <PersonCell name={patient.name} detail={patient.mrn} onClick={() => setSelectedPatientId(patient.id)} />}</td>
                      <td>{apt.clinician}<small>{departmentById(state.departments, apt.department).shortName}</small></td>
                      <td>{apt.mode}</td>
                      <td className="wrap">{apt.reason}</td>
                      <td><StatusBadge status={apt.status} /></td>
                      <td className="row-actions">{actionsFor(apt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <EmptyState icon={CalendarClock} title="No visits match" text="Try another search term or clear the status filter." />}
        </Panel>
      )}

      <ScheduleModal open={scheduling} onClose={() => setScheduling(false)} />
    </motion.div>
  )
}

function ScheduleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, profile, scheduleAppointment } = useHospital()
  const clinicalUnits = state.departments.filter((department) => !['laboratory', 'radiology', 'pharmacy'].includes(department.id))
  const initialStart = () => { const date = new Date(Date.now() + 3_600_000); date.setMinutes(0, 0, 0); return toLocalInput(date) }
  const [patientId, setPatientId] = useState('')
  const [department, setDepartment] = useState<DepartmentId>(profile?.department && clinicalUnits.some((unit) => unit.id === profile.department) ? profile.department : 'cardiology')
  const [clinician, setClinician] = useState('')
  const [startsAt, setStartsAt] = useState(initialStart)
  const [duration, setDuration] = useState(30)
  const [mode, setMode] = useState<Appointment['mode']>('Video')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const unit = departmentById(state.departments, department)

  const close = () => { setPatientId(''); setClinician(''); setStartsAt(initialStart()); setDuration(30); setMode('Video'); setReason(''); setError(''); onClose() }
  const submit = () => {
    if (!patientId || !reason.trim() || !startsAt) { setError('Choose a patient, a start time and a reason for the visit.'); return }
    scheduleAppointment({ patientId, department, clinician: clinician.trim() || unit.onCall, startsAt: new Date(startsAt).toISOString(), durationMinutes: duration, mode, reason: reason.trim() })
    close()
  }

  return (
    <Modal open={open} onClose={close} title="Schedule a visit" subtitle="Video or in-person follow-up" size="md">
      <div className="form-grid form-grid-2">
        <label className="form-field span-2"><span>Patient <b>*</b></span>
          <select value={patientId} onChange={(event) => { setPatientId(event.target.value); setError('') }}>
            <option value="">Select a patient…</option>
            {state.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}
          </select>
        </label>
        <label className="form-field"><span>Department</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value as DepartmentId)}>
            {clinicalUnits.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="form-field"><span>Clinician</span><input value={clinician} onChange={(event) => setClinician(event.target.value)} placeholder={unit.onCall} /></label>
        <label className="form-field"><span>Starts <b>*</b></span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
        <label className="form-field"><span>Length</span>
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[15, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select>
        </label>
        <div className="form-field span-2"><span>Visit type</span>
          <div className="priority-control two">
            {(['Video', 'In person'] as const).map((value) => <button type="button" key={value} aria-pressed={mode === value} className={mode === value ? 'active routine' : ''} onClick={() => setMode(value)}>{value}</button>)}
          </div>
        </div>
        <label className="form-field span-2"><span>Reason <b>*</b></span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Blood pressure review after discharge" /></label>
      </div>
      {error && <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div>}
      <div className="modal-footer"><Button variant="ghost" onClick={close}>Cancel</Button><Button icon={CalendarPlus} onClick={submit}>Schedule</Button></div>
    </Modal>
  )
}
