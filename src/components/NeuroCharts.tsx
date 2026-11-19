import { useState } from 'react'
import { Brain, Eye, Plus, Zap } from 'lucide-react'
import { gcsLabel, gcsTotal, NIHSS_ITEMS, neuroSummary, nihssBand, nihssSummary, seizureSummary } from '../lib/charts'
import { formatDateTime, formatTime } from '../lib/format'
import type { NeuroEntry, Patient, PupilReaction } from '../types'
import { Plot, PlotLegend } from './Plot'
import { dayTicks, Field, Flags, FormError, num, Stat, Tip, useChartForm } from './SpecialtyCharts'
import { Button } from './ui'

const HOUR = 3_600_000
const C1 = 'var(--series-1)'
const C2 = 'var(--series-2)'

const EYE = ['', 'None', 'To pain', 'To voice', 'Spontaneous']
const VERBAL_ADULT = ['', 'None', 'Sounds only', 'Inappropriate words', 'Confused', 'Orientated']
const VERBAL_CHILD = ['', 'None', 'Moans to pain', 'Cries to pain', 'Irritable, cries', 'Coos, babbles, alert']
const MOTOR = ['', 'None', 'Extension to pain', 'Abnormal flexion', 'Withdraws from pain', 'Localises pain', 'Obeys commands']
const REACTIONS: PupilReaction[] = ['Brisk', 'Sluggish', 'Fixed', 'Closed']
const REACT_CODE: Record<PupilReaction, string> = { Brisk: '+', Sluggish: 'S', Fixed: '–', Closed: 'C' }
const LIMB_LABEL = { la: 'Left arm', ra: 'Right arm', ll: 'Left leg', rl: 'Right leg' } as const
const POWER = ['0 No movement', '1 Flicker', '2 Moves, not against gravity', '3 Against gravity', '4 Against some resistance', '5 Normal']

/** Range from first entry to now, at least `min` hours. */
function span(entries: Array<{ at: string }>, min: number) {
  const t0 = entries.length ? new Date(entries[0].at).getTime() : Date.now()
  return { t0, hours: Math.max(min, (Date.now() - t0) / HOUR + 0.5) }
}

function timeTicks(t0: number, hours: number) {
  const days = dayTicks(t0, t0 + hours * HOUR)
  if (days.length) return days
  const step = hours > 12 ? 4 : hours > 4 ? 2 : 1
  return Array.from({ length: Math.floor(hours / step) + 1 }, (_, i) => ({ v: i * step, label: new Date(t0 + i * step * HOUR).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) }))
}

/* ================= GCS and neuro observations ================= */

export function NeuroChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.neuro ?? []
  const summary = neuroSummary(entries)
  const child = patient.age < 5
  const verbalScale = child ? VERBAL_CHILD : VERBAL_ADULT
  const last = entries[entries.length - 1]
  const { editable, error, setError, save } = useChartForm(patient, 'neuro')
  const blank = { eye: '', verbal: '', motor: '', pupilL: String(last?.pupilL ?? 3), pupilR: String(last?.pupilR ?? 3), reactL: (last?.reactL ?? 'Brisk') as PupilReaction, reactR: (last?.reactR ?? 'Brisk') as PupilReaction, limbs: { ...(last?.limbs ?? { la: 5, ra: 5, ll: 5, rl: 5 }) }, bpSys: '', hr: '' }
  const [form, setForm] = useState(blank)
  const { t0, hours } = span(entries, 2)
  const at = (iso: string) => (new Date(iso).getTime() - t0) / HOUR
  const preview = form.eye && form.motor ? Number(form.eye) + (form.verbal === 'T' ? 1 : Number(form.verbal || 0)) + Number(form.motor) : null

  const submit = () => {
    if (!form.eye || !form.verbal || !form.motor) { setError('Score eyes, verbal and motor (use T if intubated).'); return }
    const entry = { eye: Number(form.eye), verbal: form.verbal === 'T' ? null : Number(form.verbal), motor: Number(form.motor), pupilL: Number(form.pupilL), pupilR: Number(form.pupilR), reactL: form.reactL, reactR: form.reactR, limbs: form.limbs, bpSys: num(form.bpSys), hr: num(form.hr) }
    save(entry, `GCS ${gcsTotal(entry)} (${gcsLabel(entry)}), pupils L ${entry.pupilL}${REACT_CODE[entry.reactL]} R ${entry.pupilR}${REACT_CODE[entry.reactR]}, power LA ${entry.limbs.la} RA ${entry.limbs.ra} LL ${entry.limbs.ll} RL ${entry.limbs.rl}.`)
    setForm({ ...blank, pupilL: form.pupilL, pupilR: form.pupilR, reactL: form.reactL, reactR: form.reactR, limbs: form.limbs })
  }

  return (
    <>
      {summary && <Flags flags={summary.flags} />}
      <section className="drawer-section">
        <div className="section-label"><Brain size={15} />Glasgow Coma Scale<span>{entries.length} checks</span></div>
        {!summary ? <div className="drawer-empty"><Brain size={25} /><p>No neuro observations yet. Record GCS, pupils and limb power to start the chart.</p></div> : (
          <>
            <div className="chart-stats">
              <Stat label="GCS" value={`${summary.total}/15`} detail={`${gcsLabel(summary.latest)} · ${formatTime(summary.latest.at)}`} tone={summary.total <= 8 ? 'danger' : summary.total < 15 ? 'warning' : 'success'} />
              <Stat label="Best GCS" value={gcsTotal(summary.best)} detail={formatDateTime(summary.best.at)} />
              <Stat label="Pupils (mm)" value={`L ${summary.latest.pupilL}${REACT_CODE[summary.latest.reactL]} · R ${summary.latest.pupilR}${REACT_CODE[summary.latest.reactR]}`} detail="+ brisk · S sluggish · – fixed · C closed" tone={Math.abs(summary.latest.pupilL - summary.latest.pupilR) >= 1 || summary.latest.reactL === 'Fixed' || summary.latest.reactR === 'Fixed' ? 'danger' : undefined} />
              <Stat label="Limb power" value={`${summary.latest.limbs.la} ${summary.latest.limbs.ra} / ${summary.latest.limbs.ll} ${summary.latest.limbs.rl}`} detail="Arms L R / legs L R (out of 5)" tone={Object.values(summary.latest.limbs).some((p) => p < 5) ? 'warning' : undefined} />
            </div>
            <PlotLegend items={[{ label: 'GCS total', color: C1, shape: 'circle' }, { label: 'Falling score', color: 'var(--danger)', shape: 'circle' }, { label: '≤8 airway at risk', swatch: 'color-mix(in srgb, var(--danger) 14%, transparent)' }]} />
            <Plot label="GCS trend" height={190} x={[0, hours]} y={[3, 15]} xTicks={timeTicks(t0, hours)} yTicks={[3, 6, 8, 10, 12, 15]} yTitle="GCS" bands={[{ y0: 3, y1: 8, tone: 'danger' }]}
              series={[{ id: 'gcs', color: C1, points: entries.map((e, i) => ({ key: e.id, x: at(e.at), y: gcsTotal(e), danger: i > 0 && gcsTotal(e) < gcsTotal(entries[i - 1]), tip: <Tip title={formatDateTime(e.at)} lines={[`GCS ${gcsTotal(e)} (${gcsLabel(e)})`, `Eyes: ${EYE[e.eye]}`, `Verbal: ${e.verbal ? verbalScale[e.verbal] : 'T (intubated)'}`, `Motor: ${MOTOR[e.motor]}`, e.by]} /> })) }]} />
            <h4 className="chart-sub">Eye, verbal and motor</h4>
            <div className="gcs-grid" role="table" aria-label="GCS components by time">
              <div role="row" className="gcs-head"><span role="columnheader" />{entries.slice(-10).map((e) => <span key={e.id} role="columnheader">{formatTime(e.at)}</span>)}</div>
              {([['Eyes (4)', 'eye', 4], ['Verbal (5)', 'verbal', 5], ['Motor (6)', 'motor', 6]] as const).map(([label, key, max]) => (
                <div role="row" key={key}><span role="rowheader">{label}</span>{entries.slice(-10).map((e) => { const value = e[key]; const ratio = value === null ? 0 : value / max; return <span key={e.id} role="cell" className="gcs-cell" style={{ '--fill': ratio } as React.CSSProperties} title={value === null ? 'Not testable' : String(value)}>{value ?? 'T'}</span> })}</div>
              ))}
              <div role="row" className="gcs-total"><span role="rowheader">Total</span>{entries.slice(-10).map((e) => <span key={e.id} role="cell"><b>{gcsTotal(e)}</b></span>)}</div>
            </div>
          </>
        )}
      </section>

      {entries.length > 0 && (
        <section className="drawer-section">
          <div className="section-label"><Eye size={15} />Pupils and limb power</div>
          <PlotLegend items={[{ label: 'Left pupil', color: C1, shape: 'circle' }, { label: 'Right pupil', color: C2, shape: 'square' }, { label: 'Not reacting', color: 'var(--danger)', shape: 'cross' }]} />
          <Plot label="Pupil size" height={150} x={[0, hours]} y={[1, 8]} xTicks={timeTicks(t0, hours)} yTicks={[2, 4, 6, 8]} yTitle="mm"
            series={[
              { id: 'pl', color: C1, points: entries.map((e) => ({ key: `${e.id}l`, x: at(e.at), y: e.pupilL, shape: e.reactL === 'Fixed' ? 'cross' as const : 'circle' as const, danger: e.reactL === 'Fixed' || Math.abs(e.pupilL - e.pupilR) >= 1, tip: <Tip title={formatTime(e.at)} lines={[`Left ${e.pupilL} mm, ${e.reactL.toLowerCase()}`, `Right ${e.pupilR} mm, ${e.reactR.toLowerCase()}`]} /> })) },
              { id: 'pr', color: C2, dashed: true, points: entries.map((e) => ({ key: `${e.id}r`, x: at(e.at), y: e.pupilR, shape: e.reactR === 'Fixed' ? 'cross' as const : 'square' as const, danger: e.reactR === 'Fixed' || Math.abs(e.pupilL - e.pupilR) >= 1, tip: <Tip title={formatTime(e.at)} lines={[`Left ${e.pupilL} mm, ${e.reactL.toLowerCase()}`, `Right ${e.pupilR} mm, ${e.reactR.toLowerCase()}`]} /> })) },
            ]} />
          <div className="table-wrap"><table className="data-table compact">
            <thead><tr><th>Time</th><th className="num">GCS</th><th>Pupils L / R</th><th className="num">L arm</th><th className="num">R arm</th><th className="num">L leg</th><th className="num">R leg</th><th className="num">BP</th><th className="num">HR</th></tr></thead>
            <tbody>{[...entries].reverse().map((e) => (
              <tr key={e.id}>
                <td><b>{formatDateTime(e.at)}</b><small>{e.by}</small></td>
                <td className={`num ${gcsTotal(e) <= 8 ? 'danger-text' : ''}`}>{gcsTotal(e)} <small>{gcsLabel(e)}</small></td>
                <td className={Math.abs(e.pupilL - e.pupilR) >= 1 || e.reactL === 'Fixed' || e.reactR === 'Fixed' ? 'danger-text' : ''}>{e.pupilL}{REACT_CODE[e.reactL]} / {e.pupilR}{REACT_CODE[e.reactR]}</td>
                {(['la', 'ra', 'll', 'rl'] as const).map((k) => <td key={k} className={`num power-${e.limbs[k]}`}>{e.limbs[k]}</td>)}
                <td className="num">{e.bpSys ?? '–'}</td><td className="num">{e.hr ?? '–'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}

      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Neuro observations{preview !== null && <span>GCS {preview}/15</span>}</div>
          <div className="gcs-picker">
            <GcsRow label="Eyes" value={form.eye} options={EYE} onPick={(v) => { setForm({ ...form, eye: v }); setError('') }} />
            <GcsRow label={child ? 'Verbal (child)' : 'Verbal'} value={form.verbal} options={verbalScale} extra="T" onPick={(v) => { setForm({ ...form, verbal: v }); setError('') }} />
            <GcsRow label="Motor" value={form.motor} options={MOTOR} onPick={(v) => { setForm({ ...form, motor: v }); setError('') }} />
          </div>
          <div className="form-grid chart-form">
            <Field label="Left pupil" unit="mm"><select value={form.pupilL} onChange={(e) => setForm({ ...form, pupilL: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></Field>
            <Field label="Left reaction"><select value={form.reactL} onChange={(e) => setForm({ ...form, reactL: e.target.value as PupilReaction })}>{REACTIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Right pupil" unit="mm"><select value={form.pupilR} onChange={(e) => setForm({ ...form, pupilR: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></Field>
            <Field label="Right reaction"><select value={form.reactR} onChange={(e) => setForm({ ...form, reactR: e.target.value as PupilReaction })}>{REACTIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            {(Object.keys(LIMB_LABEL) as Array<keyof NeuroEntry['limbs']>).map((k) => (
              <Field key={k} label={LIMB_LABEL[k]} unit="power"><select value={form.limbs[k]} onChange={(e) => setForm({ ...form, limbs: { ...form.limbs, [k]: Number(e.target.value) } })}>{POWER.map((p, i) => <option key={i} value={i}>{p}</option>)}</select></Field>
            ))}
            <Field label="Systolic BP"><input type="number" value={form.bpSys} onChange={(e) => setForm({ ...form, bpSys: e.target.value })} /></Field>
            <Field label="Heart rate"><input type="number" value={form.hr} onChange={(e) => setForm({ ...form, hr: e.target.value })} /></Field>
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Brain} onClick={submit}>Save neuro observations</Button></div>
        </section>
      )}
    </>
  )
}

function GcsRow({ label, value, options, onPick, extra }: { label: string; value: string; options: string[]; onPick: (v: string) => void; extra?: string }) {
  return (
    <div className="gcs-row" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((text, score) => score === 0 ? null : <button key={score} type="button" role="radio" aria-checked={value === String(score)} className={`gcs-option ${value === String(score) ? 'on' : ''}`} onClick={() => onPick(String(score))}><b>{score}</b>{text}</button>)}
        {extra && <button type="button" role="radio" aria-checked={value === extra} className={`gcs-option ${value === extra ? 'on' : ''}`} onClick={() => onPick(extra)}><b>T</b>Intubated</button>}
      </div>
    </div>
  )
}

/* ================= NIH Stroke Scale ================= */

export function NihssChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.nihss ?? []
  const summary = nihssSummary(entries)
  const { editable, error, setError, save } = useChartForm(patient, 'nihss')
  const [items, setItems] = useState<Record<string, number>>({})
  const done = NIHSS_ITEMS.filter((item) => items[item.key] !== undefined).length
  const total = Object.values(items).reduce((sum, v) => sum + v, 0)
  const { t0, hours } = span(entries, 2)

  const submit = () => {
    if (done < NIHSS_ITEMS.length) { setError(`Score all ${NIHSS_ITEMS.length} items (${NIHSS_ITEMS.length - done} left).`); return }
    save({ items, total }, `NIHSS ${total} (${nihssBand(total).text.toLowerCase()}).`)
    setItems({})
  }

  return (
    <>
      {summary && <Flags flags={summary.flags} />}
      <section className="drawer-section">
        <div className="section-label"><Brain size={15} />NIH Stroke Scale<span>{entries.length} assessments</span></div>
        {!summary ? <div className="drawer-empty"><Brain size={25} /><p>No stroke scale yet. Score on arrival, after thrombolysis or thrombectomy, at 24 hours and with any change.</p></div> : (
          <>
            <div className="chart-stats">
              <Stat label="Latest NIHSS" value={summary.latest.total} detail={`${summary.band.text} · ${formatTime(summary.latest.at)}`} tone={summary.band.tone} />
              <Stat label="On arrival" value={summary.first.total} detail={formatDateTime(summary.first.at)} />
              <Stat label="Best" value={summary.lowest.total} detail={formatDateTime(summary.lowest.at)} />
            </div>
            <Plot label="NIHSS trend" height={170} x={[0, hours]} y={[0, Math.max(25, ...entries.map((e) => e.total + 3))]} xTicks={timeTicks(t0, hours)} yTicks={[0, 5, 15, 21]} yTitle="NIHSS" bands={[{ y0: 0, y1: 4 }]}
              series={[{ id: 'n', color: C1, points: entries.map((e) => ({ key: e.id, x: (new Date(e.at).getTime() - t0) / HOUR, y: e.total, danger: e.total - summary.lowest.total >= 4, tip: <Tip title={formatDateTime(e.at)} lines={[`NIHSS ${e.total} · ${nihssBand(e.total).text}`, ...NIHSS_ITEMS.filter((item) => e.items[item.key]).map((item) => `${item.label.split(' ')[0]} ${item.options[e.items[item.key]]}`), e.by]} /> })) }]} />
            <p className="record-hint">Lower is better. A rise of 4 or more points suggests deterioration (for example a bleed after thrombolysis).</p>
          </>
        )}
      </section>
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Score the stroke scale<span>{done}/{NIHSS_ITEMS.length} items · total {total}</span></div>
          <div className="nihss-form">
            {NIHSS_ITEMS.map((item) => (
              <div key={item.key} className="nihss-item" role="radiogroup" aria-label={item.label}>
                <span>{item.label}</span>
                <div>{item.options.map((text, score) => <button key={score} type="button" role="radio" aria-checked={items[item.key] === score} className={`gcs-option ${items[item.key] === score ? 'on' : ''}`} onClick={() => { setItems({ ...items, [item.key]: score }); setError('') }}><b>{score}</b>{text}</button>)}</div>
              </div>
            ))}
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button variant="ghost" onClick={() => setItems(Object.fromEntries(NIHSS_ITEMS.map((item) => [item.key, 0])))}>Set all to 0</Button><Button icon={Brain} onClick={submit}>Save NIHSS {done === NIHSS_ITEMS.length ? total : ''}</Button></div>
        </section>
      )}
    </>
  )
}

/* ================= Seizure chart ================= */

const SEIZURE_TYPES = ['Generalised tonic-clonic', 'Focal aware', 'Focal with impaired awareness', 'Absence', 'Myoclonic', 'Atonic', 'Febrile', 'Not sure']

export function SeizureChart({ patient }: { patient: Patient }) {
  const entries = patient.charts?.seizures ?? []
  const summary = seizureSummary(entries)
  const { editable, error, setError, save } = useChartForm(patient, 'seizures')
  const [form, setForm] = useState({ type: SEIZURE_TYPES[0], minutes: '', seconds: '', rescue: '', recovery: '', note: '' })
  const { t0, hours } = span(entries, 24)

  const submit = () => {
    const durationSec = (Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0)
    if (!durationSec) { setError('Enter how long the seizure lasted.'); return }
    save({ type: form.type, durationSec, rescue: form.rescue.trim() || undefined, recoveryMin: num(form.recovery), note: form.note.trim() || undefined }, `${form.type} seizure, ${Math.floor(durationSec / 60)} min ${durationSec % 60} s${form.rescue ? `, given ${form.rescue}` : ''}.`)
    setForm({ ...form, minutes: '', seconds: '', rescue: '', recovery: '', note: '' })
  }

  return (
    <>
      {summary && <Flags flags={summary.flags} />}
      <section className="drawer-section">
        <div className="section-label"><Zap size={15} />Seizure chart<span>{entries.length} recorded</span></div>
        {!summary ? <div className="drawer-empty"><Zap size={25} /><p>No seizures recorded. Time each seizure from start to end; give rescue medicine at 5 minutes.</p></div> : (
          <>
            <div className="chart-stats">
              <Stat label="Last 24 hours" value={summary.last24.length} tone={summary.last24.length >= 3 ? 'danger' : summary.last24.length === 2 ? 'warning' : undefined} />
              <Stat label="Most recent" value={`${Math.floor(summary.latest.durationSec / 60)}:${String(summary.latest.durationSec % 60).padStart(2, '0')}`} detail={`${summary.latest.type} · ${formatDateTime(summary.latest.at)}`} tone={summary.latest.durationSec >= 300 ? 'danger' : undefined} />
              <Stat label="Longest" value={`${Math.round(Math.max(...entries.map((e) => e.durationSec)) / 6) / 10} min`} />
            </div>
            <Plot label="Seizure duration" height={150} x={[0, hours]} y={[0, Math.max(6, ...entries.map((e) => e.durationSec / 60 + 1))]} xTicks={timeTicks(t0, hours)} yTicks={[1, 3, 5]} yTitle="minutes"
              refs={[{ id: '5', label: '5 min', points: [[0, 5], [hours, 5]], tone: 'action' }]}
              bars={entries.map((e) => { const x = (new Date(e.at).getTime() - t0) / HOUR; const w = Math.max(hours / 120, 0.08); return { key: e.id, x0: x - w, x1: x + w, y: e.durationSec / 60, fill: e.durationSec >= 300 ? 'var(--danger)' : 'var(--series-1)', tip: <Tip title={formatDateTime(e.at)} lines={[e.type, `${Math.floor(e.durationSec / 60)} min ${e.durationSec % 60} s`, e.rescue && `Rescue: ${e.rescue}`, e.recoveryMin !== undefined && `Recovered in ${e.recoveryMin} min`]} /> } })} />
            <div className="table-wrap"><table className="data-table compact">
              <thead><tr><th>Time</th><th>Type</th><th className="num">Duration</th><th>Rescue medicine</th><th className="num">Recovery</th><th>Notes</th></tr></thead>
              <tbody>{[...entries].reverse().map((e) => <tr key={e.id}><td><b>{formatDateTime(e.at)}</b><small>{e.by}</small></td><td>{e.type}</td><td className={`num ${e.durationSec >= 300 ? 'danger-text' : ''}`}>{Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}</td><td>{e.rescue ?? '–'}</td><td className="num">{e.recoveryMin !== undefined ? `${e.recoveryMin} min` : '–'}</td><td className="wrap">{e.note ?? ''}</td></tr>)}</tbody>
            </table></div>
          </>
        )}
      </section>
      {editable && (
        <section className="drawer-section">
          <div className="section-label"><Plus size={15} />Record a seizure</div>
          <div className="pick-row">{SEIZURE_TYPES.map((t) => <button key={t} type="button" className={`pick-chip ${form.type === t ? 'on' : ''}`} aria-pressed={form.type === t} onClick={() => setForm({ ...form, type: t })}>{t}</button>)}</div>
          <div className="form-grid chart-form">
            <Field label="Duration" unit="min"><input type="number" value={form.minutes} onChange={(e) => { setForm({ ...form, minutes: e.target.value }); setError('') }} /></Field>
            <Field label="and" unit="seconds"><input type="number" value={form.seconds} onChange={(e) => { setForm({ ...form, seconds: e.target.value }); setError('') }} /></Field>
            <Field label="Rescue medicine"><input value={form.rescue} onChange={(e) => setForm({ ...form, rescue: e.target.value })} placeholder="e.g. Diazepam 10 mg PR" /></Field>
            <Field label="Back to baseline after" unit="min"><input type="number" value={form.recovery} onChange={(e) => setForm({ ...form, recovery: e.target.value })} /></Field>
            <Field label="What happened" wide><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Trigger, injuries, incontinence, tongue bite…" /></Field>
          </div>
          <FormError error={error} />
          <div className="panel-actions"><Button icon={Zap} onClick={submit}>Save seizure</Button></div>
        </section>
      )}
    </>
  )
}
