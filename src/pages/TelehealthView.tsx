import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { Calendar, Camera, Check, ChevronRight, Download, Eye, Filter, Loader, MessageSquare, Plus, Search, ShieldCheck, Video, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import { useAppointments } from '../data'
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { downloadCsv, formatTime } from '../lib/format'
import type { Appointment } from '../types'

export default function TelehealthView() {
  const { state, notify } = useHospital()
  const appointments = useAppointments()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [view, setView] = useState<'schedule' | 'active'>('schedule')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const statuses = useMemo(() => [...new Set(appointments.map((a) => a.status))], [appointments])
  const filtered = appointments.filter((a) =>
    (status === 'all' || a.status === status) &&
    (type === 'all' || a.type === type) &&
    (!query || `${a.patientName} ${a.mrn ?? ''} ${a.doctorName} ${a.reason ?? a.chiefReason ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  )

  const scheduled = appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed').length
  const inProgress = appointments.filter((a) => a.status === 'In Progress').length
  const completed = appointments.filter((a) => a.status === 'Completed').length
  const telehealthCount = appointments.filter((a) => a.type === 'Telehealth' || a.type === 'Telehealth Virtual').length

  const exportAppointments = () => downloadCsv('northstar-appointments.csv', [
    ['ID', 'Patient', 'MRN', 'Doctor', 'Department', 'Date', 'Time', 'Duration', 'Type', 'Status', 'Reason'],
    ...appointments.map((a) => [a.id, a.patientName, a.mrn ?? '', a.doctorName, a.department ?? '', a.date ?? a.dateTime?.split('T')[0] ?? '', a.time ?? a.dateTime?.split('T')[1]?.slice(0, 5) ?? '', a.durationMinutes ?? '', a.type, a.status, a.reason ?? a.chiefReason ?? ''])
  ])

  return (
    <motion.div className="telehealth-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="VIRTUAL CARE · TELEHEALTH OPERATIONS"
        title="Telehealth Visits"
        description="Virtual visit scheduling, video consultations, and telehealth workflow management."
        actions={
          <Fragment>
            <Button variant="secondary" icon={Download} onClick={exportAppointments}>Export schedule</Button>
            <Button icon={Plus} onClick={() => { setView('schedule'); setSelectedAppointment(null) }}>Schedule visit</Button>
          </Fragment>
        }
      />
      <div className="metrics-grid telehealth-metrics">
        <div className="metric metric-blue">
          <div className="metric-icon"><Calendar size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Scheduled</p>
            <p className="metric-value">{scheduled}</p>
            <p className="metric-detail">Upcoming visits</p>
          </div>
        </div>
        <div className="metric metric-green">
          <div className="metric-icon"><Video size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">In progress</p>
            <p className="metric-value">{inProgress}</p>
            <p className="metric-detail">Active video visits</p>
          </div>
        </div>
        <div className="metric metric-teal">
          <div className="metric-icon"><Check size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Completed</p>
            <p className="metric-value">{completed}</p>
            <p className="metric-detail">This period</p>
          </div>
        </div>
        <div className="metric metric-amber">
          <div className="metric-icon"><MessageSquare size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Telehealth</p>
            <p className="metric-value">{telehealthCount}</p>
            <p className="metric-detail">Virtual visits total</p>
          </div>
        </div>
      </div>

      <div className="telehealth-tabs" role="tablist">
        {(['schedule', 'active'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {view === 'schedule' && (
        <Panel className="schedule-panel">
          <div className="schedule-toolbar">
            <label className="schedule-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search appointments…"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X size={14} />
                </button>
              )}
            </label>
            <label>
              <Filter size={15} />
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              <Camera size={15} />
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="all">All types</option>
                <option value="Telehealth">Telehealth</option>
                <option value="Telehealth Virtual">Telehealth Virtual</option>
                <option value="In-Person">In-Person</option>
              </select>
            </label>
          </div>
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date / Time</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <Avatar name={apt.patientName} size="sm" />
                      <span>
                        <b>{apt.patientName}</b>
                        <small>{apt.mrn ?? ''}</small>
                      </span>
                    </td>
                    <td>{apt.doctorName}</td>
                    <td>
                      {apt.date ?? apt.dateTime?.split('T')[0] ?? ''}
                      {apt.time ? ` @ ${apt.time}` : apt.dateTime ? ` @ ${apt.dateTime.split('T')[1].slice(0, 5)}` : ''}
                    </td>
                    <td>{apt.durationMinutes ?? 30} min</td>
                    <td>
                      <Badge
                        variant={
                          apt.type === 'Telehealth' || apt.type === 'Telehealth Virtual' ? 'info' : 'neutral'
                        }
                      >
                        {apt.type}
                      </Badge>
                    </td>
                    <td><StatusBadge status={apt.status.toLowerCase().replace(' ', '-')} /></td>
                    <td>{apt.reason ?? apt.chiefReason ?? ''}</td>
                    <td>
                      <Button
                        size="sm"
                        variant={apt.status === 'In Progress' ? 'secondary' : 'outline'}
                        onClick={() => setSelectedAppointment(apt)}
                      >
                        {apt.status === 'In Progress' ? <Video size={14} /> : <Eye size={14} />}
                        {apt.status === 'In Progress' ? ' Join' : ' View'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <EmptyState icon={Calendar} title="No appointments match" text="Try another search term or clear the filters." />
          )}
        </Panel>
      )}

      {view === 'active' && (
        <Panel className="active-panel" title="Active video visits" action={<span className="panel-count">{inProgress} LIVE</span>}>
          <div className="panel-subhead">Ongoing telehealth sessions requiring attention.<span>Live</span></div>
          <div className="active-grid">
            {appointments.filter((a) => a.status === 'In Progress').map((apt) => (
              <article key={apt.id} className="active-card">
                <div className="active-header">
                  <div>
                    <Avatar name={apt.patientName} size="sm" />
                    <span>
                      <b>{apt.patientName}</b>
                      <small>{apt.mrn ?? ''}</small>
                    </span>
                  </div>
                  <span className="live-badge">LIVE</span>
                </div>
                <p className="active-doctor">{apt.doctorName} · {apt.department ?? ''}</p>
                <p className="active-reason">{apt.reason ?? apt.chiefReason ?? ''}</p>
                <div className="active-actions">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedAppointment(apt)}>
                    <Video size={14} />
                    Join visit
                  </Button>
                  <Button size="sm" onClick={() => notify(`${apt.patientName} visit ended`, 'info')}>
                    End visit
                    <Check size={14} />
                  </Button>
                </div>
              </article>
            ))}
            {inProgress === 0 && (
              <EmptyState icon={Video} title="No active visits" text="Active telehealth sessions will appear here." />
            )}
          </div>
        </Panel>
      )}

      {selectedAppointment && (
        <Modal open={!!selectedAppointment} onClose={() => setSelectedAppointment(null)} title="Appointment Details" subtitle={`${selectedAppointment.patientName} · ${selectedAppointment.type}`} size="lg">
          <div className="appointment-detail">
            <div className="appointment-header">
              <div>
                <b>{selectedAppointment.patientName}</b>
                <small>{selectedAppointment.mrn ?? ''}</small>
              </div>
              <StatusBadge status={selectedAppointment.status.toLowerCase().replace(' ', '-')} />
            </div>
            <div className="appointment-meta">
              <div>
                <p><b>Doctor:</b> {selectedAppointment.doctorName}</p>
                <p><b>Department:</b> {selectedAppointment.department ?? ''}</p>
              </div>
              <div>
                <p><b>Date:</b> {selectedAppointment.date ?? selectedAppointment.dateTime?.split('T')[0] ?? ''}</p>
                <p><b>Time:</b> {selectedAppointment.time ?? selectedAppointment.dateTime?.split('T')[1]?.slice(0, 5) ?? ''}</p>
              </div>
              <div>
                <p><b>Duration:</b> {selectedAppointment.durationMinutes ?? 30} min</p>
                <p><b>Type:</b> {selectedAppointment.type}</p>
              </div>
            </div>
            <div className="appointment-reason">
              <h4>Reason for Visit</h4>
              <p>{selectedAppointment.reason ?? selectedAppointment.chiefReason ?? 'No reason provided'}</p>
            </div>
            <div className="appointment-actions">
              {selectedAppointment.status === 'In Progress' && (
                <Button onClick={() => notify(`${selectedAppointment.patientName} visit ended`, 'info')}>
                  End visit
                  <Check size={14} />
                </Button>
              )}
              {selectedAppointment.status === 'Scheduled' && (
                <Button variant="secondary" onClick={() => notify(`${selectedAppointment.patientName} visit started`, 'success')}>
                  Start visit
                  <Video size={14} />
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  )
}