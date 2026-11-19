import { useState, type ReactNode } from 'react'
import { AlertTriangle, Baby, CheckCircle2, Droplets, HeartPulse, Plus, Ruler, Syringe, Timer, Utensils } from 'lucide-react'
import { WEIGHT_MEDIAN } from '../lib/clinical'
import { ancFlags, chartDayStart, contractionBand, fluidDay, glucoseFlag, muacClass, OEDEMA_GRADES, partograph, postpartumSummary, samSummary, toMmol, type Flag } from '../lib/charts'
import { formatDate, formatDateTime, formatTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { AncVisit, ChartEntryInput, ChartKey, FluidEntry, LabourEntry, Oedema, Patient, PostpartumEntry, SamEntry, SamPhase } from '../types'
import { Plot, PlotLegend, type PlotPoint } from './Plot'
import { Button } from './ui'

const HOUR = 3_600_000
const DAY = 86_400_000
const C1 = 'var(--series-1)'
const C2 = 'var(--series-2)'

/* ---------------- Shared pieces ---------------- */

function Flags({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null
  return <section className="record-alerts">{flags.map((flag) => <p key={flag.text} className={flag.tone === 'success' ? 'success' : flag.tone}>{flag.tone === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{flag.text}</p>)}</section>
}

function Stat({ label, value, detail, tone }: { label: string; value: ReactNode; detail?: ReactNode; tone?: 'danger' | 'warning' | 'success' }) {
  return <div className={`chart-stat ${tone ?? ''}`}><span>{label}</span><b>{value}</b>{detail && <small>{detail}</small>}</div>
}

const Tip = ({ title, lines }: { title: string; lines: Array<ReactNode | false | undefined> }) => <><b>{title}</b>{lines.filter(Boolean).map((line, i) => <span key={i}>{line}</span>)}</>

const num = (value: string) => (value.trim() === '' ? undefined : Number(value))

function useChartForm<K extends ChartKey>(patient: Patient, chart: K) {
  const { can, addChartEntry } = useHospital()
  const [error, setError] = useState('')
  const editable = (can('vitals') || can('notes')) && patient.status !== 'discharged'
  const save = (entry: ChartEntryInput<K>, summary: string) => { addChartEntry(patient.id, chart, entry, summary); setError('') }
  return { editable, error, setError, save }
}

function Field({ label, unit, children, wide }: { label: string; unit?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`form-field ${wide ? 'span-2' : ''}`}><span>{label}{unit && <small className="muted-text"> {unit}</small>}</span>{children}</label>
}

function FormError({ error }: { error: string }) {
  return error ? <div className="inline-error" role="alert"><AlertTriangle size={16} />{error}</div> : null
}

/** Ticks for an hours axis whose zero is `t0` (ms). */
function hourTicks(t0: number, hours: number, step: number) {
  return Array.from({ length: Math.floor(hours / step) + 1 }, (_, i) => ({ v: i * step, label: new Date(t0 + i * step * HOUR).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) }))
}

function dayTicks(t0: number, t1: number) {
  const ticks: Array<{ v: number; label: string }> = []
  for (let d = new Date(t0).setHours(24, 0, 0, 0); d < t1; d += DAY) ticks.push({ v: (d - t0) / HOUR, label: new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })
  return ticks
}

/* ================= Paediatric chart ================= */

const PAEDS_RANGES: Array<{ band: string; max: number; hr: [number, number]; rr: [number, number]; sbp: [number, number] }> = [
  { band: 'Under 1 year', max: 1, hr: [110, 160], rr: [30, 40], sbp: [80, 90] },
  { band: '1–2 years', max: 2, hr: [100, 150], rr: [25, 35], sbp: [85, 95] },
  { band: '2–5 years', max: 5, hr: [95, 140], rr: [25, 30], sbp: [85, 100] },
  { band: '5–12 years', max: 12, hr: [80, 120], rr: [20, 25], sbp: [90, 110] },
  { band: 'Over 12 years', max: 99, hr: [60, 100], rr: [15, 20], sbp: [100, 120] },
]

export function PaediatricChart({ patient }: { patient: Patient }) {
  const { can, recordGrowth } = useHospital()
  const [form, setForm] = useState({ weight: '', height: '', muac: '', head: '' })
  const growth = patient.growth ?? []
  const sex = patient.sex === 'Female' ? 'Female' : 'Male'
  const median = WEIGHT_MEDIAN[sex]
  const ageAt = (at: string) => Math.max(0, patient.age - (Date.now() - new Date(at).getTime()) / (365.25 * DAY))
  const latest = growth[growth.length - 1]
  const weight = patient.weightKg ?? latest?.weightKg
  const range = PAEDS_RANGES.find((item) => patient.age < item.max) ?? PAEDS_RANGES[4]
  const v = patient.vitals
  const outside = (value: number, [lo, hi]: [number, number]) => value < lo || value > hi
  const maintenance = weight ? (weight <= 10 ? weight * 100 : weight <= 20 ? 1000 + (weight - 10) * 50 : 1500 + (weight - 20) * 20) : 0
  const xMax = Math.max(5, Math.ceil(patient.age + 1))
  const medianAt = (factor: number) => median.slice(0, xMax).map((kg, i) => [i + 1, kg * factor] as [number, number])
  const muac = latest?.muacCm
  const flags: Flag[] = []
  if (muac !== undefined && patient.age < 5) flags.push(muacClass(muac))
  if (latest && patient.age >= 1 && patient.age <= 10) {
    const expected = median[Math.max(0, Math.min(9, Math.round(patient.age) - 1))]
    if (latest.weightKg < expected * 0.78) flags.push({ tone: 'warning', text: `Weight ${latest.weightKg} kg is well below the median for age (${expected} kg)` })
  }

  const save = () => {
    const w = Number(form.weight)
    if (!w) return
    recordGrowth(patient.id, { ageYears: patient.age, weightKg: w, heightCm: Number(form.height) || latest?.heightCm || 0, muacCm: num(form.muac), headCm: num(form.head) })
    setForm({ weight: '', height: '', muac: '', head: '' })
  }

  return (
    <>
      <Flags flags={flags} />
      <section className="drawer-section">
        <div className="section-label"><Ruler size={15} />Weight for age<span>{growth.length} measurements</span></div>
        <Plot label="Weight for age" height={210} x={[0, xMax]} y={[0, Math.ceil(Math.max(median[Math.min(9, xMax - 1)] * 1.35, ...growth.map((g) => g.weightKg)) / 5) * 5]}
          xTicks={Array.from({ length: xMax + 1 }, (_, i) => ({ v: i, label: `${i}y` }))} yTicks={[0, 5, 10, 15, 20, 25, 30, 35, 40].filter((t) => t <= Math.max(median[Math.min(9, xMax - 1)] * 1.35, 10) + 5)} yTitle="kg"
          refs={[{ id: 'hi', label: 'High', points: medianAt(1.28), tone: 'ref' }, { id: 'med', label: 'Median', points: medianAt(1), tone: 'alert' }, { id: 'lo', label: 'Low', points: medianAt(0.78), tone: 'ref' }]}
          series={[{ id: 'w', color: C1, points: growth.map((g) => ({ key: g.at, x: ageAt(g.at), y: g.weightKg, tip: <Tip title={formatDate(g.at)} lines={[`Weight ${g.weightKg} kg`, g.heightCm ? `Height ${g.heightCm} cm` : false, g.muacCm ? `MUAC ${g.muacCm} cm` : false]} /> })) }]} />
        <p className="record-hint">Median and range lines are approximate ({sex === 'Male' ? 'boys' : 'girls'}). Use the WHO growth standards for clinical decisions.</p>
      </section>

      <section className="drawer-section">
        <div className="section-label"><HeartPulse size={15} />Normal ranges for age<span>{range.band}</span></div>
        <div className="chart-stats">
          <Stat label="Heart rate" value={v.hr || '–'} detail={`Normal ${range.hr.join('–')}`} tone={v.hr && outside(v.hr, range.hr) ? 'danger' : undefined} />
          <Stat label="Breathing rate" value={v.rr || '–'} detail={`Normal ${range.rr.join('–')}`} tone={v.rr && outside(v.rr, range.rr) ? 'danger' : undefined} />
          <Stat label="Systolic BP" value={v.bpSys || '–'} detail={`Normal ${range.sbp.join('–')}`} tone={v.bpSys && v.bpSys < range.sbp[0] - 10 ? 'danger' : undefined} />
          {weight !== undefined && <Stat label="Maintenance fluid" value={`${Math.round(maintenance / 24)} ml/h`} detail={`${Math.round(maintenance)} ml/day for ${weight} kg (Holliday–Segar)`} />}
        </div>
        {patient.charts?.sam?.length ? <p className="record-hint">Child is on the SAM protocol: give IV fluids only for shock, and follow the SAM chart for feeds.</p> : null}
      </section>

      <section className="drawer-section">
        <div className="section-label"><Ruler size={15} />Measurements</div>
        <div className="table-wrap"><table className="data-table compact">
          <thead><tr><th>Date</th><th className="num">Weight</th><th className="num">Height</th><th className="num">MUAC</th><th className="num">Head</th></tr></thead>
          <tbody>{[...growth].reverse().map((g) => <tr key={g.at}><td>{formatDate(g.at)}</td><td className="num">{g.weightKg} kg</td><td className="num">{g.heightCm ? `${g.heightCm} cm` : '–'}</td><td className={`num ${g.muacCm !== undefined && g.muacCm < 11.5 && patient.age < 5 ? 'danger-text' : ''}`}>{g.muacCm ? `${g.muacCm} cm` : '–'}</td><td className="num">{g.headCm ? `${g.headCm} cm` : '–'}</td></tr>)}</tbody>
        </table></div>
        {can('vitals') && patient.status !== 'discharged' && (
          <div className="form-grid chart-form">
            <Field label="Weight" unit="kg"><input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></Field>
            <Field label="Height / length" unit="cm"><input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></Field>
            <Field label="MUAC" unit="cm"><input type="number" step="0.1" value={form.muac} onChange={(e) => setForm({ ...form, muac: e.target.value })} /></Field>
            <Field label="Head circumference" unit="cm"><input type="number" step="0.1" value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} /></Field>
            <div className="panel-actions"><Button icon={Plus} disabled={!Number(form.weight)} onClick={save}>Record measurement</Button></div>
          </div>
        )}
      </section>
    </>
  )
}

/* ================= Severe acute malnutrition ================= */

const PHASES: SamPhase[] = ['Stabilisation', 'Transition', 'Rehabilitation']
const COMPLICATIONS = ['Hypoglycaemia', 'Hypothermia', 'Dehydration', 'Shock', 'Severe anaemia', 'Vomiting', 'Diarrhoea', 'Infection / fever', 'Not eating']

export function SamChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.sam ?? []
  const summary = samSummary(entries)
  const { editable, error, setError, save } = useChartForm(patient, 'sam')
  const last = entries[entries.length - 1]
  const [form, setForm] = useState({ weight: '', muac: '', temp: '', feedsTaken: '', oedema: (last?.oedema ?? '0') as Oedema, phase: (last?.phase ?? 'Stabilisation') as SamPhase, feed: (last?.feed ?? 'F-75') as SamEntry['feed'], appetite: 'Not done' as NonNullable<SamEntry['appetite']>, complications: [] as string[], note: '' })

  const submit = () => {
    const weightKg = Number(form.weight)
    if (!weightKg || weightKg < 1 || weightKg > 40) { setError('Enter today’s weight in kg.'); return }
    const plan = form.phase === 'Stabilisation' ? 8 : 6
    save({ phase: form.phase, weightKg, oedema: form.oedema, muacCm: num(form.muac), temp: num(form.temp), feed: form.feed, feedsPlanned: plan, feedsTaken: num(form.feedsTaken), appetite: form.appetite, complications: form.complications, note: form.note.trim() || undefined }, `${form.phase}: ${weightKg} kg, oedema ${form.oedema}${form.muac ? `, MUAC ${form.muac} cm` : ''}, ${form.feed}.`)
    setForm({ ...form, weight: '', muac: '', temp: '', feedsTaken: '', complications: [], note: '' })
  }

  const t0 = entries.length ? new Date(entries[0].at).getTime() : Date.now()
  const dayOf = (at: string) => (new Date(at).getTime() - t0) / DAY + 1
  const lastDay = summary ? Math.max(summary.day + 1, 8) : 8
  const weights = entries.map((e) => e.weightKg)

  return (
    <>
      {!summary ? <section className="drawer-section"><div className="drawer-empty"><Utensils size={25} /><p>No SAM monitoring yet. Record the admission weight, oedema and MUAC to start the chart.</p></div></section> : (
        <>
          <Flags flags={[...summary.flags, ...(summary.readyForDischarge ? [{ tone: 'success' as const, text: 'Meets discharge criteria — plan outpatient follow-up' }] : [])]} />
          <section className="drawer-section">
            <div className="section-label"><Utensils size={15} />SAM treatment<span>Day {summary.day} · {summary.latest.phase} phase</span></div>
            <div className="chart-stats">
              <Stat label="Weight today" value={`${summary.latest.weightKg} kg`} detail={`Admission ${summary.first.weightKg} kg · lowest ${summary.lowest.weightKg} kg`} />
              <Stat label="Target weight" value={`${summary.target} kg`} detail={<span className="progress-line"><i style={{ width: `${Math.min(100, Math.max(0, ((summary.latest.weightKg - summary.lowest.weightKg) / (summary.target - summary.lowest.weightKg || 1)) * 100))}%` }} /></span>} />
              <Stat label="Weight gain (3 days)" value={summary.gain === null ? '–' : `${summary.gain.toFixed(1)} g/kg/day`} detail={summary.latest.oedema !== '0' ? 'Not meaningful while oedematous' : 'Good ≥10 · moderate 5–10 · poor <5'} tone={summary.gain !== null && summary.latest.oedema === '0' && summary.latest.phase === 'Rehabilitation' ? summary.gain >= 10 ? 'success' : summary.gain >= 5 ? 'warning' : 'danger' : undefined} />
              <Stat label="Oedema" value={summary.latest.oedema === '0' ? 'None' : summary.latest.oedema} detail={summary.oedemaFreeSince ? `Free since ${formatDate(summary.oedemaFreeSince.at)}` : 'Still present'} tone={summary.latest.oedema === '0' ? 'success' : 'warning'} />
            </div>
            <div className="feed-plan"><Utensils size={16} /><div><b>Feeding plan for {summary.latest.weightKg} kg · {summary.latest.phase}</b><span>{summary.plan.text}</span><small>{summary.plan.perFeed}</small></div></div>
          </section>
          <section className="drawer-section">
            <div className="section-label"><Ruler size={15} />Weight and oedema by day</div>
            <PlotLegend items={[{ label: 'Weight', color: C1, shape: 'circle' }, { label: 'With oedema', color: C1, shape: 'ring' }, { label: 'Target weight', color: 'var(--ok-text)', dashed: true }]} />
            <Plot label="Daily weight" height={190} x={[0.5, lastDay + 0.5]} y={[Math.floor(Math.min(...weights, summary.target) - 0.5), Math.ceil(Math.max(...weights, summary.target) + 0.3)]}
              xTicks={Array.from({ length: lastDay }, (_, i) => ({ v: i + 1, label: `D${i + 1}` }))} yTicks={Array.from({ length: 6 }, (_, i) => { const lo = Math.floor(Math.min(...weights, summary.target) - 0.5); const hi = Math.ceil(Math.max(...weights, summary.target) + 0.3); return Math.round((lo + ((hi - lo) * i) / 5) * 10) / 10 })} yTitle="kg"
              refs={[{ id: 't', label: `Target ${summary.target} kg`, points: [[0.5, summary.target], [lastDay + 0.5, summary.target]], tone: 'ref' }]}
              series={[{ id: 'w', color: C1, points: entries.map((e): PlotPoint => ({ key: e.id, x: dayOf(e.at), y: e.weightKg, shape: e.oedema === '0' ? 'circle' : 'ring', tip: <Tip title={`Day ${Math.floor(dayOf(e.at))} · ${e.phase}`} lines={[`Weight ${e.weightKg} kg`, `Oedema ${e.oedema}`, e.muacCm && `MUAC ${e.muacCm} cm`, e.temp && `Temp ${e.temp} °C`, `${e.feed}${e.feedsTaken !== undefined ? ` · ${e.feedsTaken}/${e.feedsPlanned} feeds` : ''}`]} /> })) }]} />
            <div className="oedema-strip" aria-label="Oedema grade by day">
              <span>Oedema</span>
              {entries.map((e) => <i key={e.id} className={`g${OEDEMA_GRADES.indexOf(e.oedema)}`} title={`${formatDate(e.at)}: ${e.oedema}`}>{e.oedema === '0' ? '–' : e.oedema}</i>)}
            </div>
          </section>
          <section className="drawer-section">
            <div className="section-label"><Timer size={15} />Daily monitoring<span>{entries.length} days</span></div>
            <div className="table-wrap"><table className="data-table compact">
              <thead><tr><th>Day</th><th>Phase</th><th className="num">Weight</th><th className="num">Change</th><th>Oedema</th><th className="num">MUAC</th><th className="num">Temp</th><th>Feeds</th><th>Appetite</th><th>Problems</th></tr></thead>
              <tbody>{[...entries].reverse().map((e, i, list) => { const prev = list[i + 1]; const change = prev ? Math.round((e.weightKg - prev.weightKg) * 1000) : undefined; return (
                <tr key={e.id}><td><b>D{Math.floor(dayOf(e.at))}</b><small>{formatDate(e.at)}</small></td><td>{e.phase}</td><td className="num">{e.weightKg}</td><td className={`num ${change !== undefined && change < 0 && e.oedema === '0' ? 'danger-text' : ''}`}>{change === undefined ? '–' : `${change > 0 ? '+' : ''}${change} g`}</td><td>{e.oedema === '0' ? 'None' : e.oedema}</td><td className={`num ${e.muacCm !== undefined && e.muacCm < 11.5 ? 'danger-text' : ''}`}>{e.muacCm ?? '–'}</td><td className={`num ${e.temp !== undefined && (e.temp < 35.5 || e.temp >= 38.5) ? 'danger-text' : ''}`}>{e.temp ?? '–'}</td><td>{e.feed}{e.feedsTaken !== undefined ? ` ${e.feedsTaken}/${e.feedsPlanned}` : ''}</td><td>{e.appetite ?? '–'}</td><td className="wrap">{e.complications.join(', ') || '–'}</td></tr>
              ) })}</tbody>
            </table></div>
          </section>
        </>
      )}
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Today’s SAM entry</div>
          <div className="segmented small chart-seg">{PHASES.map((phase) => <button key={phase} type="button" className={form.phase === phase ? 'on' : ''} onClick={() => setForm({ ...form, phase, feed: phase === 'Stabilisation' ? 'F-75' : 'RUTF' })}>{phase}</button>)}</div>
          <div className="form-grid chart-form">
            <Field label="Weight" unit="kg"><input type="number" step="0.01" value={form.weight} onChange={(e) => { setForm({ ...form, weight: e.target.value }); setError('') }} /></Field>
            <Field label="MUAC" unit="cm"><input type="number" step="0.1" value={form.muac} onChange={(e) => setForm({ ...form, muac: e.target.value })} /></Field>
            <Field label="Temperature" unit="°C"><input type="number" step="0.1" value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} /></Field>
            <Field label="Bilateral pitting oedema"><select value={form.oedema} onChange={(e) => setForm({ ...form, oedema: e.target.value as Oedema })}>{OEDEMA_GRADES.map((g) => <option key={g} value={g}>{g === '0' ? 'None' : g}</option>)}</select></Field>
            <Field label="Feed"><select value={form.feed} onChange={(e) => setForm({ ...form, feed: e.target.value as SamEntry['feed'] })}>{(['F-75', 'F-100', 'RUTF', 'Breastfeeding only'] as const).map((f) => <option key={f}>{f}</option>)}</select></Field>
            <Field label="Feeds taken" unit={`of ${form.phase === 'Stabilisation' ? 8 : 6}`}><input type="number" value={form.feedsTaken} onChange={(e) => setForm({ ...form, feedsTaken: e.target.value })} /></Field>
            <Field label="RUTF appetite test"><select value={form.appetite} onChange={(e) => setForm({ ...form, appetite: e.target.value as NonNullable<SamEntry['appetite']> })}>{(['Not done', 'Pass', 'Fail'] as const).map((a) => <option key={a}>{a}</option>)}</select></Field>
            <div className="form-field span-2"><span>Problems today</span><div className="pick-row">{COMPLICATIONS.map((c) => <button key={c} type="button" className={`pick-chip ${form.complications.includes(c) ? 'on' : ''}`} aria-pressed={form.complications.includes(c)} onClick={() => setForm({ ...form, complications: form.complications.includes(c) ? form.complications.filter((x) => x !== c) : [...form.complications, c] })}>{c}</button>)}</div></div>
          </div>
          {form.weight && Number(form.weight) > 0 && <p className="record-hint">Plan for {form.weight} kg: {samFeedPlanText(Number(form.weight), form.oedema, form.phase)}</p>}
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Plus} onClick={submit}>Save SAM entry</Button></div>
        </section>
      )}
    </>
  )
}

function samFeedPlanText(weightKg: number, oedema: Oedema, phase: SamPhase) {
  const perKg = oedema === '+++' ? 100 : 130
  if (phase === 'Stabilisation') return `F-75 ${Math.round((weightKg * perKg) / 8 / 5) * 5} ml every 3 hours (${perKg} ml/kg/day).`
  return `RUTF about ${((weightKg * (phase === 'Transition' ? 150 : 200)) / 500).toFixed(1)} sachets a day.`
}

/* ================= Antenatal (ANC) ================= */

export function AntenatalChart({ patient }: { patient: Patient }) {
  const visits = patient.charts?.anc ?? []
  const { editable, error, setError, save } = useChartForm(patient, 'anc')
  const [form, setForm] = useState({ ga: '', weight: '', bpSys: '', bpDia: '', fundal: '', fhr: '', presentation: 'Cephalic', protein: '-' as NonNullable<AncVisit['urineProtein']>, hb: '', note: '' })
  const latest = visits[visits.length - 1]

  const submit = () => {
    const gaWeeks = Number(form.ga); const bpSys = Number(form.bpSys); const bpDia = Number(form.bpDia)
    if (!gaWeeks || gaWeeks > 44 || !bpSys || !bpDia) { setError('Enter gestational age and blood pressure.'); return }
    save({ gaWeeks, bpSys, bpDia, weightKg: num(form.weight), fundalCm: num(form.fundal), fhr: num(form.fhr), presentation: gaWeeks >= 28 ? form.presentation : undefined, urineProtein: form.protein, hb: num(form.hb), note: form.note.trim() || undefined }, `ANC ${gaWeeks} weeks: BP ${bpSys}/${bpDia}${form.fundal ? `, SFH ${form.fundal} cm` : ''}${form.fhr ? `, FHR ${form.fhr}` : ''}.`)
    setForm({ ...form, ga: '', weight: '', bpSys: '', bpDia: '', fundal: '', fhr: '', hb: '', note: '' })
  }

  return (
    <>
      {latest && <Flags flags={ancFlags(latest)} />}
      <section className="drawer-section">
        <div className="section-label"><Baby size={15} />Fundal height for gestation<span>{visits.length} visits</span></div>
        {visits.length === 0 ? <div className="drawer-empty"><Baby size={25} /><p>No antenatal visits charted yet.</p></div> : (
          <>
            <PlotLegend items={[{ label: 'Fundal height', color: C1, shape: 'circle' }, { label: 'Expected ±2 cm', swatch: 'var(--accent-soft)' }]} />
            <Plot label="Symphysis-fundal height by gestational age" height={200} x={[10, 42]} y={[10, 44]}
              xTicks={[12, 16, 20, 24, 28, 32, 36, 40].map((v) => ({ v, label: `${v}w` }))} yTicks={[10, 20, 30, 40]} yTitle="cm"
              refs={[{ id: 'up', label: '', points: [[20, 22], [36, 38], [40, 40]], tone: 'ref' }, { id: 'mid', label: 'Expected', points: [[20, 20], [36, 36], [40, 38]], tone: 'alert' }, { id: 'lo', label: '', points: [[20, 18], [36, 34], [40, 36]], tone: 'ref' }]}
              series={[{ id: 'sfh', color: C1, points: visits.filter((v) => v.fundalCm !== undefined).map((v) => ({ key: v.id, x: v.gaWeeks, y: v.fundalCm!, danger: v.gaWeeks >= 20 && v.gaWeeks <= 36 && Math.abs(v.fundalCm! - v.gaWeeks) > 2, tip: <Tip title={`${v.gaWeeks} weeks · ${formatDate(v.at)}`} lines={[`Fundal height ${v.fundalCm} cm`, v.fhr && `FHR ${v.fhr}`, v.presentation]} /> })) }]} />
          </>
        )}
      </section>
      {visits.length > 0 && (
        <section className="drawer-section">
          <div className="section-label"><HeartPulse size={15} />Blood pressure through pregnancy</div>
          <PlotLegend items={[{ label: 'Systolic', color: C1, shape: 'circle' }, { label: 'Diastolic', color: C2, shape: 'circle', dashed: true }]} />
          <Plot label="Blood pressure by gestational age" height={170} x={[Math.min(10, ...visits.map((v) => v.gaWeeks)) - 1, 42]} y={[50, 180]}
            xTicks={[12, 16, 20, 24, 28, 32, 36, 40].map((v) => ({ v, label: `${v}w` }))} yTicks={[60, 90, 120, 140, 160]} yTitle="mmHg"
            refs={[{ id: 's', label: '140', points: [[9, 140], [42, 140]], tone: 'action' }, { id: 'd', label: '90', points: [[9, 90], [42, 90]], tone: 'ref' }]}
            series={[
              { id: 'sys', color: C1, points: visits.map((v) => ({ key: `${v.id}s`, x: v.gaWeeks, y: v.bpSys, danger: v.bpSys >= 140, tip: <Tip title={`${v.gaWeeks} weeks`} lines={[`BP ${v.bpSys}/${v.bpDia}`, v.urineProtein && `Urine protein ${v.urineProtein}`]} /> })) },
              { id: 'dia', color: C2, dashed: true, points: visits.map((v) => ({ key: `${v.id}d`, x: v.gaWeeks, y: v.bpDia, danger: v.bpDia >= 90, tip: <Tip title={`${v.gaWeeks} weeks`} lines={[`BP ${v.bpSys}/${v.bpDia}`]} /> })) },
            ]} />
          <div className="table-wrap"><table className="data-table compact">
            <thead><tr><th>Visit</th><th className="num">GA</th><th className="num">Weight</th><th className="num">BP</th><th className="num">SFH</th><th className="num">FHR</th><th>Lie</th><th>Protein</th><th className="num">Hb</th></tr></thead>
            <tbody>{[...visits].reverse().map((v) => <tr key={v.id}><td><b>{formatDate(v.at)}</b><small>{v.by}</small></td><td className="num">{v.gaWeeks}w</td><td className="num">{v.weightKg ?? '–'}</td><td className={`num ${v.bpSys >= 140 || v.bpDia >= 90 ? 'danger-text' : ''}`}>{v.bpSys}/{v.bpDia}</td><td className="num">{v.fundalCm ?? '–'}</td><td className="num">{v.fhr ?? '–'}</td><td>{v.presentation ?? '–'}</td><td>{v.urineProtein ?? '–'}</td><td className={`num ${v.hb !== undefined && v.hb < 11 ? 'danger-text' : ''}`}>{v.hb ?? '–'}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Antenatal visit</div>
          <div className="form-grid chart-form">
            <Field label="Gestational age" unit="weeks"><input type="number" value={form.ga} onChange={(e) => { setForm({ ...form, ga: e.target.value }); setError('') }} placeholder={latest ? String(latest.gaWeeks + 2) : ''} /></Field>
            <Field label="Systolic BP" unit="mmHg"><input type="number" value={form.bpSys} onChange={(e) => setForm({ ...form, bpSys: e.target.value })} /></Field>
            <Field label="Diastolic BP" unit="mmHg"><input type="number" value={form.bpDia} onChange={(e) => setForm({ ...form, bpDia: e.target.value })} /></Field>
            <Field label="Weight" unit="kg"><input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></Field>
            <Field label="Fundal height" unit="cm"><input type="number" value={form.fundal} onChange={(e) => setForm({ ...form, fundal: e.target.value })} /></Field>
            <Field label="Fetal heart" unit="bpm"><input type="number" value={form.fhr} onChange={(e) => setForm({ ...form, fhr: e.target.value })} /></Field>
            <Field label="Presentation"><select value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })}>{['Cephalic', 'Breech', 'Transverse', 'Not sure'].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Urine protein"><select value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value as NonNullable<AncVisit['urineProtein']> })}>{(['-', 'Trace', '+', '++', '+++'] as const).map((p) => <option key={p} value={p}>{p === '-' ? 'Negative' : p}</option>)}</select></Field>
            <Field label="Haemoglobin" unit="g/dL"><input type="number" step="0.1" value={form.hb} onChange={(e) => setForm({ ...form, hb: e.target.value })} /></Field>
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Plus} onClick={submit}>Save visit</Button></div>
        </section>
      )}
    </>
  )
}

/* ================= Partograph and contractions ================= */

function ContractionPatterns() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <pattern id="ctx-short" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--sunken)" /><circle cx="3" cy="3" r="1.3" fill="var(--series-1)" /></pattern>
        <pattern id="ctx-medium" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--sunken)" /><rect width="2.4" height="6" fill="var(--series-1)" /></pattern>
      </defs>
    </svg>
  )
}

const contractionFill = (seconds?: number) => ({ short: 'url(#ctx-short)', medium: 'url(#ctx-medium)', long: 'var(--series-1)', none: 'var(--line-soft)' })[contractionBand(seconds)]

function ContractionKey() {
  return (
    <div className="trend-key">
      <span><svg width="14" height="12"><rect width="14" height="12" rx="2" fill="url(#ctx-short)" /></svg>Under 20 s</span>
      <span><svg width="14" height="12"><rect width="14" height="12" rx="2" fill="url(#ctx-medium)" /></svg>20–40 s</span>
      <span><svg width="14" height="12"><rect width="14" height="12" rx="2" fill="var(--series-1)" /></svg>Over 40 s</span>
      <span><svg width="14" height="12"><rect x="1" y="1" width="12" height="10" rx="2" fill="none" stroke="var(--danger)" strokeWidth="2" /></svg>More than 5 in 10 min</span>
    </div>
  )
}

function ContractionBars({ entries, t0, hours }: { entries: LabourEntry[]; t0: number; hours: number }) {
  const rows = entries.filter((e) => e.contractions !== undefined)
  return (
    <Plot label="Contractions per 10 minutes" height={130} x={[0, hours]} y={[0, 6]} xTicks={hourTicks(t0, hours, hours > 8 ? 2 : 1)} yTicks={[1, 2, 3, 4, 5]} yTitle="per 10 min"
      refs={[{ id: 'max', label: '5', points: [[0, 5], [hours, 5]], tone: 'ref' }]}
      bars={rows.map((e) => { const x = (new Date(e.at).getTime() - t0) / HOUR; return { key: e.id, x0: x - 0.15, x1: x + 0.15, y: e.contractions!, fill: contractionFill(e.contractionSeconds), danger: e.contractions! > 5, tip: <Tip title={formatTime(e.at)} lines={[`${e.contractions} in 10 min`, e.contractionSeconds && `${e.contractionSeconds} s each`, e.oxytocinDrops && `Oxytocin ${e.oxytocinDrops} drops/min`]} /> } })} />
  )
}

export function PartographChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.labour ?? []
  const summary = partograph(entries)
  const t0 = summary ? new Date(summary.start.at).getTime() : Date.now()
  const hours = Math.max(12, Math.ceil((Date.now() - t0) / HOUR) + 1)
  const at = (iso: string) => (new Date(iso).getTime() - t0) / HOUR
  const d0 = summary?.active?.dilationCm ?? 4
  const a0 = summary?.active ? at(summary.active.at) : 0
  const lastWith = <K extends keyof LabourEntry>(key: K) => [...entries].reverse().find((e) => e[key] !== undefined)

  return (
    <>
      <ContractionPatterns />
      {summary && <Flags flags={summary.flags} />}
      {!summary ? <section className="drawer-section"><div className="drawer-empty"><Timer size={25} /><p>No partograph yet. Start it when the woman is in active labour (cervix 4 cm or more).</p></div></section> : (
        <>
          <section className="drawer-section">
            <div className="section-label"><Timer size={15} />Partograph<span>Started {formatDateTime(summary.start.at)}{summary.active ? ` · ${summary.hoursActive.toFixed(1)} h in active labour` : ''}</span></div>
            <div className="chart-stats">
              <Stat label="Cervix" value={summary.latestDilation ? `${summary.latestDilation.dilationCm} cm` : '–'} detail={summary.latestDilation && `at ${formatTime(summary.latestDilation.at)}`} tone={summary.line === 'action' ? 'danger' : summary.line === 'alert' ? 'warning' : 'success'} />
              <Stat label="Head" value={lastWith('descentFifths') ? `${lastWith('descentFifths')!.descentFifths}/5` : '–'} detail="palpable above brim" />
              <Stat label="Fetal heart" value={lastWith('fhr')?.fhr ?? '–'} detail={lastWith('fhr') && `at ${formatTime(lastWith('fhr')!.at)}`} tone={lastWith('fhr') && (lastWith('fhr')!.fhr! < 110 || lastWith('fhr')!.fhr! > 160) ? 'danger' : undefined} />
              <Stat label="Contractions" value={lastWith('contractions') ? `${lastWith('contractions')!.contractions}/10 min` : '–'} detail={lastWith('contractions')?.contractionSeconds ? `${lastWith('contractions')!.contractionSeconds} s each` : undefined} tone={(lastWith('contractions')?.contractions ?? 0) > 5 ? 'danger' : undefined} />
              <Stat label="Progress" value={summary.line === 'on track' ? 'On track' : summary.line === 'alert' ? 'Alert line' : 'Action line'} tone={summary.line === 'action' ? 'danger' : summary.line === 'alert' ? 'warning' : 'success'} />
            </div>
          </section>
          <section className="drawer-section partograph">
            <h4 className="chart-sub">Fetal heart rate</h4>
            <Plot label="Fetal heart rate" height={130} x={[0, hours]} y={[80, 200]} xTicks={hourTicks(t0, hours, hours > 8 ? 2 : 1)} yTicks={[100, 120, 140, 160, 180]} bands={[{ y0: 110, y1: 160 }]}
              series={[{ id: 'fhr', color: C1, points: entries.filter((e) => e.fhr !== undefined).map((e) => ({ key: e.id, x: at(e.at), y: e.fhr!, danger: e.fhr! < 110 || e.fhr! > 160, tip: <Tip title={formatTime(e.at)} lines={[`FHR ${e.fhr} bpm`, e.liquor && `Liquor ${e.liquor}`]} /> })) }]} />
            <h4 className="chart-sub">Cervix and descent</h4>
            <PlotLegend items={[{ label: 'Cervix (cm)', color: C1, shape: 'cross' }, { label: 'Head descent (fifths)', color: C2, shape: 'ring' }, { label: 'Alert line', color: 'var(--warn-text)' }, { label: 'Action line', color: 'var(--danger)', dashed: true }]} />
            <Plot label="Cervicograph" height={230} x={[0, hours]} y={[0, 10]} xTicks={hourTicks(t0, hours, hours > 8 ? 2 : 1)} yTicks={[0, 2, 4, 6, 8, 10].map((v) => ({ v, label: `${v} · ${v / 2}` }))} yTitle="cm · fifths"
              refs={summary.active ? [{ id: 'alert', label: 'Alert', points: [[a0, d0], [a0 + (10 - d0), 10]], tone: 'alert' }, { id: 'action', label: 'Action', points: [[a0 + 4, d0], [a0 + 4 + (10 - d0), 10]], tone: 'action' }] : []}
              series={[
                { id: 'cx', color: C1, points: entries.filter((e) => e.dilationCm !== undefined).map((e) => ({ key: e.id, x: at(e.at), y: e.dilationCm!, shape: 'cross' as const, tip: <Tip title={`${formatTime(e.at)} · vaginal exam`} lines={[`Cervix ${e.dilationCm} cm`, e.descentFifths !== undefined && `Head ${e.descentFifths}/5`, e.moulding && `Moulding ${e.moulding}`, e.liquor && `Liquor ${e.liquor}`]} /> })) },
                { id: 'desc', color: C2, dashed: true, points: entries.filter((e) => e.descentFifths !== undefined).map((e) => ({ key: `${e.id}d`, x: at(e.at), y: e.descentFifths! * 2, shape: 'ring' as const, tip: <Tip title={formatTime(e.at)} lines={[`Head ${e.descentFifths}/5 palpable`]} /> })) },
              ]} />
            <h4 className="chart-sub">Contractions</h4>
            <ContractionKey />
            <ContractionBars entries={entries} t0={t0} hours={hours} />
          </section>
          <LabourTable entries={entries} />
        </>
      )}
      <LabourForm patient={patient} />
    </>
  )
}

function LabourTable({ entries, contractionsOnly }: { entries: LabourEntry[]; contractionsOnly?: boolean }) {
  const rows = [...entries].reverse().filter((e) => !contractionsOnly || e.contractions !== undefined)
  return (
    <section className="drawer-section">
      <div className="section-label"><Timer size={15} />{contractionsOnly ? 'Contraction record' : 'Labour record'}<span>{rows.length} entries</span></div>
      <div className="table-wrap"><table className="data-table compact">
        <thead><tr><th>Time</th>{!contractionsOnly && <><th className="num">Cervix</th><th className="num">Head</th><th className="num">FHR</th><th>Liquor</th><th>Moulding</th></>}<th className="num">Contr.</th><th className="num">Length</th><th className="num">Oxytocin</th>{!contractionsOnly && <><th className="num">Pulse</th><th className="num">BP</th><th className="num">Temp</th><th>Urine</th></>}</tr></thead>
        <tbody>{rows.map((e) => (
          <tr key={e.id}>
            <td><b>{formatTime(e.at)}</b><small>{e.by}</small></td>
            {!contractionsOnly && <><td className="num">{e.dilationCm ?? ''}</td><td className="num">{e.descentFifths !== undefined ? `${e.descentFifths}/5` : ''}</td><td className={`num ${e.fhr !== undefined && (e.fhr < 110 || e.fhr > 160) ? 'danger-text' : ''}`}>{e.fhr ?? ''}</td><td className={e.liquor === 'M' || e.liquor === 'B' ? 'danger-text' : ''}>{e.liquor ?? ''}</td><td>{e.moulding ?? ''}</td></>}
            <td className={`num ${(e.contractions ?? 0) > 5 ? 'danger-text' : ''}`}>{e.contractions ?? ''}</td><td className="num">{e.contractionSeconds ? `${e.contractionSeconds} s` : ''}</td><td className="num">{e.oxytocinDrops ? `${e.oxytocinDrops} dpm` : ''}</td>
            {!contractionsOnly && <><td className="num">{e.pulse ?? ''}</td><td className="num">{e.bpSys ? `${e.bpSys}/${e.bpDia}` : ''}</td><td className="num">{e.temp ?? ''}</td><td className="wrap">{e.urine ?? ''}</td></>}
          </tr>
        ))}</tbody>
      </table></div>
      {!contractionsOnly && <p className="record-hint">Liquor: I intact, C clear, M meconium, B blood, A absent. Head: fifths palpable above the pelvic brim.</p>}
    </section>
  )
}

function LabourForm({ patient, contractionsOnly }: { patient: Patient; contractionsOnly?: boolean }) {
  const { editable, error, setError, save } = useChartForm(patient, 'labour')
  const blank = { fhr: '', contractions: '', seconds: '', dilation: '', descent: '', liquor: '', moulding: '', pulse: '', bpSys: '', bpDia: '', temp: '', oxytocin: '', urine: '' }
  const [form, setForm] = useState(blank)
  if (!editable) return null
  const set = (key: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm({ ...form, [key]: e.target.value }); setError('') }

  const submit = () => {
    const entry: ChartEntryInput<'labour'> = {
      fhr: num(form.fhr), contractions: num(form.contractions), contractionSeconds: num(form.seconds), dilationCm: num(form.dilation), descentFifths: num(form.descent),
      liquor: (form.liquor || undefined) as LabourEntry['liquor'], moulding: (form.moulding || undefined) as LabourEntry['moulding'], pulse: num(form.pulse), bpSys: num(form.bpSys), bpDia: num(form.bpDia), temp: num(form.temp), oxytocinDrops: num(form.oxytocin), urine: form.urine.trim() || undefined,
    }
    const filled = Object.values(entry).some((value) => value !== undefined)
    if (!filled) { setError('Fill in at least one observation.'); return }
    if (entry.dilationCm !== undefined && (entry.dilationCm < 0 || entry.dilationCm > 10)) { setError('Cervical dilatation is 0–10 cm.'); return }
    if (entry.descentFifths !== undefined && (entry.descentFifths < 0 || entry.descentFifths > 5)) { setError('Descent is 0–5 fifths.'); return }
    const parts = [entry.dilationCm !== undefined && `cervix ${entry.dilationCm} cm`, entry.fhr && `FHR ${entry.fhr}`, entry.contractions !== undefined && `${entry.contractions} contractions/10 min${entry.contractionSeconds ? ` × ${entry.contractionSeconds} s` : ''}`, entry.oxytocinDrops && `oxytocin ${entry.oxytocinDrops} dpm`].filter(Boolean)
    save(Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined)) as ChartEntryInput<'labour'>, parts.join(', ') || 'Maternal observations')
    setForm(blank)
  }

  return (
    <section className="drawer-section">
      <div className="section-label"><Plus size={15} />{contractionsOnly ? 'Record contractions' : 'Add to partograph'}<span>FHR and contractions every 30 min · cervix every 4 h</span></div>
      <div className="form-grid chart-form">
        {!contractionsOnly && <Field label="Fetal heart" unit="bpm"><input type="number" value={form.fhr} onChange={set('fhr')} /></Field>}
        <Field label="Contractions" unit="per 10 min"><input type="number" value={form.contractions} onChange={set('contractions')} /></Field>
        <Field label="Each lasting" unit="seconds"><input type="number" value={form.seconds} onChange={set('seconds')} /></Field>
        <Field label="Oxytocin" unit="drops/min"><input type="number" value={form.oxytocin} onChange={set('oxytocin')} /></Field>
        {!contractionsOnly && <>
          <Field label="Cervix" unit="cm"><input type="number" step="0.5" value={form.dilation} onChange={set('dilation')} /></Field>
          <Field label="Head palpable" unit="fifths"><input type="number" value={form.descent} onChange={set('descent')} /></Field>
          <Field label="Liquor"><select value={form.liquor} onChange={set('liquor')}><option value="">–</option>{[['I', 'Intact'], ['C', 'Clear'], ['M', 'Meconium'], ['B', 'Blood-stained'], ['A', 'Absent']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Moulding"><select value={form.moulding} onChange={set('moulding')}><option value="">–</option>{OEDEMA_GRADES.map((g) => <option key={g} value={g}>{g === '0' ? 'None' : g}</option>)}</select></Field>
          <Field label="Maternal pulse"><input type="number" value={form.pulse} onChange={set('pulse')} /></Field>
          <Field label="BP" unit="sys"><input type="number" value={form.bpSys} onChange={set('bpSys')} /></Field>
          <Field label="BP" unit="dia"><input type="number" value={form.bpDia} onChange={set('bpDia')} /></Field>
          <Field label="Temperature" unit="°C"><input type="number" step="0.1" value={form.temp} onChange={set('temp')} /></Field>
          <Field label="Urine" wide><input value={form.urine} onChange={set('urine')} placeholder="Protein, acetone, volume" /></Field>
        </>}
      </div>
      <FormError error={error} />
      <div className="panel-actions"><Button icon={Plus} onClick={submit}>{contractionsOnly ? 'Save contractions' : 'Save to partograph'}</Button></div>
    </section>
  )
}

export function ContractionChart({ patient }: { patient: Patient }) {
  const entries = (patient.charts?.labour ?? []).filter((e) => e.contractions !== undefined || e.oxytocinDrops !== undefined)
  const t0 = entries.length ? new Date(entries[0].at).getTime() : Date.now()
  const hours = Math.max(6, Math.ceil((Date.now() - t0) / HOUR) + 1)
  const at = (iso: string) => (new Date(iso).getTime() - t0) / HOUR
  const latest = [...entries].reverse().find((e) => e.contractions !== undefined)
  const oxy = [...entries].reverse().find((e) => e.oxytocinDrops !== undefined)
  const recent = entries.filter((e) => e.contractions !== undefined && Date.now() - new Date(e.at).getTime() < 2 * HOUR)
  const tachy = recent.some((e) => e.contractions! > 5)
  const flags: Flag[] = []
  if (tachy) flags.push({ tone: 'danger', text: `More than 5 contractions in 10 minutes in the last 2 hours${oxy ? ' — reduce or stop oxytocin and check the fetal heart' : ''}` })
  if (latest && latest.contractions! < 3 && (latest.contractionSeconds ?? 0) < 40 && !oxy) flags.push({ tone: 'warning', text: 'Contractions fewer than 3 in 10 minutes — inadequate if progress is slow' })
  return (
    <>
      <ContractionPatterns />
      <Flags flags={flags} />
      <section className="drawer-section">
        <div className="section-label"><Timer size={15} />Contraction chart<span>{entries.length} entries</span></div>
        {entries.length === 0 ? <div className="drawer-empty"><Timer size={25} /><p>No contractions recorded yet. Count contractions in 10 minutes and how long each lasts.</p></div> : (
          <>
            <div className="chart-stats">
              <Stat label="Frequency" value={latest ? `${latest.contractions} in 10 min` : '–'} detail={latest && formatTime(latest.at)} tone={(latest?.contractions ?? 0) > 5 ? 'danger' : undefined} />
              <Stat label="Duration" value={latest?.contractionSeconds ? `${latest.contractionSeconds} s` : '–'} detail={latest?.contractionSeconds ? contractionBand(latest.contractionSeconds) === 'long' ? 'Strong' : contractionBand(latest.contractionSeconds) === 'medium' ? 'Moderate' : 'Mild' : undefined} />
              <Stat label="Oxytocin" value={oxy ? `${oxy.oxytocinDrops} drops/min` : 'Not running'} detail={oxy && `since ${formatTime(entries.find((e) => e.oxytocinDrops)!.at)}`} />
            </div>
            <h4 className="chart-sub">Contractions per 10 minutes</h4>
            <ContractionKey />
            <ContractionBars entries={entries} t0={t0} hours={hours} />
            <h4 className="chart-sub">Length of each contraction</h4>
            <Plot label="Contraction length" height={120} x={[0, hours]} y={[0, 80]} xTicks={hourTicks(t0, hours, hours > 8 ? 2 : 1)} yTicks={[20, 40, 60]} yTitle="seconds"
              refs={[{ id: '40', label: '40 s', points: [[0, 40], [hours, 40]], tone: 'ref' }]}
              series={[{ id: 'len', color: C1, points: entries.filter((e) => e.contractionSeconds !== undefined).map((e) => ({ key: e.id, x: at(e.at), y: e.contractionSeconds!, tip: <Tip title={formatTime(e.at)} lines={[`${e.contractionSeconds} s`]} /> })) }]} />
            {oxy && <>
              <h4 className="chart-sub">Oxytocin infusion</h4>
              <Plot label="Oxytocin rate" height={110} x={[0, hours]} y={[0, 60]} xTicks={hourTicks(t0, hours, hours > 8 ? 2 : 1)} yTicks={[10, 20, 30, 40, 50]} yTitle="drops/min"
                series={[{ id: 'oxy', color: C2, points: entries.filter((e) => e.oxytocinDrops !== undefined).map((e) => ({ key: e.id, x: at(e.at), y: e.oxytocinDrops!, shape: 'square' as const, tip: <Tip title={formatTime(e.at)} lines={[`Oxytocin ${e.oxytocinDrops} drops/min`]} /> })) }]} />
            </>}
          </>
        )}
      </section>
      {entries.length > 0 && <LabourTable entries={entries} contractionsOnly />}
      <LabourForm patient={patient} contractionsOnly />
    </>
  )
}

/* ================= Postpartum / gynaecology bleeding ================= */

export function PostpartumChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.postpartum ?? []
  const summary = postpartumSummary(entries)
  const { editable, error, setError, save } = useChartForm(patient, 'postpartum')
  const [form, setForm] = useState({ uterus: 'Well contracted' as PostpartumEntry['uterus'], lochia: 'Moderate' as PostpartumEntry['lochia'], pads: '', loss: '', pulse: '', bpSys: '', bpDia: '' })
  const t0 = entries.length ? new Date(entries[0].at).getTime() : Date.now()
  const hours = Math.max(4, Math.ceil((Date.now() - t0) / HOUR) + 1)
  let running = 0
  const cumulative = entries.map((e) => { running += e.bloodLossMl; return { e, total: running } })

  const submit = () => {
    const loss = Number(form.loss)
    if (form.loss === '' || loss < 0 || loss > 5000) { setError('Enter the blood loss since the last check in ml (0 if none).'); return }
    save({ uterus: form.uterus, lochia: form.lochia, padsSoaked: num(form.pads), bloodLossMl: loss, pulse: num(form.pulse), bpSys: num(form.bpSys), bpDia: num(form.bpDia) }, `Uterus ${form.uterus.toLowerCase()}, lochia ${form.lochia.toLowerCase()}, ${loss} ml since last check.`)
    setForm({ ...form, pads: '', loss: '', pulse: '', bpSys: '', bpDia: '' })
  }

  return (
    <>
      {summary && <Flags flags={summary.flags} />}
      <section className="drawer-section">
        <div className="section-label"><Droplets size={15} />Bleeding and uterus<span>{entries.length} checks</span></div>
        {!summary ? <div className="drawer-empty"><Droplets size={25} /><p>No checks yet. After birth or gynaecological surgery, check the uterus and bleeding every 15 minutes for the first hour, then every 30–60 minutes.</p></div> : (
          <>
            <div className="chart-stats">
              <Stat label="Total blood loss" value={`${summary.total} ml`} detail="PPH ≥500 ml · severe ≥1000 ml" tone={summary.total >= 1000 ? 'danger' : summary.total >= 500 ? 'danger' : summary.total >= 350 ? 'warning' : 'success'} />
              <Stat label="Uterus" value={summary.latest.uterus} tone={summary.latest.uterus === 'Boggy' ? 'danger' : 'success'} detail={formatTime(summary.latest.at)} />
              <Stat label="Lochia" value={summary.latest.lochia} tone={summary.latest.lochia === 'Heavy' || summary.latest.lochia === 'Clots' ? 'warning' : undefined} />
              {summary.latest.pulse && summary.latest.bpSys && <Stat label="Shock index" value={(summary.latest.pulse / summary.latest.bpSys).toFixed(2)} detail={`HR ${summary.latest.pulse} ÷ SBP ${summary.latest.bpSys} · concern ≥0.9`} tone={summary.latest.pulse / summary.latest.bpSys >= 0.9 ? 'danger' : undefined} />}
            </div>
            <h4 className="chart-sub">Cumulative blood loss</h4>
            <Plot label="Cumulative blood loss" height={170} x={[0, hours]} y={[0, Math.max(1200, summary.total + 200)]} xTicks={hourTicks(t0, hours, hours > 8 ? 2 : 1)} yTicks={[0, 250, 500, 750, 1000]} yTitle="ml"
              refs={[{ id: '500', label: 'PPH 500 ml', points: [[0, 500], [hours, 500]], tone: 'alert' }, { id: '1000', label: 'Severe 1000 ml', points: [[0, 1000], [hours, 1000]], tone: 'action' }]}
              series={[{ id: 'ebl', color: C1, points: cumulative.map(({ e, total }) => ({ key: e.id, x: (new Date(e.at).getTime() - t0) / HOUR, y: total, danger: e.uterus === 'Boggy' || total >= 500, tip: <Tip title={formatTime(e.at)} lines={[`+${e.bloodLossMl} ml · total ${total} ml`, `Uterus ${e.uterus.toLowerCase()}`, `Lochia ${e.lochia.toLowerCase()}`, e.pulse && `Pulse ${e.pulse}`, e.bpSys && `BP ${e.bpSys}/${e.bpDia}`]} /> })) }]} />
            <div className="table-wrap"><table className="data-table compact">
              <thead><tr><th>Time</th><th>Uterus</th><th>Lochia</th><th className="num">Pads</th><th className="num">Loss</th><th className="num">Total</th><th className="num">Pulse</th><th className="num">BP</th></tr></thead>
              <tbody>{[...cumulative].reverse().map(({ e, total }) => <tr key={e.id}><td><b>{formatTime(e.at)}</b><small>{e.by}</small></td><td className={e.uterus === 'Boggy' ? 'danger-text' : ''}>{e.uterus}</td><td>{e.lochia}</td><td className="num">{e.padsSoaked ?? '–'}</td><td className="num">{e.bloodLossMl} ml</td><td className={`num ${total >= 500 ? 'danger-text' : ''}`}>{total} ml</td><td className="num">{e.pulse ?? '–'}</td><td className="num">{e.bpSys ? `${e.bpSys}/${e.bpDia}` : '–'}</td></tr>)}</tbody>
            </table></div>
          </>
        )}
      </section>
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Bleeding check</div>
          <div className="form-grid chart-form">
            <Field label="Uterus"><select value={form.uterus} onChange={(e) => setForm({ ...form, uterus: e.target.value as PostpartumEntry['uterus'] })}><option>Well contracted</option><option>Boggy</option></select></Field>
            <Field label="Lochia / bleeding"><select value={form.lochia} onChange={(e) => setForm({ ...form, lochia: e.target.value as PostpartumEntry['lochia'] })}>{(['Light', 'Moderate', 'Heavy', 'Clots'] as const).map((l) => <option key={l}>{l}</option>)}</select></Field>
            <Field label="Pads soaked"><input type="number" value={form.pads} onChange={(e) => setForm({ ...form, pads: e.target.value })} /></Field>
            <Field label="Blood loss since last check" unit="ml"><input type="number" value={form.loss} onChange={(e) => { setForm({ ...form, loss: e.target.value }); setError('') }} /></Field>
            <Field label="Pulse"><input type="number" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} /></Field>
            <Field label="BP" unit="sys"><input type="number" value={form.bpSys} onChange={(e) => setForm({ ...form, bpSys: e.target.value })} /></Field>
            <Field label="BP" unit="dia"><input type="number" value={form.bpDia} onChange={(e) => setForm({ ...form, bpDia: e.target.value })} /></Field>
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Plus} onClick={submit}>Save check</Button></div>
        </section>
      )}
    </>
  )
}

/* ================= Fluid balance ================= */

const ROUTES: Record<FluidEntry['direction'], string[]> = { In: ['Oral', 'IV fluid', 'IV medicine', 'NG feed', 'Blood'], Out: ['Urine', 'Vomit', 'Stool', 'Drain', 'NG aspirate', 'Blood loss'] }

export function FluidChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.fluids ?? []
  const { editable, error, setError, save } = useChartForm(patient, 'fluids')
  const today = chartDayStart(Date.now())
  const [day, setDay] = useState(today)
  const [form, setForm] = useState({ direction: 'In' as FluidEntry['direction'], route: 'Oral', ml: '' })
  const data = fluidDay(entries, day)
  const firstDay = entries.length ? chartDayStart(new Date(entries[0].at).getTime()) : today
  const days = Array.from({ length: Math.round((today - firstDay) / DAY) + 1 }, (_, i) => today - i * DAY).slice(0, 7)
  const weight = patient.weightKg
  const hoursElapsed = Math.min(24, (Math.min(Date.now(), day + DAY) - day) / HOUR)
  const urineRate = weight && hoursElapsed > 0 ? data.urine / weight / hoursElapsed : undefined
  let running = 0
  const balance = [...data.entries].sort((a, b) => a.at.localeCompare(b.at)).map((e) => { running += e.direction === 'In' ? e.ml : -e.ml; return { e, net: running } })
  const extent = Math.max(500, ...balance.map((b) => Math.abs(b.net)))

  const submit = () => {
    const ml = Number(form.ml)
    if (!ml || ml <= 0 || ml > 5000) { setError('Enter a volume in ml.'); return }
    save({ direction: form.direction, route: form.route, ml }, `${form.direction === 'In' ? 'Intake' : 'Output'}: ${form.route} ${ml} ml.`)
    setForm({ ...form, ml: '' }); setDay(today)
  }

  return (
    <>
      <section className="drawer-section">
        <div className="section-label"><Droplets size={15} />Fluid balance<span>Chart day 07:00 – 07:00</span></div>
        {days.length > 1 && <div className="segmented small chart-seg">{days.map((d) => <button key={d} type="button" className={d === day ? 'on' : ''} onClick={() => setDay(d)}>{d === today ? 'Today' : new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</button>)}</div>}
        <div className="chart-stats">
          <Stat label="In" value={`${data.input} ml`} />
          <Stat label="Out" value={`${data.output} ml`} />
          <Stat label="Balance" value={`${data.net > 0 ? '+' : ''}${data.net} ml`} tone={Math.abs(data.net) > 1500 ? 'warning' : undefined} />
          <Stat label="Urine" value={`${data.urine} ml`} detail={urineRate !== undefined ? `${urineRate.toFixed(2)} ml/kg/h${urineRate < 0.5 ? ' — low' : ''}` : 'Add weight for ml/kg/h'} tone={urineRate !== undefined && urineRate < 0.5 ? 'danger' : undefined} />
        </div>
        {balance.length > 0 ? (
          <Plot label="Running fluid balance" height={150} x={[0, 24]} y={[-extent, extent]} xTicks={hourTicks(day, 24, 6)} yTicks={[-extent, -extent / 2, 0, extent / 2, extent].map((v) => ({ v, label: `${v > 0 ? '+' : ''}${Math.round(v)}` }))} yTitle="ml"
            refs={[{ id: 'zero', label: '', points: [[0, 0], [24, 0]], tone: 'ref' }]}
            series={[{ id: 'net', color: C1, points: balance.map(({ e, net }) => ({ key: e.id, x: (new Date(e.at).getTime() - day) / HOUR, y: net, shape: e.direction === 'In' ? 'circle' as const : 'square' as const, tip: <Tip title={formatTime(e.at)} lines={[`${e.direction === 'In' ? 'In' : 'Out'}: ${e.route} ${e.ml} ml`, `Running balance ${net > 0 ? '+' : ''}${net} ml`, e.by]} /> })) }]} />
        ) : <p className="record-hint">Nothing charted for this day.</p>}
        {data.entries.length > 0 && <div className="table-wrap"><table className="data-table compact">
          <thead><tr><th>Time</th><th>Route</th><th className="num">In</th><th className="num">Out</th><th>By</th></tr></thead>
          <tbody>{[...data.entries].sort((a, b) => b.at.localeCompare(a.at)).map((e) => <tr key={e.id}><td>{formatTime(e.at)}</td><td>{e.route}</td><td className="num">{e.direction === 'In' ? e.ml : ''}</td><td className="num">{e.direction === 'Out' ? e.ml : ''}</td><td>{e.by}</td></tr>)}</tbody>
        </table></div>}
      </section>
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Record intake or output</div>
          <div className="segmented small chart-seg">{(['In', 'Out'] as const).map((d) => <button key={d} type="button" className={form.direction === d ? 'on' : ''} onClick={() => setForm({ ...form, direction: d, route: ROUTES[d][0] })}>{d === 'In' ? 'Intake' : 'Output'}</button>)}</div>
          <div className="pick-row">{ROUTES[form.direction].map((r) => <button key={r} type="button" className={`pick-chip ${form.route === r ? 'on' : ''}`} aria-pressed={form.route === r} onClick={() => setForm({ ...form, route: r })}>{r}</button>)}</div>
          <div className="form-grid chart-form">
            <Field label="Volume" unit="ml"><input type="number" value={form.ml} onChange={(e) => { setForm({ ...form, ml: e.target.value }); setError('') }} /></Field>
            <div className="quick-volumes">{[50, 100, 200, 250, 500, 1000].map((v) => <button key={v} type="button" className="pick-chip" onClick={() => setForm({ ...form, ml: String(v) })}>{v}</button>)}</div>
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Plus} onClick={submit}>Save</Button></div>
        </section>
      )}
    </>
  )
}

/* ================= Blood glucose ================= */

const TIMINGS = ['Fasting', 'Before breakfast', 'Before lunch', 'Before dinner', 'Bedtime', '2 h after meal', 'Random', 'Night']

export function GlucoseChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.glucose ?? []
  const { editable, error, setError, save } = useChartForm(patient, 'glucose')
  const [form, setForm] = useState({ value: '', unit: 'mg/dL' as 'mg/dL' | 'mmol/L', timing: 'Random', insulin: '' })
  const t0 = entries.length ? new Date(entries[0].at).getTime() : Date.now()
  const hours = Math.max(24, Math.ceil((Date.now() - t0) / HOUR) + 2)
  const latest = entries[entries.length - 1]
  const flag = latest ? glucoseFlag(latest) : null
  const inRange = entries.filter((e) => e.mgdl >= 70 && e.mgdl <= 180).length

  const submit = () => {
    const raw = Number(form.value)
    if (!raw) { setError('Enter the glucose reading.'); return }
    const mgdl = Math.round(form.unit === 'mmol/L' ? raw * 18 : raw)
    if (mgdl < 10 || mgdl > 900) { setError('That reading is outside the meter range — check the unit.'); return }
    save({ mgdl, timing: form.timing, insulinUnits: num(form.insulin) }, `Glucose ${mgdl} mg/dL (${toMmol(mgdl)} mmol/L), ${form.timing.toLowerCase()}${form.insulin ? `, ${form.insulin} units insulin` : ''}.`)
    setForm({ ...form, value: '', insulin: '' })
  }

  return (
    <>
      {flag && <Flags flags={[flag]} />}
      <section className="drawer-section">
        <div className="section-label"><Syringe size={15} />Blood glucose<span>{entries.length} readings</span></div>
        {entries.length === 0 ? <div className="drawer-empty"><Syringe size={25} /><p>No glucose readings yet.</p></div> : (
          <>
            <div className="chart-stats">
              <Stat label="Latest" value={`${latest.mgdl} mg/dL`} detail={`${toMmol(latest.mgdl)} mmol/L · ${latest.timing.toLowerCase()} · ${formatTime(latest.at)}`} tone={flag?.tone} />
              <Stat label="In target" value={`${Math.round((inRange / entries.length) * 100)}%`} detail="70–180 mg/dL (3.9–10 mmol/L)" />
              <Stat label="Lowest · highest" value={`${Math.min(...entries.map((e) => e.mgdl))} · ${Math.max(...entries.map((e) => e.mgdl))}`} detail="mg/dL" />
            </div>
            <PlotLegend items={[{ label: 'Glucose', color: C1, shape: 'circle' }, { label: 'Insulin given', color: C1, shape: 'diamond' }, { label: 'Target 70–180', swatch: 'var(--accent-soft)' }]} />
            <Plot label="Blood glucose" height={180} x={[0, hours]} y={[40, Math.max(320, ...entries.map((e) => e.mgdl + 20))]} xTicks={dayTicks(t0, t0 + hours * HOUR)} yTicks={[70, 180, 250]} yTitle="mg/dL" bands={[{ y0: 70, y1: 180 }]}
              refs={[{ id: 'hypo', label: 'Hypo <70', points: [[0, 70], [hours, 70]], tone: 'action' }]}
              series={[{ id: 'g', color: C1, points: entries.map((e) => ({ key: e.id, x: (new Date(e.at).getTime() - t0) / HOUR, y: e.mgdl, shape: e.insulinUnits ? 'diamond' as const : 'circle' as const, danger: e.mgdl < 70 || e.mgdl > 250, tip: <Tip title={formatDateTime(e.at)} lines={[`${e.mgdl} mg/dL (${toMmol(e.mgdl)} mmol/L)`, e.timing, e.insulinUnits && `${e.insulinUnits} units insulin`, e.by]} /> })) }]} />
            <div className="table-wrap"><table className="data-table compact">
              <thead><tr><th>Time</th><th>When</th><th className="num">mg/dL</th><th className="num">mmol/L</th><th className="num">Insulin</th></tr></thead>
              <tbody>{[...entries].reverse().map((e) => <tr key={e.id}><td><b>{formatDateTime(e.at)}</b><small>{e.by}</small></td><td>{e.timing}</td><td className={`num ${e.mgdl < 70 || e.mgdl > 250 ? 'danger-text' : ''}`}>{e.mgdl}</td><td className="num">{toMmol(e.mgdl)}</td><td className="num">{e.insulinUnits ? `${e.insulinUnits} u` : '–'}</td></tr>)}</tbody>
            </table></div>
          </>
        )}
      </section>
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Record glucose</div>
          <div className="form-grid chart-form">
            <Field label="Reading"><input type="number" step="0.1" value={form.value} onChange={(e) => { setForm({ ...form, value: e.target.value }); setError('') }} /></Field>
            <Field label="Unit"><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as 'mg/dL' | 'mmol/L' })}><option>mg/dL</option><option>mmol/L</option></select></Field>
            <Field label="When"><select value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })}>{TIMINGS.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Insulin given" unit="units"><input type="number" value={form.insulin} onChange={(e) => setForm({ ...form, insulin: e.target.value })} /></Field>
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Plus} onClick={submit}>Save reading</Button></div>
        </section>
      )}
    </>
  )
}
