import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Download, Moon, Sun, UserCheck, UsersRound } from 'lucide-react'
import { Avatar, Button, DepartmentIcon, DetailGrid, EmptyState, FilterSelect, Metric, Modal, PageHeader, Panel, PersonCell, SearchField, StatusBadge } from '../components/ui'
import { departmentById } from '../data'
import { downloadCsv, today } from '../lib/format'
import { matches } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'

export default function StaffView() {
  const { state, can, setStaffDuty } = useHospital()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [duty, setDuty] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = state.staff.find((member) => member.id === selectedId) ?? null
  const canManage = can('manage') || can('transfer')

  const departments = [...new Set(state.staff.map((member) => member.department))]
  const onDuty = state.staff.filter((member) => member.onDuty)
  const filtered = state.staff.filter((member) =>
    (department === 'all' || member.department === department) &&
    (duty === 'all' || (duty === 'on' ? member.onDuty : !member.onDuty)) &&
    matches(query, member.name, member.role, member.specialty, departmentById(state.departments, member.department).name, member.pager))

  const exportStaff = () => downloadCsv(`staff-${today()}.csv`, [
    ['ID', 'Name', 'Role', 'Department', 'Specialty', 'Shift', 'On duty', 'Pager', 'Phone', 'Email', 'Licence'],
    ...state.staff.map((member) => [member.id, member.name, member.role, departmentById(state.departments, member.department).name, member.specialty, member.shift, member.onDuty ? 'Yes' : 'No', member.pager, member.phone, member.email, member.license]),
  ])

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Workforce · Rota"
        title="Staff & schedule"
        description="Who is on shift, where they are, and how to reach them."
        actions={<Button variant="secondary" icon={Download} onClick={exportStaff}>Export staff list</Button>}
      />

      <div className="metrics-grid">
        <Metric label="On duty now" value={onDuty.length} detail={`of ${state.staff.length} rostered staff`} icon={UserCheck} tone="green" progress={state.staff.length ? onDuty.length / state.staff.length * 100 : 0} />
        <Metric label="Day shift" value={state.staff.filter((member) => member.shift.startsWith('Day')).length} detail="07:00 – 15:00" icon={Sun} tone="amber" />
        <Metric label="Evening & night" value={state.staff.filter((member) => !member.shift.startsWith('Day')).length} detail="15:00 – 07:00" icon={Moon} tone="blue" />
        <Metric label="Departments covered" value={new Set(onDuty.map((member) => member.department)).size} detail={`${departments.length} departments on the rota`} icon={Building2} tone="teal" />
      </div>

      <Panel>
        <div className="table-toolbar">
          <SearchField value={query} onChange={setQuery} placeholder="Search name, role, specialty or pager…" />
          <FilterSelect label="All departments" value={department} onChange={setDepartment} options={departments.map((id) => ({ value: id, label: departmentById(state.departments, id).name }))} />
          <FilterSelect label="Any duty status" value={duty} onChange={setDuty} options={[{ value: 'on', label: 'On duty' }, { value: 'off', label: 'Off duty' }]} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Department</th><th>Shift</th><th>Pager</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="clickable-row" onClick={() => setSelectedId(member.id)}>
                  <td><PersonCell name={member.name} detail={`${member.role} · ${member.specialty}`} /></td>
                  <td><span className="inline-icon"><DepartmentIcon id={member.department} size={14} />{departmentById(state.departments, member.department).shortName}</span></td>
                  <td>{member.shift}</td>
                  <td><b>{member.pager}</b><small>{member.phone}</small></td>
                  <td><StatusBadge status={member.onDuty ? 'on-duty' : 'off-duty'} /></td>
                  <td className="row-actions"><Button size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); setSelectedId(member.id) }}>Details</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={UsersRound} title="No staff match" text="Try another search term or clear the filters." />}
      </Panel>

      {selected && (
        <Modal open onClose={() => setSelectedId(null)} title={selected.name} subtitle={`${selected.role} · ${departmentById(state.departments, selected.department).name}`} size="md">
          <div className="detail-head"><Avatar name={selected.name} size="lg" /><StatusBadge status={selected.onDuty ? 'on-duty' : 'off-duty'} /></div>
          <DetailGrid items={[['Specialty', selected.specialty], ['Shift', selected.shift], ['Pager', selected.pager], ['Extension', selected.phone], ['Email', <a href={`mailto:${selected.email}`}>{selected.email}</a>], ['Licence', selected.license]]} />
          <div className="modal-footer">
            <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
            {canManage && <Button variant={selected.onDuty ? 'secondary' : 'primary'} icon={UserCheck} onClick={() => setStaffDuty(selected.id, !selected.onDuty)}>{selected.onDuty ? 'Mark off duty' : 'Mark on duty'}</Button>}
          </div>
        </Modal>
      )}
    </motion.div>
  )
}
