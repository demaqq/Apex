import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { Check, ChevronRight, Download, Filter, Loader, Search, ShieldCheck, Stethoscope, UserPlus, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import { useStaff } from '../data'
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { downloadCsv, formatTime } from '../lib/format'
import type { StaffMember } from '../types'

export default function StaffView() {
  const { state, notify } = useHospital()
  const staff = useStaff()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)

  const departments = useMemo(() => [...new Set(staff.map((s) => s.department))], [staff])
  const roles = useMemo(() => [...new Set(staff.map((s) => s.role))], [staff])
  const filtered = staff.filter((s) =>
    (department === 'all' || s.department === department) &&
    (role === 'all' || s.role === role) &&
    (status === 'all' ||
      (status === 'on-duty' && s.onDuty) ||
      (status === 'off-duty' && !s.onDuty)) &&
    (!query || `${s.name} ${s.role} ${s.department} ${s.specialty ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  )

  const onDutyCount = staff.filter((s) => s.onDuty).length
  const totalStaff = staff.length
  const byDepartment = useMemo(() =>
    departments.map((dept) => ({
      department: dept,
      count: staff.filter((s) => s.department === dept).length,
      onDuty: staff.filter((s) => s.department === dept && s.onDuty).length
    })),
    [staff, departments]
  )

  const exportStaff = () => downloadCsv('northstar-staff.csv', [
    ['ID', 'Name', 'Role', 'Department', 'Specialty', 'Shift', 'On Duty', 'Pager', 'Email', 'Phone', 'License'],
    ...staff.map((s) => [s.id, s.name, s.role, s.department, s.specialty ?? '', s.shift, s.onDuty ? 'Yes' : 'No', s.pagerNumber ?? s.pager, s.email, s.phone, s.licenseNumber ?? ''])
  ])

  return (
    <motion.div className="staff-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="WORKFORCE OPERATIONS · STAFF MANAGEMENT"
        title="Staff & Scheduling"
        description="Clinical staff directory, shift management, duty status and credential tracking."
        actions={
          <Fragment>
            <Button variant="secondary" icon={Download} onClick={exportStaff}>Export staff list</Button>
            <Button icon={UserPlus} onClick={() => setSelectedMember(null)}>Add staff member</Button>
          </Fragment>
        }
      />
      <div className="metrics-grid staff-metrics">
        <div className="metric metric-blue">
          <div className="metric-icon"><Users size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Total staff</p>
            <p className="metric-value">{totalStaff}</p>
            <p className="metric-detail">Across {departments.length} departments</p>
          </div>
        </div>
        <div className="metric metric-green">
          <div className="metric-icon"><Check size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">On duty now</p>
            <p className="metric-value">{onDutyCount}</p>
            <p className="metric-detail">{totalStaff - onDutyCount} off duty</p>
          </div>
        </div>
        <div className="metric metric-teal">
          <div className="metric-icon"><Stethoscope size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Clinical roles</p>
            <p className="metric-value">
              {roles.filter((r) => ['Physician', 'Surgeon', 'Nurse Practitioner', 'Head Nurse', 'Pharmacist', 'Lab Specialist', 'Anesthesiologist'].includes(r)).length}
            </p>
            <p className="metric-detail">Licensed practitioners</p>
          </div>
        </div>
        <div className="metric metric-amber">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Departments</p>
            <p className="metric-value">{departments.length}</p>
            <p className="metric-detail">Staffed services</p>
          </div>
        </div>
      </div>

      <Panel className="staff-panel">
        <div className="staff-toolbar">
          <label className="staff-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search staff…"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
          <label>
            <Filter size={15} />
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            <Filter size={15} />
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="all">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option>
              <option value="on-duty">On duty</option>
              <option value="off-duty">Off duty</option>
            </select>
          </label>
        </div>
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Role</th>
                <th>Department</th>
                <th>Specialty</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <Avatar name={member.name} size="sm" />
                    <span>
                      <b>{member.name}</b>
                      <small>{member.id}</small>
                    </span>
                  </td>
                  <td>{member.role}</td>
                  <td>{member.department}</td>
                  <td>{member.specialty ?? '—'}</td>
                  <td>{member.shift}</td>
                  <td>
                    <StatusBadge status={member.onDuty ? 'on-duty' : 'off-duty'} />
                  </td>
                  <td>{member.email ?? member.pagerNumber ?? member.pager ?? '—'}</td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => setSelectedMember(member)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon={Users} title="No staff match" text="Try another search term or clear the filters." />
        )}
      </Panel>

      {selectedMember && (
        <Modal open={!!selectedMember} onClose={() => setSelectedMember(null)} title="Staff Details" subtitle={`${selectedMember.name} · ${selectedMember.role}`} size="lg">
          <div className="staff-detail">
            <div className="staff-header">
              <Avatar name={selectedMember.name} size="lg" />
              <div>
                <h3>{selectedMember.name}</h3>
                <p>{selectedMember.role} · {selectedMember.department}</p>
                <StatusBadge status={selectedMember.onDuty ? 'on-duty' : 'off-duty'} />
              </div>
            </div>
            <div className="staff-meta">
              <div>
                <p><b>Specialty:</b> {selectedMember.specialty ?? '—'}</p>
                <p><b>Shift:</b> {selectedMember.shift}</p>
              </div>
              <div>
                <p><b>Email:</b> {selectedMember.email ?? '—'}</p>
                <p><b>Phone:</b> {selectedMember.phone ?? '—'}</p>
              </div>
              <div>
                <p><b>Pager:</b> {selectedMember.pagerNumber ?? selectedMember.pager ?? '—'}</p>
                <p><b>License:</b> {selectedMember.licenseNumber ?? '—'}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  )
}