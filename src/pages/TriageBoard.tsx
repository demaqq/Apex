import { AnimatePresence, motion } from 'framer-motion'
import { Activity, AlertTriangle, ArrowDownUp, Check, ChevronRight, Clock3, Filter, HeartPulse, Info, Plus, RefreshCw, Search, ShieldCheck, Siren, TimerReset, UserRoundCheck, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { RetriageModal, TriageModal } from '../components/ClinicalModals'
import { Avatar, Button, EmptyState, EsiBadge, Metric, PageHeader, Panel, StatusBadge } from '../components/ui'
import { esiLabels } from '../data'
import { formatWait, minutesSince, relativeTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { Patient } from '../types'

export default function TriageBoard() {
  const { state, profile, can, setSelectedPatientId } = useHospital()
  const canEmergencyTriage = can('triage') && profile?.department === 'emergency'
  const [triageOpen, setTriageOpen] = useState(false)
  const [reassess, setReassess] = useState<Patient | null>(null)
  const [query, setQuery] = useState('')
  const [acuity, setAcuity] = useState('all')
  const [view, setView] = useState<'waiting' | 'all' | 'reassessment'>('waiting')
  const [now, setNow] = useState(Date.now())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15_000); return () => window.clearInterval(timer) }, [])
  const refresh = () => { setRefreshing(true); window.setTimeout(() => { setNow(Date.now()); setRefreshing(false) }, 450) }

  const emergency = useMemo(() => state.patients.filter((patient) => patient.department === 'emergency' && patient.status !== 'discharged'), [state.patients])
  const patients = useMemo(() => emergency.filter((patient) => {
    if (view === 'waiting' && patient.status !== 'waiting') return false
    if (view === 'reassessment' && !(patient.status === 'waiting' && minutesSince(patient.arrival, now) >= 30)) return false
    if (acuity !== 'all' && patient.esi !== Number(acuity)) return false
    if (query && !`${patient.name} ${patient.mrn} ${patient.complaint} ${patient.location}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort((a, b) => a.esi - b.esi || a.arrival.localeCompare(b.arrival)), [emergency, view, acuity, query, now])

  const waiting = emergency.filter((patient) => patient.status === 'waiting')
  const reassessment = waiting.filter((patient) => minutesSince(patient.arrival, now) >= 30)
  const critical = emergency.filter((patient) => patient.esi <= 2)
  const longest = waiting.length ? Math.max(...waiting.map((patient) => minutesSince(patient.arrival, now))) : 0

  return <motion.div className="triage-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader eyebrow="EMERGENCY MEDICINE · LIVE SAFETY BOARD" title="Triage & waiting room" description="Prioritise arrivals, monitor deterioration and keep every reassessment visible." actions={<><Button variant="secondary" icon={RefreshCw} className={refreshing ? 'is-spinning' : ''} onClick={refresh}>Refresh</Button>{canEmergencyTriage && <Button icon={Plus} onClick={() => setTriageOpen(true)}>New patient triage</Button>}</>} />
    <div className="metrics-grid triage-metrics">
      <Metric label="Waiting now" value={waiting.length} detail={`${emergency.length} total active in Emergency`} icon={UsersRound} tone="blue" />
      <Metric label="ESI 1–2" value={critical.length} detail="High-acuity patients in the unit" icon={Siren} tone="coral" />
      <Metric label="Reassessment due" value={reassessment.length} detail="Waiting 30 minutes or longer" icon={TimerReset} tone="amber" />
      <Metric label="Longest current wait" value={`${longest}m`} detail="From arrival to clinician review" icon={Clock3} tone="teal" />
    </div>

    <div className="triage-layout">
      <Panel className="triage-board-panel">
        <div className="board-toolbar">
          <div className="view-tabs">{([['waiting', `Waiting room ${waiting.length}`], ['reassessment', `Reassess ${reassessment.length}`], ['all', `Full unit ${emergency.length}`]] as const).map(([value, label]) => <button key={value} className={view === value ? 'active' : ''} onClick={() => setView(value)}>{label}</button>)}</div>
          <div className="board-filters"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search queue…" /></label><label className="select-with-icon"><Filter size={15} /><select value={acuity} onChange={(event) => setAcuity(event.target.value)}><option value="all">All acuity</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>ESI {level}</option>)}</select></label></div>
        </div>
        <div className="queue-column-labels"><span><ArrowDownUp size={13} />Acuity / wait</span><span>Patient & presentation</span><span>Latest observations</span><span>Status</span><span /></div>
        <div className="triage-rows">
          <AnimatePresence mode="popLayout" initial={false}>
            {patients.map((patient) => {
              const wait = minutesSince(patient.arrival, now)
              const latestTriage = patient.timeline.find((event) => event.type === 'triage')
              return <motion.article layout key={patient.id} className={`triage-row ${patient.esi <= 2 ? 'high-acuity' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                <div className="triage-row-acuity"><EsiBadge level={patient.esi} /><span className={wait >= 60 ? 'danger-text' : ''}><Clock3 size={13} />{formatWait(patient.arrival, now)}</span></div>
                <button className="triage-patient-info" onClick={() => setSelectedPatientId(patient.id)}><Avatar name={patient.name} size="md" /><div><h3>{patient.name}<span>{patient.age}{patient.sex === 'Female' ? 'F' : patient.sex === 'Male' ? 'M' : 'NB'}</span></h3><small>{patient.mrn} · {patient.location}</small><p>{patient.complaint}</p><div className="triage-risks">{patient.riskFactors.slice(0, 2).map((risk) => <span key={risk}><AlertTriangle size={11} />{risk}</span>)}{!patient.riskFactors.length && <span className="stable-risk"><ShieldCheck size={11} />No risk flags</span>}</div></div></button>
                <div className="triage-vital-grid"><span className={patient.vitals.hr >= 120 ? 'abnormal' : ''}><small>HR</small><b>{patient.vitals.hr}</b><i>/min</i></span><span className={patient.vitals.rr >= 30 ? 'abnormal' : ''}><small>RR</small><b>{patient.vitals.rr}</b><i>/min</i></span><span className={patient.vitals.spo2 < 94 ? 'abnormal' : ''}><small>SpO₂</small><b>{patient.vitals.spo2}</b><i>%</i></span><span><small>BP</small><b>{patient.vitals.bpSys}/{patient.vitals.bpDia}</b><i>mmHg</i></span><span className={patient.vitals.temp >= 38 ? 'abnormal' : ''}><small>Temp</small><b>{patient.vitals.temp}</b><i>°C</i></span><span><small>Pain</small><b>{patient.vitals.pain}</b><i>/10</i></span></div>
                <div className="triage-row-status"><StatusBadge status={patient.status} /><small>{latestTriage ? relativeTime(latestTriage.at, now) : 'Not assessed'}</small>{wait >= 30 && patient.status === 'waiting' && <span className="reassess-flag"><TimerReset size={12} />Review due</span>}</div>
                <div className="triage-row-actions">{canEmergencyTriage && <button className="icon-button" title="Record reassessment" onClick={() => setReassess(patient)}><Activity size={17} /></button>}<button className="icon-button" title="Open patient chart" onClick={() => setSelectedPatientId(patient.id)}><ChevronRight size={18} /></button></div>
              </motion.article>
            })}
          </AnimatePresence>
          {patients.length === 0 && <EmptyState icon={UserRoundCheck} title={view === 'reassessment' ? 'No reassessments due' : 'No patients in this view'} text={query || acuity !== 'all' ? 'Try clearing the search or acuity filter.' : 'The queue is clear. New triage records will appear here immediately.'} action={(query || acuity !== 'all') ? <Button size="sm" variant="secondary" onClick={() => { setQuery(''); setAcuity('all') }}>Clear filters</Button> : undefined} />}
        </div>
        <div className="board-footer"><span><span className="live-dot" />Updated {refreshing ? 'now' : 'just now'} · Automatic refresh every 15 seconds</span><span>Showing {patients.length} of {emergency.length} active patients</span></div>
      </Panel>

      <aside className="triage-side">
        <Panel title="ESI response standard" action={<Info size={16} className="muted-icon" />}><div className="esi-standard-list">{([1, 2, 3, 4, 5] as Patient['esi'][]).map((level) => <div key={level}><span className="standard-level" style={{ background: esiLabels[level].color }}>{level}</span><div><b>{esiLabels[level].name}</b><p>{esiLabels[level].description}</p></div><strong>{esiLabels[level].target}</strong></div>)}</div><div className="standard-note"><Info size={15} /><p>ESI supports — never replaces — clinical judgement. Overrides require a documented rationale.</p></div></Panel>
        <Panel title="Waiting-room safety" action={<HeartPulse size={17} className="muted-icon" />}><div className="safety-checklist"><div className={reassessment.length ? 'attention' : ''}><span>{reassessment.length ? <AlertTriangle size={16} /> : <Check size={16} />}</span><p><b>{reassessment.length ? `${reassessment.length} reassessment${reassessment.length > 1 ? 's' : ''} due` : 'Reassessments up to date'}</b><small>Repeat observations for waits over 30 min</small></p></div><div className={critical.some((patient) => patient.status === 'waiting') ? 'attention' : ''}><span>{critical.some((patient) => patient.status === 'waiting') ? <AlertTriangle size={16} /> : <Check size={16} />}</span><p><b>{critical.filter((patient) => patient.status === 'waiting').length} high-acuity waiting</b><small>ESI 1–2 require immediate visibility</small></p></div><button onClick={() => setView('reassessment')}>Open reassessment view<ChevronRight size={15} /></button></div></Panel>
      </aside>
    </div>

    {canEmergencyTriage && <TriageModal open={triageOpen} onClose={() => setTriageOpen(false)} onCreated={(id) => setSelectedPatientId(id)} />}
    {reassess && <RetriageModal patient={reassess} open={!!reassess} onClose={() => setReassess(null)} />}
  </motion.div>
}