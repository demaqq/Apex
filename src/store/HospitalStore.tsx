import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createInitialState, departmentSeed, roleProfiles } from '../data'
import type {
  AppointmentStatus,
  ClinicalOrder,
  DepartmentId,
  HospitalState,
  InvoiceStatus,
  OrderStatus,
  Patient,
  Permission,
  Prescription,
  Priority,
  ReferralStatus,
  RoleId,
  RoleProfile,
  RxStatus,
  TriageInput,
  Vitals,
  Appointment,
} from '../types'

const DATA_KEY = 'northstar-careos-data-v2'
const SESSION_KEY = 'northstar-careos-session'
const DEPARTMENT_KEY = 'northstar-careos-department'
const INPATIENT_UNITS: DepartmentId[] = ['ward', 'icu', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'obgyn', 'internal-medicine']

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'warning'
}

interface HospitalContextValue {
  state: HospitalState
  currentRole: RoleId | null
  profile: RoleProfile | null
  selectedPatientId: string | null
  toasts: Toast[]
  login: (role: RoleId, remember: boolean, department?: DepartmentId) => void
  logout: () => void
  can: (permission: Permission) => boolean
  setSelectedPatientId: (id: string | null) => void
  addTriage: (input: TriageInput) => string
  retriage: (patientId: string, vitals: Vitals, esi: Patient['esi'], reason: string) => void
  addReferral: (patientId: string, to: DepartmentId, reason: string, priority: Priority) => void
  updateReferral: (id: string, status: ReferralStatus, recommendation?: string) => void
  addOrder: (patientId: string, title: string, kind: ClinicalOrder['kind'], department: DepartmentId, priority: Priority) => void
  updateOrder: (id: string, status: OrderStatus, result?: string) => void
  transferPatient: (patientId: string, to: DepartmentId, location: string) => void
  addNote: (patientId: string, note: string) => void
  dischargePatient: (patientId: string) => void
  createPrescription: (input: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'prescriber'>) => void
  setPrescriptionStatus: (id: string, status: RxStatus) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  scheduleAppointment: (input: Omit<Appointment, 'id' | 'status'>) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  setStaffDuty: (id: string, onDuty: boolean) => void
  activateCode: (id: string, location: string) => void
  standDownCode: (id: string) => void
  resetDemo: () => void
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const HospitalContext = createContext<HospitalContextValue | null>(null)

/** Keeps saved records and adds any seed records (by id) that the saved copy predates. */
function mergeById<T extends { id: string }>(saved: unknown, seed: T[]): T[] {
  if (!Array.isArray(saved)) return seed
  const ids = new Set(saved.map((item: T) => item.id))
  return [...(saved as T[]), ...seed.filter((item) => !ids.has(item.id))]
}

function loadState(): HospitalState {
  const seed = createInitialState()
  try {
    const saved = localStorage.getItem(DATA_KEY)
    if (!saved) return seed
    const parsed = JSON.parse(saved) as Partial<HospitalState>
    return {
      patients: mergeById(parsed.patients, seed.patients),
      departments: mergeById(parsed.departments, seed.departments),
      referrals: mergeById(parsed.referrals, seed.referrals),
      orders: mergeById(parsed.orders, seed.orders),
      activities: Array.isArray(parsed.activities) ? parsed.activities : seed.activities,
      formulary: mergeById(parsed.formulary, seed.formulary),
      prescriptions: mergeById(parsed.prescriptions, seed.prescriptions),
      invoices: mergeById(parsed.invoices, seed.invoices),
      appointments: mergeById(parsed.appointments, seed.appointments),
      staff: mergeById(parsed.staff, seed.staff),
      codes: mergeById(parsed.codes, seed.codes),
    }
  } catch {
    return seed
  }
}

function readSession(key: string) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function clearSession() {
  try {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(SESSION_KEY)
      storage.removeItem(DEPARTMENT_KEY)
    }
  } catch { /* storage unavailable */ }
}

function loadSessionRole(): RoleId | null {
  const value = readSession(SESSION_KEY)
  return value && value in roleProfiles ? value as RoleId : null
}

function loadSessionDepartment(): DepartmentId | null {
  const value = readSession(DEPARTMENT_KEY)
  return departmentSeed.some((department) => department.id === value) ? value as DepartmentId : null
}

const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const nextNumber = (ids: string[], prefix: string, start: number) =>
  `${prefix}-${Math.max(start, ...ids.map((id) => Number(id.replace(`${prefix}-`, '')) || 0)) + 1}`
const unitName = (id: DepartmentId) => departmentSeed.find((department) => department.id === id)?.shortName ?? id

const permissions: Record<RoleId, Permission[]> = {
  physician: ['triage', 'refer', 'transfer', 'notes', 'discharge'],
  nurse: ['triage', 'notes'],
  consultant: ['refer', 'notes', 'discharge'],
  diagnostics: ['results', 'notes'],
  coordinator: ['transfer', 'notes'],
  administrator: ['triage', 'refer', 'transfer', 'results', 'notes', 'discharge', 'manage'],
}

export function HospitalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HospitalState>(loadState)
  const [currentRole, setCurrentRole] = useState<RoleId | null>(loadSessionRole)
  const [currentDepartment, setCurrentDepartment] = useState<DepartmentId | null>(loadSessionDepartment)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastTimers = useRef(new Map<number, number>())
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(state)) } catch { /* storage full or unavailable */ }
  }, [state])

  useEffect(() => {
    const timers = toastTimers.current
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const dismissToast = useCallback((toastId: number) => {
    window.clearTimeout(toastTimers.current.get(toastId))
    toastTimers.current.delete(toastId)
    setToasts((items) => items.filter((item) => item.id !== toastId))
  }, [])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const toastId = Date.now() + Math.random()
    setToasts((items) => [...items.slice(-2), { id: toastId, message, tone }])
    toastTimers.current.set(toastId, window.setTimeout(() => dismissToast(toastId), 4200))
  }, [dismissToast])

  const login = useCallback((role: RoleId, remember: boolean, department?: DepartmentId) => {
    clearSession()
    const selectedDepartment = department ?? roleProfiles[role].department
    try {
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(SESSION_KEY, role)
      storage.setItem(DEPARTMENT_KEY, selectedDepartment)
    } catch { /* session lasts for this tab only */ }
    setCurrentRole(role)
    setCurrentDepartment(selectedDepartment)
    setSelectedPatientId(null)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setCurrentRole(null)
    setCurrentDepartment(null)
    setSelectedPatientId(null)
  }, [])

  const can = useCallback((permission: Permission) => (currentRole ? permissions[currentRole].includes(permission) : false), [currentRole])

  const actorName = useCallback((fallback: string) => (currentRole ? roleProfiles[currentRole].name : fallback), [currentRole])

  /**
   * Applies a change to the hospital state and records it in the activity log.
   * `change` returns the next state plus the log entry, or null to abort.
   */
  const commit = useCallback((change: (previous: HospitalState) => { next: HospitalState; actor: string; action: string; department: DepartmentId; patientId?: string } | null) => {
    setState((previous) => {
      const result = change(previous)
      if (!result) return previous
      const { next, actor, action, department, patientId } = result
      return { ...next, activities: [{ id: makeId('ac'), at: new Date().toISOString(), actor, action, department, patientId }, ...next.activities].slice(0, 200) }
    })
  }, [])

  const withTimeline = (patients: Patient[], patientId: string, event: Omit<Patient['timeline'][number], 'id' | 'at'>, changes: Partial<Patient> = {}) =>
    patients.map((item) => item.id === patientId ? { ...item, ...changes, timeline: [{ id: makeId('ev'), at: new Date().toISOString(), ...event }, ...item.timeline] } : item)

  const addTriage = useCallback((input: TriageInput) => {
    const patientId = makeId('p')
    const now = new Date().toISOString()
    const actor = actorName('Triage team')
    const patient: Patient = {
      id: patientId,
      mrn: `NS-${String(Math.floor(100000 + Math.random() * 899999))}`,
      name: input.name.trim(),
      age: input.age,
      sex: input.sex,
      pronouns: input.sex === 'Female' ? 'she/her' : input.sex === 'Male' ? 'he/him' : 'they/them',
      complaint: input.complaint.trim(),
      history: input.history.trim() || 'No additional history recorded at initial triage.',
      allergies: input.allergies.length ? input.allergies : ['No known allergies'],
      arrival: now,
      esi: input.esi,
      esiOverride: input.overrideReason,
      riskFactors: input.riskFactors,
      resources: input.resources,
      vitals: input.vitals,
      department: 'emergency',
      encounterType: 'outpatient',
      location: input.esi === 1 ? 'Resus · allocation pending' : input.esi === 2 ? 'ED priority queue' : 'Waiting Room A',
      status: 'waiting',
      assignedTo: 'Unassigned',
      timeline: [
        { id: makeId('ev'), at: now, type: 'triage', title: `Triaged ESI ${input.esi}`, detail: input.overrideReason ? `Clinical override: ${input.overrideReason}` : `${input.resources} resource${input.resources === 1 ? '' : 's'} anticipated. ${input.riskFactors.length ? `Risk flags: ${input.riskFactors.join(', ')}.` : 'No high-risk flags recorded.'}`, author: actor, department: 'emergency' },
        { id: makeId('ev'), at: now, type: 'arrival', title: 'Patient registered', detail: 'New emergency attendance created at triage.', author: actor, department: 'emergency' },
      ],
    }
    commit((previous) => ({ next: { ...previous, patients: [patient, ...previous.patients] }, actor, action: `completed ESI ${input.esi} triage for ${patient.name}`, department: 'emergency', patientId }))
    notify(`${patient.name} added to the ESI ${input.esi} queue`)
    return patientId
  }, [actorName, commit, notify])

  const retriage = useCallback((patientId: string, vitals: Vitals, esi: Patient['esi'], reason: string) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      return {
        next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'triage', title: `Reassessed as ESI ${esi}`, detail: reason || 'Repeat observations recorded; acuity recalculated from current findings.', author: actor, department: patient.department }, { vitals, esi, esiOverride: reason || undefined }) },
        actor, action: `reassessed ${patient.name} as ESI ${esi}`, department: patient.department, patientId,
      }
    })
    notify('Observations and acuity updated')
  }, [actorName, commit, notify])

  const addReferral = useCallback((patientId: string, to: DepartmentId, reason: string, priority: Priority) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const now = new Date().toISOString()
      const id = nextNumber(previous.referrals.map((item) => item.id), 'RF', 2400)
      return {
        next: {
          ...previous,
          referrals: [{ id, patientId, from: patient.department, to, reason, priority, status: 'pending', createdAt: now, updatedAt: now, createdBy: actor }, ...previous.referrals],
          patients: withTimeline(previous.patients, patientId, { type: 'referral', title: `${unitName(to)} referral sent`, detail: reason, author: actor, department: to }),
        },
        actor, action: `sent a ${priority} referral for ${patient.name}`, department: to, patientId,
      }
    })
    notify(`Referral sent to ${unitName(to)}`)
  }, [actorName, commit, notify])

  const addOrder = useCallback((patientId: string, title: string, kind: ClinicalOrder['kind'], department: DepartmentId, priority: Priority) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const id = nextNumber(previous.orders.map((item) => item.id), 'OR', 8100)
      return {
        next: {
          ...previous,
          orders: [{ id, patientId, title: title.trim(), kind, department, priority, status: 'ordered', createdAt: new Date().toISOString(), createdBy: actor }, ...previous.orders],
          patients: withTimeline(previous.patients, patientId, { type: 'order', title: `${title.trim()} ordered`, detail: `${kind} order sent to ${unitName(department)}. Priority: ${priority}.`, author: actor, department }),
        },
        actor, action: `ordered ${title.trim()} for ${patient.name}`, department, patientId,
      }
    })
    notify(`${kind} order sent to ${unitName(department)}`)
  }, [actorName, commit, notify])

  const updateReferral = useCallback((referralId: string, status: ReferralStatus, recommendation?: string) => {
    const actor = actorName('Specialist team')
    commit((previous) => {
      const referral = previous.referrals.find((item) => item.id === referralId)
      const patient = referral && previous.patients.find((item) => item.id === referral.patientId)
      if (!referral || !patient) return null
      const now = new Date().toISOString()
      const title = { accepted: 'Referral accepted', completed: 'Consultation completed', declined: 'Referral declined', pending: 'Referral reopened' }[status]
      const detail = recommendation || (status === 'accepted' ? `${actor} accepted the referral and will review the clinical record.` : status === 'declined' ? 'Referral returned to the sending team for review.' : 'Specialist review completed.')
      return {
        next: {
          ...previous,
          referrals: previous.referrals.map((item) => item.id === referralId ? { ...item, status, updatedAt: now, owner: status === 'accepted' ? actor : item.owner, recommendation: recommendation ?? item.recommendation } : item),
          patients: withTimeline(previous.patients, patient.id, { type: 'referral', title, detail, author: actor, department: referral.to }),
        },
        actor, action: `${status} the referral for ${patient.name}`, department: referral.to, patientId: patient.id,
      }
    })
    notify(`Referral marked ${status}`)
  }, [actorName, commit, notify])

  const updateOrder = useCallback((orderId: string, status: OrderStatus, result?: string) => {
    const actor = actorName('Diagnostics team')
    commit((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      const patient = order && previous.patients.find((item) => item.id === order.patientId)
      if (!order || !patient) return null
      const done = status === 'completed'
      return {
        next: {
          ...previous,
          orders: previous.orders.map((item) => item.id === orderId ? { ...item, status, result: result ?? item.result } : item),
          patients: withTimeline(previous.patients, patient.id, { type: done ? 'result' : 'order', title: done ? `${order.title} resulted` : `${order.title} started`, detail: result || `Study is now in progress with ${actor}.`, author: actor, department: order.department }),
        },
        actor, action: `${done ? 'reported' : 'started'} ${order.title} for ${patient.name}`, department: order.department, patientId: patient.id,
      }
    })
    notify(status === 'completed' ? 'Result released to the clinical record' : 'Order moved to in progress')
  }, [actorName, commit, notify])

  const transferPatient = useCallback((patientId: string, to: DepartmentId, location: string) => {
    const actor = actorName('Flow team')
    const target = stateRef.current.departments.find((item) => item.id === to)
    if (!target || target.occupied >= target.capacity) {
      notify(`${unitName(to)} has no free capacity`, 'warning')
      return
    }
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      const destination = previous.departments.find((item) => item.id === to)
      if (!patient || !destination || destination.occupied >= destination.capacity) return null
      const inpatient = INPATIENT_UNITS.includes(to)
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'transfer', title: `Transferred to ${destination.shortName}`, detail: `${patient.location} → ${location}. Handoff coordinated by ${actor}.`, author: actor, department: to }, { department: to, location, status: inpatient ? 'admitted' : 'in-treatment', encounterType: inpatient ? 'inpatient' : 'outpatient' }),
          departments: previous.departments.map((department) => {
            if (department.id === patient.department && department.id !== to) return { ...department, occupied: Math.max(0, department.occupied - 1) }
            if (department.id === to && department.id !== patient.department) return { ...department, occupied: department.occupied + 1 }
            return department
          }),
        },
        actor, action: `transferred ${patient.name} to ${destination.shortName} · ${location}`, department: to, patientId,
      }
    })
    notify(`Transfer to ${unitName(to)} confirmed`)
  }, [actorName, commit, notify])

  const addNote = useCallback((patientId: string, note: string) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      return { next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: 'Clinical note added', detail: note.trim(), author: actor, department: patient.department }) }, actor, action: `added a clinical note for ${patient.name}`, department: patient.department, patientId }
    })
    notify('Note saved to the shared episode')
  }, [actorName, commit, notify])

  const dischargePatient = useCallback((patientId: string) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient || patient.status === 'discharged') return null
      const wasInpatient = ['admitted', 'observation'].includes(patient.status)
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'discharge', title: 'Episode completed', detail: 'Patient discharged. Clinical episode remains available in the record archive.', author: actor, department: patient.department }, { status: 'discharged', encounterType: patient.encounterType ?? (wasInpatient ? 'inpatient' : 'outpatient'), location: 'Discharged home' }),
          departments: previous.departments.map((department) => department.id === patient.department && wasInpatient ? { ...department, occupied: Math.max(0, department.occupied - 1) } : department),
        },
        actor, action: `completed the episode for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify('Patient discharged and episode archived')
    setSelectedPatientId(null)
  }, [actorName, commit, notify])

  const createPrescription = useCallback((input: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'prescriber'>) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === input.patientId)
      if (!patient) return null
      const id = nextNumber(previous.prescriptions.map((item) => item.id), 'RX', 3100)
      return { next: { ...previous, prescriptions: [{ ...input, id, prescriber: actor, createdAt: new Date().toISOString(), status: 'Pending' }, ...previous.prescriptions] }, actor, action: `prescribed ${id} for ${patient.name}`, department: 'pharmacy', patientId: patient.id }
    })
    notify('Prescription sent to pharmacy')
  }, [actorName, commit, notify])

  const setPrescriptionStatus = useCallback((id: string, status: RxStatus) => {
    const actor = actorName('Pharmacy team')
    if (status === 'Dispensed') {
      const { prescriptions, formulary } = stateRef.current
      const rx = prescriptions.find((item) => item.id === id)
      const short = rx?.items.find((item) => (formulary.find((med) => med.id === item.medicationId)?.stock ?? 0) < item.quantity)
      if (short) {
        notify(`Not enough stock to dispense ${id}`, 'warning')
        return
      }
    }
    commit((previous) => {
      const rx = previous.prescriptions.find((item) => item.id === id)
      const patient = rx && previous.patients.find((item) => item.id === rx.patientId)
      if (!rx || !patient) return null
      let formulary = previous.formulary
      if (status === 'Dispensed') {
        formulary = formulary.map((med) => {
          const used = rx.items.filter((item) => item.medicationId === med.id).reduce((sum, item) => sum + item.quantity, 0)
          return used ? { ...med, stock: med.stock - used } : med
        })
      }
      const changes: Partial<Prescription> = { status, ...(status === 'Verified' ? { verifiedBy: actor } : status === 'Dispensed' ? { dispensedBy: actor } : {}) }
      return { next: { ...previous, formulary, prescriptions: previous.prescriptions.map((item) => item.id === id ? { ...item, ...changes } : item) }, actor, action: `${status.toLowerCase()} ${id} for ${patient.name}`, department: 'pharmacy', patientId: patient.id }
    })
    notify(`${id} ${status.toLowerCase()}`)
  }, [actorName, commit, notify])

  const setInvoiceStatus = useCallback((id: string, status: InvoiceStatus) => {
    const actor = actorName('Billing office')
    commit((previous) => {
      const invoice = previous.invoices.find((item) => item.id === id)
      const patient = invoice && previous.patients.find((item) => item.id === invoice.patientId)
      if (!invoice || !patient) return null
      const changes = status === 'Paid' ? { status, paidAt: new Date().toISOString() } : status === 'Claim submitted' ? { status, claimId: invoice.claimId ?? `CLM-${Math.floor(100000 + Math.random() * 899999)}` } : { status }
      return { next: { ...previous, invoices: previous.invoices.map((item) => item.id === id ? { ...item, ...changes } : item) }, actor, action: status === 'Paid' ? `recorded payment for ${id}` : `submitted the insurance claim for ${id}`, department: patient.department, patientId: patient.id }
    })
    notify(status === 'Paid' ? `Payment recorded for ${id}` : `Claim submitted for ${id}`)
  }, [actorName, commit, notify])

  const scheduleAppointment = useCallback((input: Omit<Appointment, 'id' | 'status'>) => {
    const actor = actorName('Scheduling team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === input.patientId)
      if (!patient) return null
      const id = nextNumber(previous.appointments.map((item) => item.id), 'APT', 500)
      return { next: { ...previous, appointments: [...previous.appointments, { ...input, id, status: 'Scheduled' }] }, actor, action: `scheduled a ${input.mode.toLowerCase()} visit for ${patient.name}`, department: input.department, patientId: patient.id }
    })
    notify('Visit scheduled')
  }, [actorName, commit, notify])

  const setAppointmentStatus = useCallback((id: string, status: AppointmentStatus) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const appointment = previous.appointments.find((item) => item.id === id)
      const patient = appointment && previous.patients.find((item) => item.id === appointment.patientId)
      if (!appointment || !patient) return null
      const verb = { 'In progress': 'started', Completed: 'completed', Cancelled: 'cancelled', Scheduled: 'rescheduled' }[status]
      return { next: { ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, status } : item) }, actor, action: `${verb} the ${appointment.mode.toLowerCase()} visit for ${patient.name}`, department: appointment.department, patientId: patient.id }
    })
    notify(`Visit ${({ 'In progress': 'started', Completed: 'completed', Cancelled: 'cancelled', Scheduled: 'rescheduled' })[status]}`, status === 'Cancelled' ? 'info' : 'success')
  }, [actorName, commit, notify])

  const setStaffDuty = useCallback((id: string, onDuty: boolean) => {
    const actor = actorName('Rostering')
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === id)
      if (!member) return null
      return { next: { ...previous, staff: previous.staff.map((item) => item.id === id ? { ...item, onDuty } : item) }, actor, action: `marked ${member.name} ${onDuty ? 'on duty' : 'off duty'}`, department: member.department }
    })
    notify(onDuty ? 'Marked on duty' : 'Marked off duty', 'info')
  }, [actorName, commit, notify])

  const activateCode = useCallback((id: string, location: string) => {
    const actor = actorName('Switchboard')
    commit((previous) => {
      const code = previous.codes.find((item) => item.id === id)
      if (!code || code.active) return null
      return { next: { ...previous, codes: previous.codes.map((item) => item.id === id ? { ...item, active: true, location, activatedAt: new Date().toISOString(), activatedBy: actor } : item) }, actor, action: `activated ${code.label} · ${location}`, department: 'emergency' }
    })
    notify('Emergency code activated — responders paged', 'warning')
  }, [actorName, commit, notify])

  const standDownCode = useCallback((id: string) => {
    const actor = actorName('Switchboard')
    commit((previous) => {
      const code = previous.codes.find((item) => item.id === id)
      if (!code || !code.active) return null
      return { next: { ...previous, codes: previous.codes.map((item) => item.id === id ? { ...item, active: false, location: undefined, activatedAt: undefined, activatedBy: undefined } : item) }, actor, action: `stood down ${code.label}${code.location ? ` · ${code.location}` : ''}`, department: 'emergency' }
    })
    notify('Emergency code stood down', 'info')
  }, [actorName, commit, notify])

  const resetDemo = useCallback(() => {
    setState(createInitialState())
    setSelectedPatientId(null)
    notify('Demo data restored', 'info')
  }, [notify])

  const profile = useMemo<RoleProfile | null>(() => {
    if (!currentRole) return null
    const base = roleProfiles[currentRole]
    const departmentId = currentDepartment ?? base.department
    if (departmentId === base.department) return base
    const department = departmentSeed.find((item) => item.id === departmentId)
    if (!department) return base
    const specialtyProfile = { ...base, department: departmentId }
    if (currentRole === 'physician') return { ...specialtyProfile, title: `${department.shortName} Physician`, workspace: `${department.shortName} clinical command`, headline: `Your ${department.shortName.toLowerCase()} patients, first.`, description: `Specialty-specific inpatient and outpatient review, diagnostics and referrals for ${department.name}.` }
    if (currentRole === 'nurse') return { ...specialtyProfile, title: `${department.shortName} Nurse`, workspace: `${department.shortName} nursing workspace`, headline: `Safe, coordinated ${department.shortName.toLowerCase()} care.`, description: `A focused nursing census with inpatient observations, outpatient flow and shared handoffs across ${department.name}.` }
    if (currentRole === 'diagnostics') return { ...specialtyProfile, title: `${department.name} Specialist`, workspace: `${department.shortName} worklist`, headline: departmentId === 'laboratory' ? 'Return critical results, faster.' : base.headline, description: departmentId === 'laboratory' ? 'Prioritised specimens, analytical progress and verified results returned directly to the clinical episode.' : base.description }
    return specialtyProfile
  }, [currentRole, currentDepartment])

  const value = useMemo<HospitalContextValue>(() => ({
    state, currentRole, profile, selectedPatientId, toasts,
    login, logout, can, setSelectedPatientId,
    addTriage, retriage, addReferral, updateReferral, addOrder, updateOrder, transferPatient, addNote, dischargePatient,
    createPrescription, setPrescriptionStatus, setInvoiceStatus, scheduleAppointment, setAppointmentStatus, setStaffDuty, activateCode, standDownCode,
    resetDemo, notify, dismissToast,
  }), [state, currentRole, profile, selectedPatientId, toasts, login, logout, can, addTriage, retriage, addReferral, updateReferral, addOrder, updateOrder, transferPatient, addNote, dischargePatient, createPrescription, setPrescriptionStatus, setInvoiceStatus, scheduleAppointment, setAppointmentStatus, setStaffDuty, activateCode, standDownCode, resetDemo, notify, dismissToast])

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
}

export function useHospital() {
  const context = useContext(HospitalContext)
  if (!context) throw new Error('useHospital must be used within HospitalProvider')
  return context
}
