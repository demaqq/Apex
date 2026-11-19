import type { AncVisit, FluidEntry, GlucoseEntry, LabourEntry, Patient, PostpartumEntry, SamEntry } from '../types'

export type Flag = { tone: 'danger' | 'warning' | 'success'; text: string }

const HOUR = 3_600_000
const DAY = 86_400_000
const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / HOUR

/* ---------------- Which charts apply to a patient ---------------- */

export const isChild = (patient: Patient) => patient.age < 18
export const isUnderFive = (patient: Patient) => patient.age < 5
export const isObstetric = (patient: Patient) => patient.sex === 'Female' && patient.age >= 12 && patient.age <= 55 && (patient.department === 'obgyn' || Boolean(patient.charts?.anc?.length || patient.charts?.labour?.length || patient.charts?.postpartum?.length))

/* ---------------- Severe acute malnutrition ---------------- */

export const OEDEMA_GRADES = ['0', '+', '++', '+++'] as const

/** MUAC class for children 6–59 months. */
export function muacClass(cm: number): Flag {
  if (cm < 11.5) return { tone: 'danger', text: `MUAC ${cm} cm — severe acute malnutrition` }
  if (cm < 12.5) return { tone: 'warning', text: `MUAC ${cm} cm — moderate acute malnutrition` }
  return { tone: 'success', text: `MUAC ${cm} cm — normal` }
}

/** Therapeutic feeding plan from the WHO inpatient SAM protocol. Volumes are a guide; follow the national protocol. */
export function samFeedPlan(entry: Pick<SamEntry, 'weightKg' | 'oedema' | 'phase'>) {
  const w = entry.weightKg
  if (entry.phase === 'Stabilisation') {
    const perKg = entry.oedema === '+++' ? 100 : 130
    const daily = w * perKg
    return { feed: 'F-75', text: `F-75 ${perKg} ml/kg/day = ${Math.round(daily)} ml/day`, perFeed: `${Math.round(daily / 8 / 5) * 5} ml every 3 hours (8 feeds)` }
  }
  if (entry.phase === 'Transition') {
    const sachets = (w * 150) / 500
    return { feed: 'RUTF', text: `RUTF about 150 kcal/kg/day ≈ ${sachets.toFixed(1)} sachets/day`, perFeed: 'Or F-100 at the same volume as F-75, then increase' }
  }
  const sachets = (w * 200) / 500
  return { feed: 'RUTF', text: `RUTF about 200 kcal/kg/day ≈ ${sachets.toFixed(1)} sachets/day`, perFeed: 'Or F-100 150–220 ml/kg/day in 5–6 feeds' }
}

/** Weight gain in g/kg/day between two entries. */
export function weightGain(from: SamEntry, to: SamEntry) {
  const days = Math.max(1, (new Date(to.at).getTime() - new Date(from.at).getTime()) / DAY)
  return ((to.weightKg - from.weightKg) * 1000) / from.weightKg / days
}

export function samSummary(entries: SamEntry[]) {
  if (!entries.length) return null
  const first = entries[0]
  const latest = entries[entries.length - 1]
  const day = Math.floor((new Date(latest.at).getTime() - new Date(first.at).getTime()) / DAY) + 1
  const lowest = entries.reduce((min, entry) => (entry.weightKg < min.weightKg ? entry : min), first)
  const target = Math.round(lowest.weightKg * 1.15 * 10) / 10
  const recent = entries.filter((entry) => new Date(entry.at).getTime() >= new Date(latest.at).getTime() - 3 * DAY)
  const gain = recent.length > 1 ? weightGain(recent[0], latest) : null
  const oedemaFreeSince = (() => {
    let since: SamEntry | null = null
    for (const entry of entries) since = entry.oedema === '0' ? since ?? entry : null
    return since
  })()
  const flags: Flag[] = []
  if (latest.oedema !== '0') flags.push({ tone: latest.oedema === '+++' ? 'danger' : 'warning', text: `Bilateral pitting oedema ${latest.oedema}` })
  if (latest.muacCm !== undefined) { const m = muacClass(latest.muacCm); if (m.tone !== 'success') flags.push(m) }
  if (latest.temp !== undefined && latest.temp < 35.5) flags.push({ tone: 'danger', text: `Hypothermia (${latest.temp} °C) — warm the child, check glucose, give feed` })
  if (latest.temp !== undefined && latest.temp >= 38.5) flags.push({ tone: 'warning', text: `Fever (${latest.temp} °C) — look for infection` })
  latest.complications.forEach((item) => flags.push({ tone: 'danger', text: item }))
  if (latest.appetite === 'Fail') flags.push({ tone: 'warning', text: 'Failed RUTF appetite test' })
  if (gain !== null && latest.oedema === '0' && latest.phase === 'Rehabilitation') {
    if (gain < 5) flags.push({ tone: 'danger', text: `Poor weight gain ${gain.toFixed(1)} g/kg/day (target above 10)` })
    else if (gain < 10) flags.push({ tone: 'warning', text: `Moderate weight gain ${gain.toFixed(1)} g/kg/day (target above 10)` })
  }
  // Primary failure to respond (WHO): oedema not reducing by day 4, no weight gain by day 10.
  const firstOedema = OEDEMA_GRADES.indexOf(first.oedema)
  if (day >= 4 && firstOedema > 0 && OEDEMA_GRADES.indexOf(latest.oedema) >= firstOedema) flags.push({ tone: 'danger', text: 'Oedema not reducing by day 4 — failure to respond, review' })
  if (day >= 10 && latest.weightKg <= lowest.weightKg && latest.oedema === '0') flags.push({ tone: 'danger', text: 'No weight gain by day 10 — failure to respond, review' })
  const readyForDischarge = latest.oedema === '0' && oedemaFreeSince && new Date(latest.at).getTime() - new Date(oedemaFreeSince.at).getTime() >= 14 * DAY && (latest.weightKg >= target || (latest.muacCm ?? 0) >= 12.5)
  return { first, latest, day, lowest, target, gain, oedemaFreeSince, flags, readyForDischarge: Boolean(readyForDischarge), plan: samFeedPlan(latest) }
}

/* ---------------- Partograph (modified WHO) ---------------- */

export function partograph(entries: LabourEntry[]) {
  const withDilation = entries.filter((entry) => entry.dilationCm !== undefined)
  const active = withDilation.find((entry) => (entry.dilationCm ?? 0) >= 4)
  const start = active ?? entries[0]
  if (!start) return null
  const latest = entries[entries.length - 1]
  const latestDilation = [...withDilation].reverse()[0]
  const flags: Flag[] = []
  let line: 'on track' | 'alert' | 'action' = 'on track'
  if (active && latestDilation && latestDilation !== active) {
    const hours = hoursBetween(active.at, latestDilation.at)
    const expected = (active.dilationCm ?? 4) + hours
    if ((latestDilation.dilationCm ?? 0) < 10) {
      if (latestDilation.dilationCm! <= expected - 4) { line = 'action'; flags.push({ tone: 'danger', text: 'Crossed the action line — senior review for delivery plan now' }) }
      else if (latestDilation.dilationCm! < expected) { line = 'alert'; flags.push({ tone: 'warning', text: 'Right of the alert line — slow progress, reassess and consider referral' }) }
    }
  }
  const lastWith = <K extends keyof LabourEntry>(key: K) => [...entries].reverse().find((entry) => entry[key] !== undefined)
  const fhr = lastWith('fhr')
  if (fhr && (fhr.fhr! < 110 || fhr.fhr! > 160)) flags.push({ tone: 'danger', text: `Fetal heart ${fhr.fhr} bpm — outside 110–160` })
  const liquor = lastWith('liquor')
  if (liquor && (liquor.liquor === 'M' || liquor.liquor === 'B')) flags.push({ tone: 'danger', text: liquor.liquor === 'M' ? 'Meconium-stained liquor' : 'Blood-stained liquor' })
  const contractions = lastWith('contractions')
  if (contractions && contractions.contractions! > 5) flags.push({ tone: 'danger', text: `${contractions.contractions} contractions in 10 minutes — tachysystole${contractions.oxytocinDrops ? ', reduce or stop oxytocin' : ''}` })
  const moulding = lastWith('moulding')
  if (moulding?.moulding === '+++') flags.push({ tone: 'danger', text: 'Moulding +++ — suspect obstruction' })
  const bp = lastWith('bpSys')
  if (bp && (bp.bpSys! >= 140 || (bp.bpDia ?? 0) >= 90)) flags.push({ tone: bp.bpSys! >= 160 || (bp.bpDia ?? 0) >= 110 ? 'danger' : 'warning', text: `BP ${bp.bpSys}/${bp.bpDia}` })
  const temp = lastWith('temp')
  if (temp && temp.temp! >= 38) flags.push({ tone: 'warning', text: `Maternal temperature ${temp.temp} °C` })
  const pulse = lastWith('pulse')
  if (pulse && pulse.pulse! > 100) flags.push({ tone: 'warning', text: `Maternal pulse ${pulse.pulse}` })
  if (fhr && hoursBetween(fhr.at, new Date().toISOString()) > 0.75 && latestDilation?.dilationCm !== 10) flags.push({ tone: 'warning', text: 'Fetal heart not recorded in the last 30 minutes' })
  return { start, active, latest, latestDilation, line, flags, hoursActive: active ? hoursBetween(active.at, new Date().toISOString()) : 0 }
}

/** WHO partograph shading for contraction length. */
export const contractionBand = (seconds?: number) => (seconds === undefined ? 'none' : seconds < 20 ? 'short' : seconds <= 40 ? 'medium' : 'long')

/* ---------------- Antenatal ---------------- */

export function ancFlags(visit: AncVisit): Flag[] {
  const flags: Flag[] = []
  if (visit.bpSys >= 160 || visit.bpDia >= 110) flags.push({ tone: 'danger', text: `Severe hypertension ${visit.bpSys}/${visit.bpDia}` })
  else if (visit.bpSys >= 140 || visit.bpDia >= 90) flags.push({ tone: 'warning', text: `Hypertension ${visit.bpSys}/${visit.bpDia}` })
  if ((visit.bpSys >= 140 || visit.bpDia >= 90) && visit.urineProtein && ['+', '++', '+++'].includes(visit.urineProtein) && visit.gaWeeks >= 20) flags.push({ tone: 'danger', text: 'Hypertension with proteinuria after 20 weeks — pre-eclampsia?' })
  if (visit.fundalCm !== undefined && visit.gaWeeks >= 20 && visit.gaWeeks <= 36 && Math.abs(visit.fundalCm - visit.gaWeeks) > 2) flags.push({ tone: 'warning', text: `Fundal height ${visit.fundalCm} cm at ${visit.gaWeeks} weeks — ${visit.fundalCm < visit.gaWeeks ? 'small' : 'large'} for dates` })
  if (visit.hb !== undefined && visit.hb < 11) flags.push({ tone: visit.hb < 7 ? 'danger' : 'warning', text: `Anaemia Hb ${visit.hb} g/dL` })
  if (visit.fhr !== undefined && (visit.fhr < 110 || visit.fhr > 160)) flags.push({ tone: 'danger', text: `Fetal heart ${visit.fhr} bpm` })
  return flags
}

/* ---------------- Postpartum bleeding ---------------- */

export function postpartumSummary(entries: PostpartumEntry[]) {
  if (!entries.length) return null
  const total = entries.reduce((sum, entry) => sum + entry.bloodLossMl, 0)
  const latest = entries[entries.length - 1]
  const flags: Flag[] = []
  if (total >= 1000) flags.push({ tone: 'danger', text: `Severe postpartum haemorrhage — ${total} ml total` })
  else if (total >= 500) flags.push({ tone: 'danger', text: `Postpartum haemorrhage — ${total} ml total` })
  if (latest.uterus === 'Boggy') flags.push({ tone: 'danger', text: 'Uterus boggy — rub the fundus, give uterotonic, empty the bladder' })
  if (latest.lochia === 'Heavy' || latest.lochia === 'Clots') flags.push({ tone: 'warning', text: `Lochia ${latest.lochia.toLowerCase()}` })
  if (latest.pulse && latest.bpSys) {
    const index = latest.pulse / latest.bpSys
    if (index >= 0.9) flags.push({ tone: index >= 1.4 ? 'danger' : 'warning', text: `Shock index ${index.toFixed(2)}` })
  }
  return { total, latest, flags }
}

/* ---------------- Fluid balance ---------------- */

export function fluidDay(entries: FluidEntry[], dayStart: number) {
  const day = entries.filter((entry) => { const t = new Date(entry.at).getTime(); return t >= dayStart && t < dayStart + DAY })
  const input = day.filter((entry) => entry.direction === 'In').reduce((sum, entry) => sum + entry.ml, 0)
  const output = day.filter((entry) => entry.direction === 'Out').reduce((sum, entry) => sum + entry.ml, 0)
  const urine = day.filter((entry) => entry.direction === 'Out' && /urine/i.test(entry.route)).reduce((sum, entry) => sum + entry.ml, 0)
  return { entries: day, input, output, urine, net: input - output }
}

/** Charting days run from 07:00 to 07:00. */
export function chartDayStart(at: number) {
  const d = new Date(at); d.setHours(7, 0, 0, 0)
  if (d.getTime() > at) d.setDate(d.getDate() - 1)
  return d.getTime()
}

/* ---------------- Glucose ---------------- */

export const toMmol = (mgdl: number) => Math.round((mgdl / 18) * 10) / 10

export function glucoseFlag(entry: GlucoseEntry): Flag | null {
  if (entry.mgdl < 54) return { tone: 'danger', text: `Severe hypoglycaemia ${entry.mgdl} mg/dL — treat now` }
  if (entry.mgdl < 70) return { tone: 'danger', text: `Hypoglycaemia ${entry.mgdl} mg/dL` }
  if (entry.mgdl > 300) return { tone: 'danger', text: `Very high glucose ${entry.mgdl} mg/dL — check ketones` }
  if (entry.mgdl > 180) return { tone: 'warning', text: `Above target ${entry.mgdl} mg/dL` }
  return null
}

/** All chart alerts for the patient's alert box and dashboards. */
export function chartAlerts(patient: Patient): Flag[] {
  const charts = patient.charts
  if (!charts) return []
  const flags: Flag[] = []
  if (charts.sam?.length) flags.push(...(samSummary(charts.sam)?.flags ?? []).filter((flag) => flag.tone === 'danger'))
  if (charts.labour?.length) flags.push(...(partograph(charts.labour)?.flags ?? []).filter((flag) => flag.tone === 'danger'))
  if (charts.postpartum?.length) flags.push(...(postpartumSummary(charts.postpartum)?.flags ?? []).filter((flag) => flag.tone === 'danger'))
  const lastGlucose = charts.glucose?.[charts.glucose.length - 1]
  if (lastGlucose) { const flag = glucoseFlag(lastGlucose); if (flag?.tone === 'danger') flags.push(flag) }
  const lastAnc = charts.anc?.[charts.anc.length - 1]
  if (lastAnc) flags.push(...ancFlags(lastAnc).filter((flag) => flag.tone === 'danger'))
  return flags
}
