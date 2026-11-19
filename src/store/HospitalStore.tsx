import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createInitialState, departmentSeed, invoiceTotals, roleProfiles } from '../data'
import { ORDER_STAGES, orderStage, patientNews2, statusForStage } from '../lib/clinical'
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
  BedState,
  Consciousness,
  DischargeSummary,
  Evaluation,
  Invoice,
  StaffMember,
} from '../types'

const DATA_KEY = 'northstar-careos-data-v3'
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
  addNote: (patientId: string, note: string, title?: string) => void
  dischargePatient: (patientId: string) => void
  createPrescription: (input: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'prescriber'>) => void
  setPrescriptionStatus: (id: string, status: RxStatus) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  scheduleAppointment: (input: Omit<Appointment, 'id' | 'status'>) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  setStaffDuty: (id: string, onDuty: boolean) => void
  activateCode: (id: string, location: string) => void
  standDownCode: (id: string) => void
  recordObservations: (patientId: string, vitals: Vitals, onOxygen: boolean, consciousness: Consciousness) => void
  escalatePatient: (patientId: string) => void
  advanceOrder: (orderId: string, result?: string, toStage?: number) => void
  setBedState: (bedId: string, state: BedState) => void
  addHandover: (patientId: string, to: string, note: string) => void
  acknowledgeHandover: (id: string) => void
  registerPatient: (input: { name: string; age: number; sex: Patient['sex']; phone: string; insurance: string; complaint: string }) => void
  completeTriage: (patientId: string, input: { vitals: Vitals; esi: Patient['esi']; history: string; impression: string; allergies: string[]; department: DepartmentId }) => void
  sendPage: (toStaffId: string, message: string, urgent: boolean) => void
  acknowledgePage: (id: string) => void
  advanceTheatreCase: (id: string) => void
  toggleChecklist: (id: string, index: number) => void
  saveAnaesthesia: (id: string, input: { asa: 1 | 2 | 3 | 4 | 5; technique: string; airway: string }) => void
  logAnaesthesia: (id: string, entry: { hr: number; sbp: number; spo2: number; note: string }) => void
  cosignNote: (id: string) => void
  saveEvaluation: (patientId: string, evaluation: Omit<Evaluation, 'id' | 'at' | 'by'>) => void
  dischargeWithSummary: (patientId: string, summary: Omit<DischargeSummary, 'at' | 'by'>) => void
  recordGrowth: (patientId: string, entry: { ageYears: number; weightKg: number; heightCm: number }) => void
  recordPayment: (invoiceId: string, method: NonNullable<Invoice['payments']>[number]['method'], amount: number) => void
  generateInvoice: (patientId: string) => void
  restock: (medicationId: string, amount: number) => void
  createStaff: (input: Omit<StaffMember, 'id' | 'onDuty' | 'pager' | 'email' | 'phone' | 'license'>) => void
  setStaffSuspended: (id: string, suspended: boolean) => void
  setDepartmentServices: (id: DepartmentId, services: string[]) => void
  myStaffId: string | null
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
      wards: mergeById(parsed.wards, seed.wards),
      beds: mergeById(parsed.beds, seed.beds),
      handovers: mergeById(parsed.handovers, seed.handovers),
      pages: mergeById(parsed.pages, seed.pages),
      theatreCases: mergeById(parsed.theatreCases, seed.theatreCases),
      cosignNotes: mergeById(parsed.cosignNotes, seed.cosignNotes),
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
  physician: ['triage', 'refer', 'transfer', 'notes', 'discharge', 'cosign', 'prescribe', 'vitals', 'register'],
  nurse: ['triage', 'notes', 'vitals', 'administer', 'beds'],
  consultant: ['refer', 'notes', 'discharge', 'cosign', 'prescribe'],
  diagnostics: ['results', 'notes'],
  coordinator: ['transfer', 'notes', 'beds'],
  administrator: ['triage', 'refer', 'transfer', 'results', 'notes', 'discharge', 'manage', 'beds', 'billing', 'register'],
  intern: ['notes', 'vitals', 'prescribe', 'refer'],
  pharmacist: ['dispense', 'notes'],
  receptionist: ['register'],
  theatre: ['theatre', 'anaesthesia', 'notes', 'vitals'],
  allied: ['services', 'notes'],
  billing: ['billing'],
}

/** Where each role lands after sign-in. */
export const ROLE_HOME: Record<RoleId, string> = {
  physician: '/dashboard', nurse: '/dashboard', consultant: '/dashboard', diagnostics: '/dashboard', coordinator: '/dashboard', administrator: '/dashboard',
  intern: '/patients', pharmacist: '/pharmacy', receptionist: '/front-desk', theatre: '/theatres', allied: '/services', billing: '/billing',
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
          patients: withTimeline(previous.patients, patientId, { type: 'order', title: `${title.trim()} ordered`, detail: `${kind} order sent to ${unitName(department)}. Priority: ${priority}.`, author: actor, department, orderId: id }),
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
          orders: previous.orders.map((item) => item.id === orderId ? { ...item, status, stage: done ? ORDER_STAGES[item.kind].length - 1 : Math.max(1, orderStage(item)), result: result ?? item.result } : item),
          patients: withTimeline(previous.patients, patient.id, { type: done ? 'result' : 'order', title: done ? `${order.title} resulted` : `${order.title} started`, detail: result || `Study is now in progress with ${actor}.`, author: actor, department: order.department, orderId: order.id }),
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
      const wardIds = previous.wards.filter((ward) => ward.department === to).map((ward) => ward.id)
      const freeBed = previous.beds.find((bed) => wardIds.includes(bed.wardId) && bed.state === 'Available' && !bed.patientId)
      const beds = previous.beds.map((bed) => {
        if (bed.patientId === patientId) return { ...bed, patientId: undefined, state: 'Cleaning' as const }
        if (freeBed && bed.id === freeBed.id) return { ...bed, patientId }
        return bed
      })
      return {
        next: {
          ...previous,
          beds,
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

  const addNote = useCallback((patientId: string, note: string, title?: string) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const needsCosign = currentRole === 'intern'
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'note', title: needsCosign ? `${title ?? 'Clinical note'} (awaiting co-signature)` : title ?? 'Clinical note added', detail: note.trim(), author: actor, department: patient.department }),
          cosignNotes: needsCosign ? [{ id: makeId('CN'), patientId, author: actor, at: new Date().toISOString(), text: title ? `${title}: ${note.trim()}` : note.trim(), status: 'Pending review' }, ...previous.cosignNotes] : previous.cosignNotes,
        },
        actor, action: `added ${title ? title.toLowerCase() : 'a clinical note'} for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify(currentRole === 'intern' ? 'Note saved and sent for co-signature' : 'Note saved to the shared episode')
  }, [actorName, commit, currentRole, notify])

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
          beds: previous.beds.map((bed) => bed.patientId === patientId ? { ...bed, patientId: undefined, state: 'Cleaning' as const } : bed),
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
      const changes: Partial<Prescription> = { status, ...(status === 'Verified' ? { verifiedBy: actor } : status === 'Dispensed' ? { dispensedBy: actor } : status === 'Administered' ? { administrations: [...(rx.administrations ?? []), { at: new Date().toISOString(), by: actor }] } : {}) }
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

  const myStaffId = useMemo(() => {
    if (!currentRole) return null
    return state.staff.find((member) => member.roleId === currentRole)?.id ?? null
  }, [currentRole, state.staff])

  const recordObservations = useCallback((patientId: string, vitals: Vitals, onOxygen: boolean, consciousness: Consciousness) => {
    const actor = actorName('Nursing team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const set = { ...vitals, at: new Date().toISOString(), by: actor, onOxygen, consciousness }
      const updated = { ...patient, vitals, observations: [set, ...(patient.observations ?? [])] }
      const score = patientNews2(updated)
      return {
        next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: `Observations recorded${score ? ` · NEWS2 ${score.score}` : ''}`, detail: `HR ${vitals.hr}, BP ${vitals.bpSys}/${vitals.bpDia}, RR ${vitals.rr}, SpO₂ ${vitals.spo2}%${onOxygen ? ' on oxygen' : ''}, T ${vitals.temp}°C, ${consciousness}.`, author: actor, department: patient.department }, { vitals, observations: set ? [set, ...(patient.observations ?? [])] : patient.observations }) },
        actor, action: `recorded observations for ${patient.name}${score ? ` (NEWS2 ${score.score})` : ''}`, department: patient.department, patientId,
      }
    })
    notify('Observations saved')
  }, [actorName, commit, notify])

  const escalatePatient = useCallback((patientId: string) => {
    const actor = actorName('Nursing team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      const score = patient && patientNews2(patient)
      if (!patient || !score) return null
      return {
        next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: `Escalated to doctor · NEWS2 ${score.score}`, detail: `${score.detail.join(', ') || 'Clinical concern'}. Medical review requested.`, author: actor, department: patient.department }, { escalation: { at: new Date().toISOString(), by: actor, score: score.score } }) },
        actor, action: `escalated ${patient.name} to the medical team (NEWS2 ${score.score})`, department: patient.department, patientId,
      }
    })
    notify('Escalated — the medical team has been alerted', 'warning')
  }, [actorName, commit, notify])

  const advanceOrder = useCallback((orderId: string, result?: string, toStage?: number) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      const patient = order && previous.patients.find((item) => item.id === order.patientId)
      if (!order || !patient) return null
      const stages = ORDER_STAGES[order.kind]
      const next = Math.min(toStage ?? orderStage(order) + 1, stages.length - 1)
      const status = statusForStage(order.kind, next)
      const specimen = order.kind === 'Laboratory' && next === 1 ? { id: `SP-${Math.floor(1000 + Math.random() * 9000)}`, type: /gas/i.test(order.title) ? 'Arterial blood' : /culture/i.test(order.title) ? 'Blood culture bottles' : 'Venous blood', collectedBy: actor, collectedAt: new Date().toISOString() } : order.specimen
      return {
        next: {
          ...previous,
          orders: previous.orders.map((item) => item.id === orderId ? { ...item, stage: next, status, specimen, result: result ?? item.result } : item),
          patients: withTimeline(previous.patients, patient.id, { type: status === 'completed' || result ? 'result' : 'order', title: `${order.title}: ${stages[next].toLowerCase()}`, detail: result || `${order.kind} order moved to “${stages[next]}” by ${actor}.`, author: actor, department: order.department, orderId: order.id }),
        },
        actor, action: `marked ${order.title} ${stages[next].toLowerCase()} for ${patient.name}`, department: order.department, patientId: patient.id,
      }
    })
    notify('Order updated')
  }, [actorName, commit, notify])

  const setBedState = useCallback((bedId: string, bedState: BedState) => {
    const actor = actorName('Flow team')
    commit((previous) => {
      const bed = previous.beds.find((item) => item.id === bedId)
      if (!bed || bed.patientId) return null
      return { next: { ...previous, beds: previous.beds.map((item) => item.id === bedId ? { ...item, state: bedState } : item) }, actor, action: `set bed ${bedId} to ${bedState.toLowerCase()}`, department: previous.wards.find((ward) => ward.id === bed.wardId)?.department ?? 'ward' }
    })
  }, [actorName, commit])

  const addHandover = useCallback((patientId: string, to: string, note: string) => {
    const actor = actorName('Nursing team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      return {
        next: { ...previous, handovers: [{ id: makeId('HO'), patientId, from: actor, to, note: note.trim(), at: new Date().toISOString() }, ...previous.handovers], patients: withTimeline(previous.patients, patientId, { type: 'note', title: `Handed over to ${to}`, detail: note.trim(), author: actor, department: patient.department }) },
        actor, action: `handed over ${patient.name} to ${to}`, department: patient.department, patientId,
      }
    })
    notify('Handover recorded')
  }, [actorName, commit, notify])

  const acknowledgeHandover = useCallback((id: string) => {
    const actor = actorName('Nursing team')
    commit((previous) => {
      const handover = previous.handovers.find((item) => item.id === id)
      const patient = handover && previous.patients.find((item) => item.id === handover.patientId)
      if (!handover || !patient || handover.acknowledgedAt) return null
      return { next: { ...previous, handovers: previous.handovers.map((item) => item.id === id ? { ...item, acknowledgedAt: new Date().toISOString() } : item) }, actor, action: `acknowledged the handover for ${patient.name}`, department: patient.department, patientId: patient.id }
    })
    notify('Handover acknowledged')
  }, [actorName, commit, notify])

  const registerPatient = useCallback((input: { name: string; age: number; sex: Patient['sex']; phone: string; insurance: string; complaint: string }) => {
    const actor = actorName('Front desk')
    const now = new Date().toISOString()
    const patientId = makeId('p')
    const patient: Patient = {
      id: patientId, mrn: `NS-${String(Math.floor(100000 + Math.random() * 899999))}`, name: input.name.trim(), age: input.age, sex: input.sex,
      pronouns: input.sex === 'Female' ? 'she/her' : input.sex === 'Male' ? 'he/him' : 'they/them', complaint: input.complaint.trim(), history: 'Awaiting triage assessment.',
      allergies: ['Not yet recorded'], arrival: now, esi: 3, riskFactors: [], resources: 0, vitals: { hr: 0, rr: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, gcs: 15, pain: 0 },
      department: input.age < 12 ? 'pediatrics' : 'emergency', location: 'Front desk · waiting area', status: 'awaiting-triage', encounterType: 'outpatient', assignedTo: 'Unassigned',
      insurance: input.insurance, phone: input.phone.trim() || undefined,
      timeline: [{ id: makeId('ev'), at: now, type: 'arrival', title: 'Registered at front desk', detail: `Reason for visit: ${input.complaint.trim()}. Insurance: ${input.insurance}.`, author: actor, department: input.age < 12 ? 'pediatrics' : 'emergency' }],
    }
    commit((previous) => ({ next: { ...previous, patients: [patient, ...previous.patients] }, actor, action: `registered ${patient.name} and sent them for triage`, department: patient.department, patientId }))
    notify(`${patient.name} registered — waiting for triage`)
  }, [actorName, commit, notify])

  const completeTriage = useCallback((patientId: string, input: { vitals: Vitals; esi: Patient['esi']; history: string; impression: string; allergies: string[]; department: DepartmentId }) => {
    const actor = actorName('Triage team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient || patient.status !== 'awaiting-triage') return null
      const set = { ...input.vitals, at: new Date().toISOString(), by: actor, onOxygen: false, consciousness: (input.vitals.gcs < 15 ? 'New confusion' : 'Alert') as Consciousness }
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'triage', title: `Triaged ESI ${input.esi}`, detail: `${input.impression}. ${input.history}`.trim(), author: actor, department: input.department }, {
            vitals: input.vitals, observations: [set], esi: input.esi, status: 'waiting', department: input.department, history: input.history || patient.history,
            allergies: input.allergies.length ? input.allergies : ['No known allergies'], location: input.esi <= 2 ? 'ED priority queue' : 'Waiting Room A', complaint: input.impression || patient.complaint,
          }),
        },
        actor, action: `completed ESI ${input.esi} triage for ${patient.name}`, department: input.department, patientId,
      }
    })
    notify('Triage complete — patient is waiting for a doctor')
  }, [actorName, commit, notify])

  const sendPage = useCallback((toStaffId: string, message: string, urgent: boolean) => {
    const actor = actorName('Switchboard')
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === toStaffId)
      if (!member) return null
      return { next: { ...previous, pages: [{ id: makeId('PG'), from: actor, toStaffId, message: message.trim(), urgent, at: new Date().toISOString() }, ...previous.pages] }, actor, action: `${urgent ? 'urgently ' : ''}paged ${member.name}`, department: member.department }
    })
    notify('Page sent', 'info')
  }, [actorName, commit, notify])

  const acknowledgePage = useCallback((id: string) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const page = previous.pages.find((item) => item.id === id)
      if (!page || page.acknowledgedAt) return null
      return { next: { ...previous, pages: previous.pages.map((item) => item.id === id ? { ...item, acknowledgedAt: new Date().toISOString() } : item) }, actor, action: `acknowledged a page from ${page.from}`, department: 'emergency' }
    })
  }, [actorName, commit])

  const advanceTheatreCase = useCallback((id: string) => {
    const actor = actorName('Theatre team')
    const current = stateRef.current.theatreCases.find((item) => item.id === id)
    if (current?.stage === 1 && current.checklist.some((done) => !done)) { notify('Complete the safety checklist before theatre', 'warning'); return }
    if (current?.stage === 1 && !current.anaesthesia) { notify('Record the pre-anaesthesia assessment first', 'warning'); return }
    commit((previous) => {
      const item = previous.theatreCases.find((candidate) => candidate.id === id)
      const patient = item && previous.patients.find((candidate) => candidate.id === item.patientId)
      if (!item || !patient || item.stage >= 4) return null
      const stage = item.stage + 1
      const labels = ['scheduled', 'started the pre-op check for', 'sent to theatre', 'moved to recovery', 'handed over to the ward']
      return {
        next: { ...previous, theatreCases: previous.theatreCases.map((candidate) => candidate.id === id ? { ...candidate, stage } : candidate), patients: withTimeline(previous.patients, patient.id, { type: 'transfer', title: `${item.procedure}: ${['Scheduled', 'Pre-op check', 'In theatre', 'Recovery', 'Handed over'][stage].toLowerCase()}`, detail: `${item.room} · ${item.surgeon}`, author: actor, department: 'surgery' }) },
        actor, action: `${labels[stage]} ${patient.name} (${item.procedure})`, department: 'surgery', patientId: patient.id,
      }
    })
  }, [actorName, commit, notify])

  const toggleChecklist = useCallback((id: string, index: number) => {
    setState((previous) => ({ ...previous, theatreCases: previous.theatreCases.map((item) => item.id === id ? { ...item, checklist: item.checklist.map((done, i) => i === index ? !done : done) } : item) }))
  }, [])

  const saveAnaesthesia = useCallback((id: string, input: { asa: 1 | 2 | 3 | 4 | 5; technique: string; airway: string }) => {
    const actor = actorName('Anaesthesia')
    commit((previous) => {
      const item = previous.theatreCases.find((candidate) => candidate.id === id)
      if (!item) return null
      return { next: { ...previous, theatreCases: previous.theatreCases.map((candidate) => candidate.id === id ? { ...candidate, anaesthesia: { ...input, by: actor, log: candidate.anaesthesia?.log ?? [] } } : candidate) }, actor, action: `recorded the pre-anaesthesia assessment for ${item.procedure}`, department: 'surgery', patientId: item.patientId }
    })
    notify('Anaesthesia assessment saved')
  }, [actorName, commit, notify])

  const logAnaesthesia = useCallback((id: string, entry: { hr: number; sbp: number; spo2: number; note: string }) => {
    setState((previous) => ({ ...previous, theatreCases: previous.theatreCases.map((item) => item.id === id && item.anaesthesia ? { ...item, anaesthesia: { ...item.anaesthesia, log: [...item.anaesthesia.log, { ...entry, at: new Date().toISOString() }] } } : item) }))
  }, [])

  const cosignNote = useCallback((id: string) => {
    const actor = actorName('Consultant')
    commit((previous) => {
      const note = previous.cosignNotes.find((item) => item.id === id)
      const patient = note && previous.patients.find((item) => item.id === note.patientId)
      if (!note || !patient || note.status === 'Co-signed') return null
      return {
        next: { ...previous, cosignNotes: previous.cosignNotes.map((item) => item.id === id ? { ...item, status: 'Co-signed', cosignedBy: actor } : item), patients: withTimeline(previous.patients, patient.id, { type: 'note', title: `Note by ${note.author} co-signed`, detail: note.text, author: actor, department: patient.department }) },
        actor, action: `co-signed a note by ${note.author} for ${patient.name}`, department: patient.department, patientId: patient.id,
      }
    })
    notify('Note co-signed')
  }, [actorName, commit, notify])

  const saveEvaluation = useCallback((patientId: string, evaluation: Omit<Evaluation, 'id' | 'at' | 'by'>) => {
    const actor = actorName('Clinical team')
    const pending = currentRole === 'intern'
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const id = makeId('EV')
      const working = evaluation.differentials.find((item) => item.working)
      const summary = `${working ? `Working diagnosis: ${working.condition}${working.icd10 ? ` (${working.icd10})` : ''}. ` : ''}${evaluation.plan}`
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'note', title: pending ? 'Clinical evaluation (awaiting co-signature)' : 'Clinical evaluation', detail: summary, author: actor, department: patient.department }, { evaluations: [{ ...evaluation, id, at: new Date().toISOString(), by: actor }, ...(patient.evaluations ?? [])], complaint: !pending && working ? working.condition : patient.complaint }),
          cosignNotes: pending ? [{ id: makeId('CN'), patientId, author: actor, at: new Date().toISOString(), text: `Clinical evaluation. ${summary}`, status: 'Pending review', evaluationId: id }, ...previous.cosignNotes] : previous.cosignNotes,
        },
        actor, action: `completed a clinical evaluation for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify(pending ? 'Evaluation saved and sent for co-signature' : 'Evaluation saved')
  }, [actorName, commit, currentRole, notify])

  const dischargeWithSummary = useCallback((patientId: string, summary: Omit<DischargeSummary, 'at' | 'by'>) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient || patient.status === 'discharged') return null
      const wasInpatient = ['admitted', 'observation'].includes(patient.status)
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'discharge', title: `Discharged · ${summary.condition}`, detail: `${summary.diagnosis}. Follow-up: ${summary.followUp} on ${summary.followUpDate}.`, author: actor, department: patient.department }, { status: 'discharged', location: 'Discharged home', encounterType: patient.encounterType ?? (wasInpatient ? 'inpatient' : 'outpatient'), discharge: { ...summary, at: new Date().toISOString(), by: actor } }),
          departments: previous.departments.map((department) => department.id === patient.department && wasInpatient ? { ...department, occupied: Math.max(0, department.occupied - 1) } : department),
          beds: previous.beds.map((bed) => bed.patientId === patientId ? { ...bed, patientId: undefined, state: 'Cleaning' as const } : bed),
        },
        actor, action: `discharged ${patient.name} with a discharge summary`, department: patient.department, patientId,
      }
    })
    notify('Discharge summary signed and patient discharged')
  }, [actorName, commit, notify])

  const recordGrowth = useCallback((patientId: string, entry: { ageYears: number; weightKg: number; heightCm: number }) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      return { next: { ...previous, patients: previous.patients.map((item) => item.id === patientId ? { ...item, weightKg: entry.weightKg, growth: [...(item.growth ?? []), { ...entry, at: new Date().toISOString() }] } : item) }, actor, action: `recorded growth measurements for ${patient.name}`, department: patient.department, patientId }
    })
    notify('Growth measurement saved')
  }, [actorName, commit, notify])

  const recordPayment = useCallback((invoiceId: string, method: NonNullable<Invoice['payments']>[number]['method'], amount: number) => {
    const actor = actorName('Billing office')
    commit((previous) => {
      const invoice = previous.invoices.find((item) => item.id === invoiceId)
      if (!invoice || amount <= 0) return null
      const payments = [...(invoice.payments ?? []), { at: new Date().toISOString(), by: actor, method, amount }]
      const totals = invoiceTotals(invoice)
      const paidByPatient = payments.filter((pay) => pay.method !== 'Insurer').reduce((sum, pay) => sum + pay.amount, 0)
      const insurerPaid = payments.some((pay) => pay.method === 'Insurer')
      const settled = paidByPatient + 0.005 >= totals.patientPayable && (insurerPaid || !invoice.insuranceProvider || invoice.insuranceCovered === 0)
      return { next: { ...previous, invoices: previous.invoices.map((item) => item.id === invoiceId ? { ...item, payments, status: settled ? 'Paid' : item.status, paidAt: settled ? new Date().toISOString() : item.paidAt } : item) }, actor, action: `recorded a ${method.toLowerCase()} payment of ${amount.toFixed(2)} on ${invoiceId}`, department: 'emergency', patientId: invoice.patientId }
    })
    notify('Payment recorded')
  }, [actorName, commit, notify])

  const generateInvoice = useCallback((patientId: string) => {
    const actor = actorName('Billing office')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const tariff: Record<string, number> = { Laboratory: 85, Imaging: 420, Medication: 35, Procedure: 650, Physiotherapy: 110, Nutrition: 70, 'Blood bank': 480 }
      const items = [
        { id: makeId('b'), description: 'Consultation', code: '99284', category: 'Consultation', quantity: 1, unitPrice: 320 },
        ...previous.orders.filter((order) => order.patientId === patientId).map((order) => ({ id: makeId('b'), description: `${order.kind}: ${order.title}`, code: order.id, category: order.kind, quantity: 1, unitPrice: tariff[order.kind] ?? 100 })),
        ...(['admitted', 'observation'].includes(patient.status) ? [{ id: makeId('b'), description: 'Room and nursing (per day)', code: '99231', category: 'Room & nursing', quantity: 1, unitPrice: 850 }] : []),
        ...previous.theatreCases.filter((item) => item.patientId === patientId).map((item) => ({ id: makeId('b'), description: `Procedure: ${item.procedure}`, code: item.id, category: 'Procedure', quantity: 1, unitPrice: 4200 })),
      ]
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      const insured = Boolean(patient.insurance && patient.insurance !== 'Self-pay')
      const id = nextNumber(previous.invoices.map((item) => item.id), 'INV', 24000)
      const invoice: Invoice = { id, patientId, issuedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), items, tax: Math.round(subtotal * 0.08 * 100) / 100, discount: 0, insuranceCovered: insured ? Math.round(subtotal * 0.8 * 100) / 100 : 0, insuranceProvider: insured ? patient.insurance : undefined, status: 'Pending' }
      return { next: { ...previous, invoices: [invoice, ...previous.invoices] }, actor, action: `generated invoice ${id} for ${patient.name}`, department: patient.department, patientId }
    })
    notify('Invoice generated from orders')
  }, [actorName, commit, notify])

  const restock = useCallback((medicationId: string, amount: number) => {
    const actor = actorName('Pharmacy team')
    commit((previous) => {
      const med = previous.formulary.find((item) => item.id === medicationId)
      if (!med) return null
      return { next: { ...previous, formulary: previous.formulary.map((item) => item.id === medicationId ? { ...item, stock: item.stock + amount } : item) }, actor, action: `restocked ${med.name} (+${amount} ${med.unit})`, department: 'pharmacy' }
    })
    notify('Stock updated')
  }, [actorName, commit, notify])

  const createStaff = useCallback((input: Omit<StaffMember, 'id' | 'onDuty' | 'pager' | 'email' | 'phone' | 'license'>) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const id = nextNumber(previous.staff.map((item) => item.id), 'ST', 0).replace(/ST-(\d)$/, 'ST-0$1')
      const handle = input.name.toLowerCase().replace(/^(dr|mr|ms|mrs)\.?\s+/, '').replace(/,.*$/, '').trim().replace(/\s+/g, '.')
      const member: StaffMember = { ...input, id, onDuty: false, pager: `PG-${String(4100 + previous.staff.length)}`, email: `${handle}@northstar.example`, phone: `x${2800 + previous.staff.length}`, license: 'Not yet verified' }
      return { next: { ...previous, staff: [...previous.staff, member] }, actor, action: `created an account for ${member.name}`, department: member.department }
    })
    notify('Staff account created')
  }, [actorName, commit, notify])

  const setStaffSuspended = useCallback((id: string, suspended: boolean) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === id)
      if (!member) return null
      return { next: { ...previous, staff: previous.staff.map((item) => item.id === id ? { ...item, suspended, onDuty: suspended ? false : item.onDuty } : item) }, actor, action: `${suspended ? 'suspended' : 'reactivated'} the account of ${member.name}`, department: member.department }
    })
    notify(suspended ? 'Account suspended' : 'Account reactivated', 'info')
  }, [actorName, commit, notify])

  const setDepartmentServices = useCallback((id: DepartmentId, services: string[]) => {
    const actor = actorName('Administrator')
    commit((previous) => ({ next: { ...previous, departments: previous.departments.map((department) => department.id === id ? { ...department, services } : department) }, actor, action: `updated the units of ${unitName(id)}`, department: id }))
    notify('Department units updated')
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
    recordObservations, escalatePatient, advanceOrder, setBedState, addHandover, acknowledgeHandover, registerPatient, completeTriage, sendPage, acknowledgePage,
    advanceTheatreCase, toggleChecklist, saveAnaesthesia, logAnaesthesia, cosignNote, saveEvaluation, dischargeWithSummary, recordGrowth, recordPayment, generateInvoice, restock, createStaff, setStaffSuspended, setDepartmentServices, myStaffId,
    resetDemo, notify, dismissToast,
  }), [recordObservations, escalatePatient, advanceOrder, setBedState, addHandover, acknowledgeHandover, registerPatient, completeTriage, sendPage, acknowledgePage, advanceTheatreCase, toggleChecklist, saveAnaesthesia, logAnaesthesia, cosignNote, saveEvaluation, dischargeWithSummary, recordGrowth, recordPayment, generateInvoice, restock, createStaff, setStaffSuspended, setDepartmentServices, myStaffId, state, currentRole, profile, selectedPatientId, toasts, login, logout, can, addTriage, retriage, addReferral, updateReferral, addOrder, updateOrder, transferPatient, addNote, dischargePatient, createPrescription, setPrescriptionStatus, setInvoiceStatus, scheduleAppointment, setAppointmentStatus, setStaffDuty, activateCode, standDownCode, resetDemo, notify, dismissToast])

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
}

export function useHospital() {
  const context = useContext(HospitalContext)
  if (!context) throw new Error('useHospital must be used within HospitalProvider')
  return context
}
