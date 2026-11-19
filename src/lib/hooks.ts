import { useEffect, useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import type { Patient } from '../types'

/** Current timestamp, refreshed on an interval so relative times stay accurate. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

/** Patients indexed by id for joining records that store a patientId. */
export function usePatients() {
  const { state } = useHospital()
  return useMemo(() => new Map<string, Patient>(state.patients.map((patient) => [patient.id, patient])), [state.patients])
}

export const matches = (query: string, ...fields: Array<string | undefined>) =>
  !query.trim() || fields.join(' ').toLowerCase().includes(query.trim().toLowerCase())

type ThemeChoice = 'system' | 'light' | 'dark'

function readPref<T extends string>(key: string, fallback: T): T {
  try { return (localStorage.getItem(key) as T | null) ?? fallback } catch { return fallback }
}
function writePref(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable */ }
}

/** Light/dark theme: follows the device until the person picks one. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(() => readPref<ThemeChoice>('northstar-theme', 'system'))
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    writePref('northstar-theme', theme)
  }, [theme])
  const cycle = () => setTheme((current) => (current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'))
  return { theme, cycle }
}

/** Alert sound preference for emergency codes and pages. */
export function useSoundPref() {
  const [on, setOn] = useState(() => readPref<string>('northstar-sound', 'off') === 'on')
  useEffect(() => { writePref('northstar-sound', on ? 'on' : 'off') }, [on])
  return [on, setOn] as const
}

let audio: AudioContext | null = null
/** Three short 880 Hz beeps, as in Selam. Silently does nothing if audio is blocked. */
export function beep(count = 3) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audio = audio ?? new Ctx()
    for (let i = 0; i < count; i += 1) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.08
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(audio.currentTime + i * 0.35)
      osc.stop(audio.currentTime + i * 0.35 + 0.2)
    }
  } catch { /* audio unavailable */ }
}

/**
 * Administrators don't see patient identities: replaces patient names with
 * their MRN in free text (activity, audit) and returns a display label.
 */
export function useRedact() {
  const { state, currentRole } = useHospital()
  return useMemo(() => {
    const hide = currentRole === 'administrator'
    const patients = state.patients
    return {
      hide,
      text: (value: string) => hide ? patients.reduce((out, patient) => out.split(patient.name).join(patient.mrn), value) : value,
      name: (patient: Patient) => hide ? `Patient ${patient.mrn}` : patient.name,
    }
  }, [state.patients, currentRole])
}
