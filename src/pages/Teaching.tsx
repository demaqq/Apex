import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, Award, BookOpenCheck, CheckCircle2, ClipboardCheck, GraduationCap, HeartPulse, Layers, NotebookPen, Stethoscope, Users } from 'lucide-react'
import { Button, Chip, EmptyState, Metric, Modal, PageHeader, Panel, Tabs } from '../components/ui'
import { average, canAssess, COMPETENCIES, ENTRUSTMENT, evidenceFor, LADDERS, levelOf, professionOf, PROFESSIONS, SCALE, TOOLS } from '../lib/teaching'
import { isOn, money } from '../lib/modules'
import { formatDate, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Assessment, AssessmentTool, Entrustment, Profession, StaffMember } from '../types'

type View = 'trainees' | 'portfolio' | 'programme'
const DAY = 86_400_000
const overdue = (last?: Assessment) => !last || Date.now() - new Date(last.at).getTime() > 30 * DAY

/** Teaching hospitals and diagnostic centres: who assesses whom, assessments, portfolios and evidence from the records. */
export default function Teaching() {
  const { state, meAsStaff, currentRole } = useHospital()
  const me = meAsStaff()
  const myLevel = me ? levelOf(me) : undefined
  const myProfession = me ? professionOf(me) : undefined
  const teaching = state.settings.teaching
  const taught = teaching?.professions ?? PROFESSIONS
  const trainees = state.staff.filter((member) => !member.suspended && levelOf(member)?.trainee && taught.includes(professionOf(member)!))
  const mine = trainees.filter((member) => member.id !== me?.id && canAssess(myLevel, myProfession, member))
  const iAmTrainee = Boolean(myLevel?.trainee)
  const admin = currentRole === 'administrator'
  const [view, setView] = useState<View>(mine.length ? 'trainees' : iAmTrainee ? 'portfolio' : 'programme')
  const [assessing, setAssessing] = useState<StaffMember | null>(null)
  const [portfolio, setPortfolio] = useState<StaffMember | null>(null)

  if (!isOn(state.settings, 'teaching')) return <Panel><EmptyState icon={GraduationCap} title="Teaching is switched off" text="This facility is not set up as a teaching institution. The administrator can switch it on under Administration → Facility." /></Panel>

  const last = (id: string) => state.assessments.filter((item) => item.traineeId === id).sort((a, b) => b.at.localeCompare(a.at))[0]
  const tabs = [
    ...(mine.length ? [{ value: 'trainees' as View, label: 'My trainees', count: mine.filter((member) => overdue(last(member.id))).length || undefined }] : []),
    ...(iAmTrainee ? [{ value: 'portfolio' as View, label: 'My portfolio', count: state.assessments.filter((item) => item.traineeId === me?.id && !item.acknowledgedAt).length || undefined }] : []),
    { value: 'programme' as View, label: 'Programme' },
  ]

  return (
    <motion.div className="ops-page teaching-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow={`${teaching?.kind ?? 'Teaching institution'} · ${teaching?.affiliation || state.settings.name}`} title="Teaching & assessment" description="Each person assesses those below them on their own ladder. Assessments sit beside evidence taken straight from the records: patients cared for, notes, rounds, observations and how often seniors agreed." />
      {me && myLevel && <div className="me-strip"><GraduationCap size={18} /><div><b>{me.name}</b><span>{myProfession} · {myLevel.id}{myLevel.trainee ? ' · in training' : ''}</span></div>{mine.length > 0 && <Chip tone="accent">You assess {mine.length} {mine.length === 1 ? 'trainee' : 'trainees'}</Chip>}{iAmTrainee && <Chip tone="neutral">Assessed by more senior {myProfession?.toLowerCase()} staff</Chip>}</div>}
      <Tabs<View> label="Teaching" value={tabs.some((tab) => tab.value === view) ? view : tabs[0].value} onChange={setView} options={tabs} />

      {(tabs.some((tab) => tab.value === view) ? view : tabs[0].value) === 'trainees' && (
        <div className="trainee-grid">
          {mine.map((member) => <TraineeCard key={member.id} member={member} onAssess={() => setAssessing(member)} onOpen={() => setPortfolio(member)} />)}
        </div>
      )}
      {(tabs.some((tab) => tab.value === view) ? view : tabs[0].value) === 'portfolio' && me && <Portfolio member={me} own />}
      {(tabs.some((tab) => tab.value === view) ? view : tabs[0].value) === 'programme' && <Programme trainees={trainees} admin={admin} onOpen={setPortfolio} />}

      {assessing && <AssessModal trainee={assessing} onClose={() => setAssessing(null)} />}
      {portfolio && <Modal open onClose={() => setPortfolio(null)} title={portfolio.name} subtitle={`${professionOf(portfolio)} · ${levelOf(portfolio)?.id} · ${state.departments.find((d) => d.id === portfolio.department)?.name ?? ''}`} size="lg"><Portfolio member={portfolio} /></Modal>}
    </motion.div>
  )
}

function Bars({ scores }: { scores: Record<string, number> }) {
  return <div className="competency-bars">{Object.entries(scores).map(([name, value]) => <div key={name}><span>{name}</span><div className="revenue-track"><i style={{ width: `${(value / 5) * 100}%` }} className={value < 3 ? 'low' : ''} /></div><b>{value ? value.toFixed(1) : '—'}</b></div>)}</div>
}

function Evidence({ name }: { name: string }) {
  const { state } = useHospital()
  const e = evidenceFor(name, state)
  const items: Array<[typeof Users, string, string | number]> = [[Users, 'Patients', e.patients], [NotebookPen, 'Notes & rounds', e.notes], [HeartPulse, 'Observations', e.observations], [Stethoscope, 'Orders', e.orders], [CheckCircle2, 'Senior agreed', e.agreement === undefined ? '—' : `${e.agreement}%`]]
  return <div className="evidence-row" title="From the records, last 30 days">{items.map(([Icon, label, value]) => <span key={label}><Icon size={13} /><b>{value}</b>{label}</span>)}</div>
}

function TraineeCard({ member, onAssess, onOpen }: { member: StaffMember; onAssess: () => void; onOpen: () => void }) {
  const { state } = useHospital()
  const list = state.assessments.filter((item) => item.traineeId === member.id).sort((a, b) => b.at.localeCompare(a.at))
  const last = list[0]
  const avg = list.length ? list.reduce((sum, item) => sum + average(item), 0) / list.length : 0
  return (
    <article className={`work-card trainee-card ${overdue(last) ? 'overdue' : ''}`}>
      <header><div><b>{member.name}</b><small>{levelOf(member)?.id} · {state.departments.find((d) => d.id === member.department)?.shortName}</small></div>{overdue(last) ? <Chip tone="warning">{last ? 'Due' : 'Not yet assessed'}</Chip> : <Chip tone="success">Up to date</Chip>}</header>
      <div className="trainee-stats"><span><b>{list.length}</b>assessments</span><span><b>{avg ? avg.toFixed(1) : '—'}</b>average /5</span><span><b>{last ? last.entrustment : '—'}</b>entrustment</span></div>
      {last && <p className="record-hint">Last: {last.tool} by {last.assessor}, {relativeTime(last.at)} — {ENTRUSTMENT[last.entrustment].toLowerCase()}.</p>}
      <Evidence name={member.name} />
      <footer><Button size="sm" variant="secondary" onClick={onOpen}>Portfolio</Button><Button size="sm" icon={ClipboardCheck} onClick={onAssess}>Assess</Button></footer>
    </article>
  )
}

function AssessModal({ trainee, onClose }: { trainee: StaffMember; onClose: () => void }) {
  const { state, addAssessment } = useHospital()
  const profession = professionOf(trainee)!
  const [tool, setTool] = useState<AssessmentTool>('Mini-CEX')
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(COMPETENCIES[profession].map((name) => [name, 0])))
  const [entrustment, setEntrustment] = useState<Entrustment>(levelOf(trainee)!.rank >= 3 ? 3 : 2)
  const [strengths, setStrengths] = useState('')
  const [development, setDevelopment] = useState('')
  const [patientId, setPatientId] = useState('')
  const rated = Object.values(scores).filter(Boolean).length
  const valid = rated >= Math.ceil(COMPETENCIES[profession].length / 2) && strengths.trim().length > 3 && development.trim().length > 3
  return (
    <Modal open onClose={onClose} title={`Assess ${trainee.name}`} subtitle={`${profession} · ${levelOf(trainee)?.id}`} size="lg">
      <div className="tool-grid">{TOOLS.map((item) => <button key={item.id} type="button" className={tool === item.id ? 'on' : ''} onClick={() => setTool(item.id)}><b>{item.id}</b><span>{item.text}</span></button>)}</div>
      <label className="form-field"><span>Patient (optional, for an observed encounter)</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">— None —</option>{state.patients.filter((patient) => patient.status !== 'discharged').map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.location}</option>)}</select></label>
      <div className="score-grid">
        {COMPETENCIES[profession].map((name) => (
          <div key={name} className="score-row"><span>{name}</span><div className="segmented" role="radiogroup" aria-label={name}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={scores[name] === value} className={scores[name] === value ? 'on' : ''} title={SCALE[value]} onClick={() => setScores({ ...scores, [name]: value })}>{value}</button>)}</div><small>{SCALE[scores[name]] || 'Not observed'}</small></div>
        ))}
      </div>
      <label className="form-field"><span>Entrustment — how much supervision now?</span><select value={entrustment} onChange={(event) => setEntrustment(Number(event.target.value) as Entrustment)}>{([1, 2, 3, 4, 5] as Entrustment[]).map((value) => <option key={value} value={value}>{value} · {ENTRUSTMENT[value]}</option>)}</select></label>
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>What went well <b>*</b></span><textarea rows={3} value={strengths} onChange={(event) => setStrengths(event.target.value)} /></label>
        <label className="form-field"><span>To develop next <b>*</b></span><textarea rows={3} value={development} onChange={(event) => setDevelopment(event.target.value)} /></label>
      </div>
      <div className="modal-footer"><small className="muted-text">{rated} of {COMPETENCIES[profession].length} rated</small><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Award} disabled={!valid} onClick={() => { addAssessment({ traineeId: trainee.id, tool, scores, entrustment, strengths: strengths.trim(), development: development.trim(), ...(patientId ? { patientId } : {}) }); onClose() }}>Save assessment</Button></div>
    </Modal>
  )
}

function Portfolio({ member, own }: { member: StaffMember; own?: boolean }) {
  const { state, acknowledgeAssessment } = useHospital()
  const [comment, setComment] = useState('')
  const profession = professionOf(member)!
  const list = state.assessments.filter((item) => item.traineeId === member.id).sort((a, b) => b.at.localeCompare(a.at))
  const averages = Object.fromEntries(COMPETENCIES[profession].map((name) => { const values = list.map((item) => item.scores[name]).filter((value) => value > 0); return [name, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0] }))
  return (
    <div className="portfolio">
      <div className="metrics-grid">
        <Metric label="Assessments" value={list.length} detail={list[0] ? `Latest ${formatDate(list[0].at)}` : 'None yet'} icon={BookOpenCheck} tone="blue" />
        <Metric label="Average" value={list.length ? (list.reduce((sum, item) => sum + average(item), 0) / list.length).toFixed(1) : '—'} detail="Across competencies, out of 5" icon={Award} tone="teal" />
        <Metric label="Entrustment" value={list[0]?.entrustment ?? '—'} detail={list[0] ? ENTRUSTMENT[list[0].entrustment] : 'Not yet assessed'} icon={Layers} tone="amber" />
      </div>
      <Panel title="From the records · last 30 days"><div className="panel-pad"><Evidence name={member.name} /></div></Panel>
      <Panel title="Competencies"><div className="panel-pad"><Bars scores={averages} /></div></Panel>
      <Panel title="Assessments">
        <div className="panel-pad invoice-list">
          {list.length === 0 && <p className="record-hint">No assessments yet.</p>}
          {list.map((item) => (
            <article key={item.id} className="invoice-card">
              <header><b>{item.tool} · {item.assessor} ({item.assessorLevel})</b><Chip tone={average(item) >= 3 ? 'success' : 'warning'}>{average(item).toFixed(1)} / 5</Chip></header>
              <small className="muted-text">{formatDate(item.at)} · entrustment {item.entrustment}: {ENTRUSTMENT[item.entrustment]}{item.patientId ? ` · ${state.patients.find((p) => p.id === item.patientId)?.name ?? 'patient'}` : ''}</small>
              <p><b>Went well:</b> {item.strengths}</p>
              <p><b>To develop:</b> {item.development}</p>
              {item.traineeComment && <p className="record-hint">Reflection: {item.traineeComment}</p>}
              {item.acknowledgedAt ? <small className="muted-text"><CheckCircle2 size={12} /> Acknowledged {formatDate(item.acknowledgedAt)}</small> : own ? (
                <div className="referral-reply"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Your reflection (optional)" aria-label="Reflection" /><Button size="sm" onClick={() => { acknowledgeAssessment(item.id, comment); setComment('') }}>Acknowledge</Button></div>
              ) : <Chip tone="neutral">Not yet acknowledged</Chip>}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Programme({ trainees, admin, onOpen }: { trainees: StaffMember[]; admin: boolean; onOpen: (member: StaffMember) => void }) {
  const { state } = useHospital()
  const taught = state.settings.teaching?.professions ?? PROFESSIONS
  const recent = state.assessments.filter((item) => Date.now() - new Date(item.at).getTime() <= 30 * DAY)
  const assessedIds = new Set(recent.map((item) => item.traineeId))
  const staffByLevel = useMemo(() => {
    const map = new Map<string, number>()
    state.staff.forEach((member) => { const profession = professionOf(member); const level = levelOf(member); if (profession && level) map.set(`${profession}|${level.id}`, (map.get(`${profession}|${level.id}`) ?? 0) + 1) })
    return map
  }, [state.staff])
  return <>
    <div className="metrics-grid">
      <Metric label="Trainees" value={trainees.length} detail={`${taught.length} professions taught`} icon={GraduationCap} tone="blue" />
      <Metric label="Assessed in 30 days" value={assessedIds.size} detail={`${recent.length} assessments`} icon={ClipboardCheck} tone="teal" />
      <Metric label="Overdue" value={trainees.filter((member) => !assessedIds.has(member.id)).length} detail="No assessment in 30 days" icon={Layers} tone="coral" />
      <Metric label="Average score" value={recent.length ? (recent.reduce((sum, item) => sum + average(item), 0) / recent.length).toFixed(1) : '—'} detail="Last 30 days, out of 5" icon={Award} tone="amber" />
    </div>
    <Panel title="Who assesses whom">
      <div className="panel-pad ladder-grid">
        {taught.map((profession) => (
          <div key={profession} className="ladder">
            <b>{profession}</b>
            {[...LADDERS[profession]].reverse().map((level, index, all) => (
              <div key={level.id}>
                <div className={`ladder-step ${level.trainee ? 'trainee' : ''}`}><span>{level.id}</span><small>{staffByLevel.get(`${profession}|${level.id}`) ?? 0}</small></div>
                {index < all.length - 1 && <ArrowDown size={12} className="ladder-arrow" />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="table-footnote">Arrows point down: each level assesses the trainee levels below it in the same profession. Shaded steps are in training.</p>
    </Panel>
    <Panel title="Trainees">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Trainee</th><th>Profession · level</th><th>Assessments</th><th>Average</th><th>Evidence (30 days)</th><th aria-label="Actions" /></tr></thead>
          <tbody>{trainees.map((member) => {
            const list = state.assessments.filter((item) => item.traineeId === member.id)
            const latest = [...list].sort((a, b) => b.at.localeCompare(a.at))[0]
            const e = evidenceFor(member.name, state)
            return <tr key={member.id}><td><b>{member.name}</b><small>{state.departments.find((d) => d.id === member.department)?.shortName}</small></td><td>{professionOf(member)}<small>{levelOf(member)?.id}</small></td><td>{list.length}{overdue(latest) ? <Chip tone="warning">Due</Chip> : null}</td><td>{list.length ? (list.reduce((sum, item) => sum + average(item), 0) / list.length).toFixed(1) : '—'}</td><td><small>{e.patients} patients · {e.notes} notes · {e.observations} obs</small></td><td className="row-actions"><Button size="sm" variant="secondary" onClick={() => onOpen(member)}>Portfolio</Button></td></tr>
          })}</tbody>
        </table>
      </div>
      {admin && <p className="table-footnote">Billing: {assessedIds.size} trainees assessed in the last 30 days × {money(state.pricing.perTrainee ?? 0, state.pricing.currency)} (incl. VAT), plus the Teaching module fee. See Plan &amp; modules.</p>}
    </Panel>
  </>
}

export type { Profession }
