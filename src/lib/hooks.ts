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
