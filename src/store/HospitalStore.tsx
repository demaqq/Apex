import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createInitialState, departmentSeed, roleProfiles } from '../data'
import type { ClinicalOrder, DepartmentId, HospitalState, OrderStatus, Patient, Permission, Priority, ReferralStatus, RoleId, TriageInput, Vitals } from '../types'

const DATA_KEY = 'northstar-careos-data-v1'
const SESSION_KEY = 'northstar-careos-session'
const DEPARTMENT_KEY = 'northstar-careos-department'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'warning'
}

interface HospitalContextValue {
  state: HospitalState
  currentRole: RoleId | null
  profile: (typeof roleProfiles)[RoleId] | null
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
  resetDemo: () => void
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const HospitalContext = createContext<HospitalContextValue | null>(null)

function loadState(): HospitalState {
  try {
    const saved = localStorage.getItem(DATA_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as HospitalState
      if (parsed.patients?.length && parsed.departments?.length && parsed.referrals && parsed.orders) {
        const seed = createInitialState()
        return {
          ...parsed,
          patients: [...parsed.patients, ...seed.patients.filter((patient) => !parsed.patients.some((saved) => saved.id === patient.id))],
          departments: [...parsed.departments, ...seed.departments.filter((department) => !parsed.departments.some((saved) => saved.id === department.id))],
          referrals: [...parsed.referrals, ...seed.referrals.filter((referral) => !parsed.referrals.some((saved) => saved.id === referral.id))],
          orders: [...parsed.orders, ...seed.orders.filter((order) => !parsed.orders.some((saved) => saved.id === order.id))],
        }
      }
    }
  } catch {
  }
  return createInitialState()
}

function loadSession(): RoleId | null {
  const value = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  return value && value in roleProfiles ? value as RoleId : null
}

function loadSessionDepartment(): DepartmentId | null {
  const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage
  const value = storage.getItem(DEPARTMENT_KEY)
  return departmentSeed.some((department) => department.id === value) ? value as DepartmentId : null
}

const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

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
  const [currentRole, setCurrentRole] = useState<RoleId | null>(loadSession)
  const [currentDepartment, setCurrentDepartment] = useState<DepartmentId | null>(loadSessionDepartment)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(state))
  }, [state])

  const dismissToast = useCallback((toastId: number) => {
    setToasts((items) => items.filter((item) => item.id !== toastId))
  }, [])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const toastId = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((items) => [...items.slice(-2), { id: toastId, message, tone }])
    window.setTimeout(() => dismissToast(toastId), 4200)
  }, [dismissToast])

  const login = useCallback((role: RoleId, remember: boolean, department?: DepartmentId) => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(DEPARTMENT_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(DEPARTMENT_KEY)
    const storage = remember ? localStorage : sessionStorage
    const selectedDepartment = department ?? roleProfiles[role].department
    storage.setItem(SESSION_KEY, role)
    storage.setItem(DEPARTMENT_KEY, selectedDepartment)
    setCurrentRole(role)
    setCurrentDepartment(selectedDepartment)
    setSelectedPatientId(null)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(DEPARTMENT_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(DEPARTMENT_KEY)
    setCurrentRole(null)
    setCurrentDepartment(null)
    setSelectedPatientId(null)
  }, [])

  const can = useCallback((permission: Permission) => {
    return currentRole ? permissions[currentRole].includes(permission) : false
  }, [currentRole])

  const addActivity = useCallback((draft: HospitalState, actor: string, action: string, department: DepartmentId, patientId?: string) => {
    draft.activities = [{ id: id('ac'), at: new Date().toISOString(), actor, action, department, patientId }, ...draft.activities].slice(0, 60)
  }, [])

  const addTriage = useCallback((input: TriageInput) => {
    const patientId = id('p')
    const now = new Date().toISOString()
    const actor = currentRole ? roleProfiles[currentRole].name : 'Triage team'
    const mrn = `NS-${String(Math.floor(100000 + Math.random() * 899999))}`
    const patient: Patient = {
      id: patientId,
      mrn,
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
        { id: id('ev'), at: now, type: 'arrival', title: 'Patient registered', detail: 'New emergency attendance created at triage.', author: actor, department: 'emergency' },
        { id: id('ev'), at: now, type: 'triage', title: `Triaged ESI ${input.esi}`, detail: input.overrideReason ? `Clinical override: ${input.overrideReason}` : `${input.resources} resource${input.resources === 1 ? '' : 's'} anticipated. ${input.riskFactors.length ? `Risk flags: ${input.riskFactors.join(', ')}.` : 'No high-risk flags recorded.'}`, author: actor, department: 'emergency' },
      ],
    }
    setState((previous) => {
      const next = { ...previous, patients: [patient, ...previous.patients], activities: [...previous.activities] }
      addActivity(next, actor, `completed ESI ${input.esi} triage for ${patient.name}`, 'emergency', patientId)
      return next
    })
    notify(`${patient.name} added to the ESI ${input.esi} queue`)
    return patientId
  }, [addActivity, currentRole, notify])

  const retriage = useCallback((patientId: string, vitals: Vitals, esi: Patient['esi'], reason: string) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Clinical team'
    setState((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return previous
      const next = {
        ...previous,
        patients: previous.patients.map((item) => item.id === patientId ? {
          ...item,
          vitals,
          esi,
          esiOverride: reason || undefined,
          timeline: [{ id: id('ev'), at: new Date().toISOString(), type: 'triage' as const, title: `Reassessed as ESI ${esi}`, detail: reason || 'Repeat observations recorded; acuity recalculated from current findings.', author: actor, department: item.department }, ...item.timeline],
        } : item),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `reassessed ${patient.name} as ESI ${esi}`, patient.department, patientId)
      return next
    })
    notify('Observations and acuity updated')
  }, [addActivity, currentRole, notify])

  const addReferral = useCallback((patientId: string, to: DepartmentId, reason: string, priority: Priority) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Clinical team'
    setState((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return previous
      const now = new Date().toISOString()
      const referralId = `RF-${String(2400 + previous.referrals.length + 1)}`
      const next = {
        ...previous,
        referrals: [{ id: referralId, patientId, from: patient.department, to, reason, priority, status: 'pending' as const, createdAt: now, updatedAt: now, createdBy: actor }, ...previous.referrals],
        patients: previous.patients.map((item) => item.id === patientId ? { ...item, timeline: [{ id: id('ev'), at: now, type: 'referral' as const, title: `${to.charAt(0).toUpperCase() + to.slice(1)} referral sent`, detail: reason, author: actor, department: to }, ...item.timeline] } : item),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `sent a ${priority} referral for ${patient.name}`, to, patientId)
      return next
    })
    notify(`Referral sent to ${to === 'icu' ? 'ICU' : to.charAt(0).toUpperCase() + to.slice(1)}`)
  }, [addActivity, currentRole, notify])

  const addOrder = useCallback((patientId: string, title: string, kind: ClinicalOrder['kind'], department: DepartmentId, priority: Priority) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Clinical team'
    setState((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return previous
      const now = new Date().toISOString()
      const orderId = `OR-${String(8100 + previous.orders.length + 1)}`
      const next = {
        ...previous,
        orders: [{ id: orderId, patientId, title: title.trim(), kind, department, priority, status: 'ordered' as const, createdAt: now, createdBy: actor }, ...previous.orders],
        patients: previous.patients.map((item) => item.id === patientId ? { ...item, timeline: [{ id: id('ev'), at: now, type: 'order' as const, title: `${title} ordered`, detail: `${kind} order sent to ${department}. Priority: ${priority}.`, author: actor, department }, ...item.timeline] } : item),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `ordered ${title} for ${patient.name}`, department, patientId)
      return next
    })
    notify(`${kind} order sent to ${department === 'icu' ? 'ICU' : department}`)
  }, [addActivity, currentRole, notify])

  const updateReferral = useCallback((referralId: string, status: ReferralStatus, recommendation?: string) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Specialist team'
    setState((previous) => {
      const referral = previous.referrals.find((item) => item.id === referralId)
      if (!referral) return previous
      const patient = previous.patients.find((item) => item.id === referral.patientId)
      if (!patient) return previous
      const now = new Date().toISOString()
      const title = status === 'accepted' ? 'Referral accepted' : status === 'completed' ? 'Consultation completed' : status === 'declined' ? 'Referral declined' : 'Referral reopened'
      const detail = recommendation || (status === 'accepted' ? `${actor} accepted the referral and will review the clinical record.` : status === 'declined' ? 'Referral returned to the sending team for review.' : 'Specialist review completed.')
      const next = {
        ...previous,
        referrals: previous.referrals.map((item) => item.id === referralId ? { ...item, status, updatedAt: now, owner: status === 'accepted' ? actor : item.owner, recommendation: recommendation ?? item.recommendation } : item),
        patients: previous.patients.map((item) => item.id === referral.patientId ? { ...item, timeline: [{ id: id('ev'), at: now, type: 'referral' as const, title, detail, author: actor, department: referral.to }, ...item.timeline] } : item),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `${status} the referral for ${patient.name}`, referral.to, patient.id)
      return next
    })
    notify(`Referral marked ${status}`)
  }, [addActivity, currentRole, notify])

  const updateOrder = useCallback((orderId: string, status: OrderStatus, result?: string) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Diagnostics team'
    setState((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      if (!order) return previous
      const patient = previous.patients.find((item) => item.id === order.patientId)
      if (!patient) return previous
      const now = new Date().toISOString()
      const next = {
        ...previous,
        orders: previous.orders.map((item) => item.id === orderId ? { ...item, status, result: result ?? item.result } : item),
        patients: previous.patients.map((item) => item.id === order.patientId ? { ...item, timeline: [{ id: id('ev'), at: now, type: status === 'completed' ? 'result' as const : 'order' as const, title: status === 'completed' ? `${order.title} resulted` : `${order.title} started`, detail: result || `Study is now in progress with ${actor}.`, author: actor, department: order.department }, ...item.timeline] } : item),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `${status === 'completed' ? 'reported' : 'started'} ${order.title} for ${patient.name}`, order.department, patient.id)
      return next
    })
    notify(status === 'completed' ? 'Result released to the clinical record' : 'Order moved to in progress')
  }, [addActivity, currentRole, notify])

  const transferPatient = useCallback((patientId: string, to: DepartmentId, location: string) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Flow team'
    setState((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return previous
      const destination = previous.departments.find((item) => item.id === to)
      if (!destination || destination.occupied >= destination.capacity) return previous
      const now = new Date().toISOString()
      const next = {
        ...previous,
        patients: previous.patients.map((item) => item.id === patientId ? {
          ...item,
          department: to,
          location,
          status: ['ward', 'icu', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'obgyn', 'internal-medicine'].includes(to) ? 'admitted' as const : 'in-treatment' as const,
          encounterType: ['ward', 'icu', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'obgyn', 'internal-medicine'].includes(to) ? 'inpatient' as const : 'outpatient' as const,
          timeline: [{ id: id('ev'), at: now, type: 'transfer' as const, title: `Transferred to ${destination.shortName}`, detail: `${item.location} → ${location}. Handoff coordinated by ${actor}.`, author: actor, department: to }, ...item.timeline],
        } : item),
        departments: previous.departments.map((department) => {
          if (department.id === patient.department && department.id !== to) return { ...department, occupied: Math.max(0, department.occupied - 1) }
          if (department.id === to && department.id !== patient.department) return { ...department, occupied: department.occupied + 1 }
          return department
        }),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `transferred ${patient.name} to ${destination.shortName} · ${location}`, to, patientId)
      return next
    })
    notify(`Transfer to ${to === 'icu' ? 'ICU' : to} confirmed`)
  }, [addActivity, currentRole, notify])

  const addNote = useCallback((patientId: string, note: string) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Clinical team'
    setState((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return previous
      const now = new Date().toISOString()
      const next = {
        ...previous,
        patients: previous.patients.map((item) => item.id === patientId ? { ...item, timeline: [{ id: id('ev'), at: now, type: 'note' as const, title: 'Clinical note added', detail: note.trim(), author: actor, department: item.department }, ...item.timeline] } : item),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `added a clinical note for ${patient.name}`, patient.department, patientId)
      return next
    })
    notify('Note saved to the shared episode')
  }, [addActivity, currentRole, notify])

  const dischargePatient = useCallback((patientId: string) => {
    const actor = currentRole ? roleProfiles[currentRole].name : 'Clinical team'
    setState((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient || patient.status === 'discharged') return previous
      const now = new Date().toISOString()
      const next = {
        ...previous,
        patients: previous.patients.map((item) => item.id === patientId ? { ...item, status: 'discharged' as const, encounterType: item.encounterType ?? (['admitted', 'observation'].includes(item.status) ? 'inpatient' : 'outpatient'), location: 'Discharged home', timeline: [{ id: id('ev'), at: now, type: 'discharge' as const, title: 'Episode completed', detail: 'Patient discharged. Clinical episode remains available in the record archive.', author: actor, department: item.department }, ...item.timeline] } : item),
        departments: previous.departments.map((department) => department.id === patient.department && ['admitted', 'observation'].includes(patient.status) ? { ...department, occupied: Math.max(0, department.occupied - 1) } : department),
        activities: [...previous.activities],
      }
      addActivity(next, actor, `completed the episode for ${patient.name}`, patient.department, patientId)
      return next
    })
    notify('Patient discharged and episode archived')
    setSelectedPatientId(null)
  }, [addActivity, currentRole, notify])

  const resetDemo = useCallback(() => {
    setState(createInitialState())
    setSelectedPatientId(null)
    notify('Live demo data restored', 'info')
  }, [notify])

  const profile = useMemo(() => {
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
    state,
    currentRole,
    profile,
    selectedPatientId,
    toasts,
    login,
    logout,
    can,
    setSelectedPatientId,
    addTriage,
    retriage,
    addReferral,
    updateReferral,
    addOrder,
    updateOrder,
    transferPatient,
    addNote,
    dischargePatient,
    resetDemo,
    notify,
    dismissToast,
  }), [state, currentRole, profile, selectedPatientId, toasts, login, logout, can, addTriage, retriage, addReferral, updateReferral, addOrder, updateOrder, transferPatient, addNote, dischargePatient, resetDemo, notify, dismissToast])

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
}

export function useHospital() {
  const context = useContext(HospitalContext)
  if (!context) throw new Error('useHospital must be used within HospitalProvider')
  return context
}