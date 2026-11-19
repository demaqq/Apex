import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Baby, Brain, Zap, ClipboardList, Droplets, FlaskConical, GlassWater, HeartPulse, NotebookPen, Pill, Ruler, ScanLine, Scissors, Syringe, Timer, Utensils, Waves } from 'lucide-react'
import { isChild, isObstetric, isUnderFive } from '../lib/charts'
import { AntenatalChart, ContractionChart, FluidChart, GlucoseChart, PaediatricChart, PartographChart, PostpartumChart, SamChart } from './SpecialtyCharts'
import { ImageStrip } from './OrderImages'
import { RoundsView } from './RoundAssessment'
import { NeuroChart, NihssChart, SeizureChart } from './NeuroCharts'
import { patientNews2, stagesFor, orderStage, THEATRE_STAGES } from '../lib/clinical'
import { formatDate, formatDateTime, formatTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ObservationContext, ObservationSet, Patient } from '../types'
import { OBSERVATION_CONTEXTS } from '../types'
import { ObservationsPanel } from './RecordPanels'
import { Chip } from './ui'

type CoreView = 'vitals' | 'medications' | 'procedures' | 'investigations' | 'rounds'
type SpecialtyView = 'paediatric' | 'sam' | 'anc' | 'partograph' | 'contractions' | 'postpartum' | 'fluids' | 'glucose' | 'neuro' | 'nihss' | 'seizures'
type View = CoreView | SpecialtyView
const VIEWS: Array<[CoreView, string, typeof HeartPulse]> = [
  ['vitals', 'Vitals', HeartPulse],
  ['medications', 'Medications', Pill],
  ['procedures', 'Procedures', Scissors],
  ['investigations', 'Investigations', FlaskConical],
  ['rounds', 'Rounds & bedside', NotebookPen],
]

/** Specialty charts that apply to this patient, most relevant first. */
function specialtyViews(patient: Patient): Array<[SpecialtyView, string, typeof HeartPulse]> {
  const c = patient.charts ?? {}
  const views: Array<[SpecialtyView, string, typeof HeartPulse]> = []
  if (isObstetric(patient) || c.labour?.length) views.push(['partograph', 'Partograph', Timer], ['contractions', 'Contractions', Waves])
  if (isObstetric(patient) || c.anc?.length) views.push(['anc', 'Antenatal', Baby])
  if (isObstetric(patient) || c.postpartum?.length) views.push(['postpartum', 'Postpartum & gyn bleeding', Droplets])
  if (isUnderFive(patient) || c.sam?.length) views.push(['sam', 'SAM', Utensils])
  if (isChild(patient)) views.push(['paediatric', 'Paediatric & growth', Ruler])
  views.push(['neuro', 'GCS & neuro obs', Brain])
  if (['neurology', 'emergency', 'icu'].includes(patient.department) || c.nihss?.length) views.push(['nihss', 'Stroke scale (NIHSS)', Brain])
  if (['neurology', 'pediatrics', 'obgyn', 'emergency', 'icu'].includes(patient.department) || c.seizures?.length) views.push(['seizures', 'Seizures', Zap])
  views.push(['fluids', 'Fluid balance', GlassWater], ['glucose', 'Glucose', Syringe])
  // Put charts that already hold data first.
  const has = (v: SpecialtyView) => Boolean(v === 'partograph' || v === 'contractions' ? c.labour?.length : v === 'paediatric' ? patient.growth?.length : v === 'fluids' ? c.fluids?.length : v === 'glucose' ? c.glucose?.length : v === 'neuro' ? c.neuro?.length : v === 'nihss' ? c.nihss?.length : v === 'seizures' ? c.seizures?.length : v === 'sam' ? c.sam?.length : v === 'anc' ? c.anc?.length : c.postpartum?.length)
  return [...views.filter(([v]) => has(v)), ...views.filter(([v]) => !has(v))]
}

const DAY = 86_400_000
/** Hospital day number counted from arrival (day 1 = day of arrival). */
const hospitalDay = (patient: Patient, at: string) => {
  const start = new Date(patient.arrival); start.setHours(0, 0, 0, 0)
  return Math.floor((new Date(at).getTime() - start.getTime()) / DAY) + 1
}

const defaultView = (patient: Patient): View => patient.charts?.labour?.length && patient.status !== 'discharged' ? 'partograph' : patient.charts?.sam?.length && patient.status !== 'discharged' ? 'sam' : patient.department === 'neurology' && patient.charts?.neuro?.length ? 'neuro' : 'vitals'

export function ChartsPanel({ patient }: { patient: Patient }) {
  const [view, setView] = useState<View>(() => defaultView(patient))
  const extra = specialtyViews(patient)
  return (
    <>
      <div className="segmented chart-switch" role="tablist" aria-label="Patient charts">
        {VIEWS.map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'on' : ''} onClick={() => setView(id)}><Icon size={14} />{label}</button>)}
      </div>
      <div className="chart-chips" role="tablist" aria-label="Specialty charts">
        <span>Specialty charts</span>
        {extra.map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={view === id} className={`pick-chip ${view === id ? 'on' : ''}`} onClick={() => setView(id)}><Icon size={13} />{label}</button>)}
      </div>
      {view === 'vitals' && <VitalsView patient={patient} />}
      {view === 'medications' && <MedicationChart patient={patient} />}
      {view === 'procedures' && <ProcedureChart patient={patient} />}
      {view === 'investigations' && <InvestigationChart patient={patient} />}
      {view === 'rounds' && <RoundsView patient={patient} />}
      {view === 'paediatric' && <PaediatricChart patient={patient} />}
      {view === 'sam' && <SamChart patient={patient} />}
      {view === 'anc' && <AntenatalChart patient={patient} />}
      {view === 'partograph' && <PartographChart patient={patient} />}
      {view === 'contractions' && <ContractionChart patient={patient} />}
      {view === 'postpartum' && <PostpartumChart patient={patient} />}
      {view === 'fluids' && <FluidChart patient={patient} />}
      {view === 'glucose' && <GlucoseChart patient={patient} />}
      {view === 'neuro' && <NeuroChart patient={patient} />}
      {view === 'nihss' && <NihssChart patient={patient} />}
      {view === 'seizures' && <SeizureChart patient={patient} />}
    </>
  )
}

/* ---------------- Vitals trend ---------------- */

interface Series { label: string; color: string; value: (set: ObservationSet) => number | undefined; dashed?: boolean }
interface TrendSpec { title: string; unit: string; series: Series[]; normal: [number, number]; abnormal: (value: number, series: number) => boolean; domain?: [number, number] }

const C1 = 'var(--series-1)'
const C2 = 'var(--series-2)'

function trendSpecs(patient: Patient): TrendSpec[] {
  const child = patient.age < 12
  const specs: TrendSpec[] = [
    { title: 'Heart rate', unit: '/min', series: [{ label: 'HR', color: C1, value: (s) => s.hr }], normal: child ? [70, 140] : [51, 90], abnormal: (v) => child ? v > 150 || v < 60 : v > 110 || v < 50 },
    { title: 'Blood pressure', unit: 'mmHg', series: [{ label: 'Systolic', color: C1, value: (s) => s.bpSys }, { label: 'Diastolic', color: C2, value: (s) => s.bpDia, dashed: true }], normal: [60, 140], abnormal: (v, i) => i === 0 ? v >= 160 || v < 90 : v >= 100 },
    { title: 'Respiratory rate', unit: '/min', series: [{ label: 'RR', color: C1, value: (s) => s.rr }], normal: child ? [18, 30] : [12, 20], abnormal: (v) => child ? v > 30 : v >= 25 || v <= 8 },
    { title: 'SpO₂', unit: '%', series: [{ label: 'SpO₂', color: C1, value: (s) => s.spo2 }], normal: [96, 100], abnormal: (v) => v <= 91, domain: [80, 100] },
    { title: 'Temperature', unit: '°C', series: [{ label: 'Temp', color: C1, value: (s) => s.temp }], normal: [36.1, 38], abnormal: (v) => v >= 38.5 || v < 35.5 },
  ]
  if (patient.age >= 16) specs.push({ title: 'NEWS2', unit: 'score', series: [{ label: 'NEWS2', color: C1, value: (s) => patientNews2({ ...patient, vitals: s, observations: [s] })?.score }], normal: [0, 4], abnormal: (v) => v >= 5, domain: [0, 12] })
  return specs
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(320)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, Math.round(entry.contentRect.width))))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function Marker({ context, x, y, fill, ring }: { context?: ObservationContext; x: number; y: number; fill: string; ring: string }) {
  const common = { fill, stroke: ring, strokeWidth: 2 }
  if (context === 'Triage') return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} rx={1.5} {...common} />
  if (context === 'Ward round') return <path d={`M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`} {...common} />
  return <circle cx={x} cy={y} r={4.5} {...common} />
}

function TrendChart({ spec, sets, range }: { spec: TrendSpec; sets: ObservationSet[]; range: [number, number] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const height = 132
  const pad = { l: 34, r: 14, t: 12, b: 22 }
  const values = sets.flatMap((set) => spec.series.map((series) => series.value(set))).filter((v): v is number => v !== undefined)
  const lo = spec.domain?.[0] ?? Math.min(spec.normal[0], ...values)
  const hi = spec.domain?.[1] ?? Math.max(spec.normal[1], ...values)
  const span = hi - lo || 1
  const min = lo - span * 0.08
  const max = hi + span * 0.08
  const [t0, t1] = range
  const x = (at: string) => pad.l + ((new Date(at).getTime() - t0) / (t1 - t0 || 1)) * (width - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b)
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v * 10) / 10)
  const days: number[] = []
  for (let d = new Date(t0).setHours(24, 0, 0, 0); d < t1; d += DAY) days.push(d)
  const latest = sets[sets.length - 1]

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - box.left) / box.width) * width
    let best = 0
    sets.forEach((set, index) => { if (Math.abs(x(set.at) - px) < Math.abs(x(sets[best].at) - px)) best = index })
    setHover(best)
  }
  const hovered = hover !== null ? sets[hover] : null

  return (
    <figure className="trend-card">
      <figcaption>
        <b>{spec.title}</b>
        {latest && <span>{spec.series.map((series) => series.value(latest)).filter((v) => v !== undefined).join('/')} <small>{spec.unit}</small></span>}
      </figcaption>
      {spec.series.length > 1 && <div className="trend-legend">{spec.series.map((series) => <span key={series.label}><i style={{ background: series.color }} className={series.dashed ? 'dashed' : ''} />{series.label}</span>)}</div>}
      <div className="trend-plot" ref={ref}>
        <svg width={width} height={height} role="img" aria-label={`${spec.title} trend, ${sets.length} readings`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <rect className="trend-band" x={pad.l} width={width - pad.l - pad.r} y={y(Math.min(spec.normal[1], max))} height={Math.max(0, y(Math.max(spec.normal[0], min)) - y(Math.min(spec.normal[1], max)))} />
          {ticks.map((tick) => <g key={tick}><line className="trend-grid" x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} /><text className="trend-axis" x={pad.l - 6} y={y(tick) + 3} textAnchor="end">{tick}</text></g>)}
          {days.map((d) => <g key={d}><line className="trend-day" x1={x(new Date(d).toISOString())} x2={x(new Date(d).toISOString())} y1={pad.t} y2={height - pad.b} /><text className="trend-axis" x={x(new Date(d).toISOString()) + 3} y={height - 6}>{new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</text></g>)}
          {days.length === 0 && sets.length > 0 && <text className="trend-axis" x={pad.l} y={height - 6}>{formatTime(sets[0].at)}</text>}
          {hovered && <line className="trend-cross" x1={x(hovered.at)} x2={x(hovered.at)} y1={pad.t} y2={height - pad.b} />}
          {spec.series.map((series, si) => {
            const points = sets.map((set) => [set, series.value(set)] as const).filter((pair): pair is readonly [ObservationSet, number] => pair[1] !== undefined)
            return (
              <g key={series.label}>
                <path d={points.map(([set, v], i) => `${i ? 'L' : 'M'}${x(set.at).toFixed(1)} ${y(v).toFixed(1)}`).join('')} fill="none" stroke={series.color} strokeWidth={2} strokeDasharray={series.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                {points.map(([set, v]) => <Marker key={set.at} context={set.context} x={x(set.at)} y={y(v)} fill={spec.abnormal(v, si) ? 'var(--danger)' : series.color} ring="var(--paper)" />)}
                {spec.series.length > 1 && points.length > 0 && <text className="trend-direct" x={Math.min(x(points[points.length - 1][0].at) + 8, width - pad.r)} y={y(points[points.length - 1][1]) + (si ? 12 : -8)} textAnchor="end">{series.label === 'Systolic' ? 'Sys' : 'Dia'}</text>}
              </g>
            )
          })}
        </svg>
        {hovered && (
          <div className="trend-tip" style={{ left: Math.min(Math.max(x(hovered.at), 70), width - 70) }}>
            <b>{formatDateTime(hovered.at)}</b>
            <span>{hovered.context ?? 'Bedside'} · {hovered.by}</span>
            {spec.series.map((series, si) => { const v = series.value(hovered); return v === undefined ? null : <span key={series.label} className={spec.abnormal(v, si) ? 'danger-text' : ''}>{series.label} <b>{v}</b> {spec.unit}</span> })}
          </div>
        )}
      </div>
    </figure>
  )
}

function VitalsView({ patient }: { patient: Patient }) {
  const [context, setContext] = useState<'all' | ObservationContext>('all')
  const all = useMemo(() => [...(patient.observations ?? [])].sort((a, b) => a.at.localeCompare(b.at)), [patient.observations])
  const sets = context === 'all' ? all : all.filter((set) => (set.context ?? 'Bedside') === context)
  const used = OBSERVATION_CONTEXTS.filter((item) => all.some((set) => (set.context ?? 'Bedside') === item))
  const range: [number, number] = all.length ? [new Date(all[0].at).getTime(), Math.max(new Date(all[all.length - 1].at).getTime(), new Date(all[0].at).getTime() + 3_600_000)] : [0, 1]
  const counts = Object.fromEntries(used.map((item) => [item, all.filter((set) => (set.context ?? 'Bedside') === item).length]))

  return (
    <>
      <section className="drawer-section">
        <div className="section-label"><Activity size={15} />Vital signs trend<span>{all.length} sets · {all.length ? `${formatDate(all[0].at)} – ${formatDate(all[all.length - 1].at)}` : 'none yet'}</span></div>
        {all.length > 0 && (
          <div className="trend-toolbar">
            <div className="segmented small">
              <button type="button" className={context === 'all' ? 'on' : ''} onClick={() => setContext('all')}>All</button>
              {used.map((item) => <button key={item} type="button" className={context === item ? 'on' : ''} onClick={() => setContext(item)}>{item} <small>{counts[item]}</small></button>)}
            </div>
            <div className="trend-key" aria-label="Marker key">
              <span><svg width="14" height="14"><Marker context="Triage" x={7} y={7} fill="var(--muted)" ring="var(--paper)" /></svg>Triage</span>
              <span><svg width="14" height="14"><Marker context="Ward round" x={7} y={7} fill="var(--muted)" ring="var(--paper)" /></svg>Ward round</span>
              <span><svg width="14" height="14"><Marker context="Bedside" x={7} y={7} fill="var(--muted)" ring="var(--paper)" /></svg>Bedside / other</span>
              <span><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="var(--danger)" /></svg>Out of range</span>
              <span><i className="band-swatch" />Normal range</span>
            </div>
          </div>
        )}
        {all.length === 0 ? <p className="record-hint">No vital signs recorded yet. Triage, ward-round and bedside observations will build up a trend here.</p> : sets.length === 0 ? <p className="record-hint">No {context.toLowerCase()} observations.</p> : (
          <div className="trend-grid-wrap">{trendSpecs(patient).map((spec) => <TrendChart key={spec.title} spec={spec} sets={sets} range={range} />)}</div>
        )}
      </section>
      <ObservationsPanel patient={patient} />
    </>
  )
}

/* ---------------- Medication administration chart ---------------- */

function MedicationChart({ patient }: { patient: Patient }) {
  const { state } = useHospital()
  const prescriptions = state.prescriptions.filter((rx) => rx.patientId === patient.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (!prescriptions.length) return <section className="drawer-section"><div className="drawer-empty"><Pill size={25} /><p>No medicines prescribed on this episode.</p></div></section>

  const first = Math.min(new Date(patient.arrival).getTime(), ...prescriptions.map((rx) => new Date(rx.createdAt).getTime()))
  const start = new Date(first); start.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const totalDays = Math.round((today.getTime() - start.getTime()) / DAY) + 1
  const days = Array.from({ length: Math.min(totalDays, 7) }, (_, i) => new Date(today.getTime() - (Math.min(totalDays, 7) - 1 - i) * DAY))
  const log = prescriptions.flatMap((rx) => (rx.administrations ?? []).map((dose) => ({ ...dose, rx }))).sort((a, b) => b.at.localeCompare(a.at))
  const totalDoses = log.length

  return (
    <>
      <section className="drawer-section">
        <div className="section-label"><Pill size={15} />Medication chart<span>{prescriptions.length} prescriptions · {totalDoses} doses given</span></div>
        <div className="table-wrap">
          <table className="data-table compact mar-chart">
            <thead><tr><th>Medicine</th>{days.map((day) => <th key={day.getTime()} className="num">{day.getTime() === today.getTime() ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</th>)}<th>Status</th></tr></thead>
            <tbody>
              {prescriptions.flatMap((rx) => rx.items.map((item, index) => {
                const med = state.formulary.find((entry) => entry.id === item.medicationId)
                return (
                  <tr key={`${rx.id}-${index}`} className={rx.status === 'Cancelled' ? 'is-cancelled' : ''}>
                    <td><b>{med?.name ?? item.medicationId} {item.dosage}</b><small>{item.frequency} · {med?.route ?? ''} · {item.duration} · from {formatDate(rx.createdAt)}</small></td>
                    {days.map((day) => {
                      const doses = (rx.administrations ?? []).filter((dose) => { const at = new Date(dose.at).getTime(); return at >= day.getTime() && at < day.getTime() + DAY })
                      const active = new Date(rx.createdAt).getTime() < day.getTime() + DAY && rx.status !== 'Cancelled'
                      return <td key={day.getTime()} className="num mar-cell" title={doses.map((dose) => `${formatTime(dose.at)} · ${dose.by}`).join('\n') || (active ? 'No doses recorded' : 'Not prescribed yet')}>
                        {doses.length ? <span className="mar-doses">{doses.map((dose) => <i key={dose.at} />)}<b>{doses.length}</b></span> : active ? <span className="muted-text">–</span> : ''}
                      </td>
                    })}
                    <td><Chip tone={rx.status === 'Cancelled' ? 'danger' : rx.status === 'Pending' ? 'warning' : 'success'}>{rx.status}</Chip></td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>
        <p className="record-hint">Each dot is a dose given that day. Hover a cell to see the times and who gave them.</p>
      </section>
      <section className="drawer-section">
        <div className="section-label"><ClipboardList size={15} />Administration record<span>{totalDoses} entries</span></div>
        {log.length === 0 ? <p className="record-hint">No doses given yet.</p> : (
          <ol className="history-list">
            {log.map((dose) => <li key={`${dose.rx.id}-${dose.at}`}><time>{formatDateTime(dose.at)}</time><div><b>{dose.rx.items.map((item) => `${state.formulary.find((entry) => entry.id === item.medicationId)?.name ?? item.medicationId} ${item.dosage}`).join(' + ')}</b><small>Given by {dose.by} · {dose.rx.id}</small></div></li>)}
          </ol>
        )}
      </section>
    </>
  )
}

/* ---------------- Procedures ---------------- */

const PROCEDURE_KINDS = ['Procedure', 'Physiotherapy', 'Nutrition', 'Blood bank']

function ProcedureChart({ patient }: { patient: Patient }) {
  const { state } = useHospital()
  const entries = [
    ...state.orders.filter((order) => order.patientId === patient.id && PROCEDURE_KINDS.includes(order.kind)).map((order) => ({
      id: order.id, at: order.createdAt, title: order.title, kind: order.kind, by: order.createdBy, stage: stagesFor(order)[orderStage(order)], done: order.status === 'completed', result: order.result,
    })),
    ...state.theatreCases.filter((item) => item.patientId === patient.id).map((item) => ({
      id: item.id, at: (() => { const d = new Date(); const [h, m] = item.time.split(':').map(Number); d.setHours(h, m, 0, 0); return d.toISOString() })(), title: item.procedure, kind: `Theatre · ${item.room}`, by: item.surgeon, stage: THEATRE_STAGES[item.stage], done: item.stage >= 3, result: item.anaesthesia ? `${item.anaesthesia.technique}, ASA ${item.anaesthesia.asa} · ${item.anaesthesia.by}` : undefined,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <section className="drawer-section">
      <div className="section-label"><Scissors size={15} />Procedures & therapies<span>{entries.length} entries</span></div>
      {entries.length === 0 ? <div className="drawer-empty"><Scissors size={25} /><p>No procedures, theatre cases or therapies on this episode.</p></div> : (
        <ol className="history-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <time>{formatDateTime(entry.at)}<small>Day {hospitalDay(patient, entry.at)}</small></time>
              <div>
                <b>{entry.title}</b>
                <small>{entry.kind} · {entry.by} · <span className="mono">{entry.id}</span></small>
                {entry.result && <p>{entry.result}</p>}
              </div>
              <Chip tone={entry.done ? 'success' : 'accent'}>{entry.stage}</Chip>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ---------------- Investigations ---------------- */

function InvestigationChart({ patient }: { patient: Patient }) {
  const { state } = useHospital()
  const [kind, setKind] = useState<'all' | 'Laboratory' | 'Imaging'>('all')
  const orders = state.orders.filter((order) => order.patientId === patient.id && (order.kind === 'Laboratory' || order.kind === 'Imaging')).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const shown = orders.filter((order) => kind === 'all' || order.kind === kind)
  const byDay = new Map<number, typeof shown>()
  shown.forEach((order) => { const day = hospitalDay(patient, order.createdAt); byDay.set(day, [...(byDay.get(day) ?? []), order]) })
  return (
    <section className="drawer-section">
      <div className="section-label"><FlaskConical size={15} />Investigation history<span>{orders.filter((order) => order.result).length} of {orders.length} resulted</span></div>
      {orders.length > 0 && <div className="segmented small"><button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>All</button><button type="button" className={kind === 'Laboratory' ? 'on' : ''} onClick={() => setKind('Laboratory')}>Laboratory</button><button type="button" className={kind === 'Imaging' ? 'on' : ''} onClick={() => setKind('Imaging')}>Imaging</button></div>}
      {shown.length === 0 ? <div className="drawer-empty"><FlaskConical size={25} /><p>No {kind === 'all' ? 'investigations' : kind.toLowerCase()} on this episode.</p></div> : [...byDay.entries()].map(([day, items]) => (
        <div key={day} className="history-day">
          <h4>Day {day} · {formatDate(items[0].createdAt)}</h4>
          <ol className="history-list">
            {items.map((order) => {
              const provider = order.externalProviderId ? state.providers.find((item) => item.id === order.externalProviderId) : undefined
              return (
                <li key={order.id}>
                  <time>{formatTime(order.createdAt)}</time>
                  <div>
                    <b>{order.kind === 'Imaging' ? <ScanLine size={13} /> : <FlaskConical size={13} />} {order.title}</b>
                    <small>{order.createdBy} · {provider ? `Referred to ${provider.name}` : 'In-house'} · <span className="mono">{order.id}</span></small>
                    {order.result ? <p className="result-line">{order.result}</p> : <p className="muted-text">Awaiting result</p>}<ImageStrip order={order} />
                  </div>
                  <Chip tone={order.status === 'completed' ? 'success' : order.priority === 'emergent' ? 'danger' : 'warning'}>{stagesFor(order)[orderStage(order)]}</Chip>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}
