import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { positionById, positionPrivileges } from '../lib/positions'
import { BREAK_GLASS_HOURS, canSeePatient, SCOPED_ROLES } from '../lib/access'
import { DEFAULT_FEES, nextQueueNo, orderBilling, payerCover, VISIT_LABEL, visitCharges } from '../lib/reception'
import { DEFAULT_GRADE, gradeById, gradeLabel, rankOf } from '../lib/grades'
import { canAssess, levelOf, professionOf, ROLE_LEVELS } from '../lib/teaching'
import { createInitialState, defaultSettings, departmentSeed, invoiceTotals, phoneFor, roleProfiles, setVatRate } from '../data'
import { setCurrency, setExportAudit } from '../lib/format'
import { onExternalChange, readSecure, writeSecure } from '../lib/secureStore'
import { chainEvent, clearFailures, clearSessionStart, DEFAULT_SECURITY, markSessionStart, sessionStartedAt } from '../lib/security'
import { PRINTOUT } from '../lib/diagnostics'
import { makeJoinCode } from '../lib/telecall'
import { appLink, loadIntegrations, sendTemplateSms, type SmsTemplate } from '../lib/integrations'
import { dueReminders, IN_HOUSE, MESSAGE_SERVICE, paymentReference, pharmacyName, priceOf, reminderText, serviceFor, visitInvoice } from '../lib/telehealth'
import { DEFAULT_PRICES, estimateBill, isOn, moduleForRole, MODULES } from '../lib/modules'
import { setReceptionGate } from '../lib/clinical'
import { canAdvanceOrder, orderStage, patientNews2, stagesFor, statusForStage } from '../lib/clinical'
import type {
  AppointmentStatus,
  MessageThread,
  SmsRecord,
  TeleIntake,
  TeleService,
  VisitPayer,
  VisitSummary,
  Assessment,
  UnlockSecret,
  SecurityEvent,
  SecuritySettings,
  Grade,
  Connection,
  HospitalService,
  PaymentMethod,
  PlatformInvoice,
  SubscriptionStatus,
  ConnectionStatus,
  ExternalReferral,
  ExternalReferralStatus,
  NetworkFacility,
  NetworkService,
  Tenant,
  ModuleId,
  PriceList,
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
  ObservationContext,
  ObservationSet,
  RoundNote,
  AccessGrant,
  Visit,
  VisitType,
  Payer,
  BillingState,
  PositionId,
  PositionAssignment,
  RxCollection,
  NoteReview,
  OrderImage,
  ChartKey,
  ChartEntryInput,
  DischargeSummary,
  Evaluation,
  Invoice,
  StaffMember,
  Department,
  ExternalProvider,
  FacilitySettings,
  FormularyItem,
  InvestigationItem,
  StockMovement,
} from '../types'

export interface CheckInInput {
  patientId?: string
  name?: string
  age?: number
  sex?: Patient['sex']
  phone?: string
  complaint: string
  type: VisitType
  department: DepartmentId
  tests?: string[]
  payer: Payer
  payerRef?: string
  payment: 'Paid' | 'Unpaid' | 'Waived' | 'Deferred'
  method?: 'Cash' | 'Card' | 'Mobile money'
  waiverReason?: string
}

export type OpdOutcome = { kind: 'Home' | 'Follow-up' | 'Admit'; note: string; date?: string } | { kind: 'Refer'; department: DepartmentId; note: string }

export const DATA_KEY = 'northstar-careos-data-v5'

const CHART_TITLES: Record<ChartKey, string> = { sam: 'SAM chart', labour: 'Partograph', anc: 'Antenatal chart', postpartum: 'Postpartum bleeding chart', fluids: 'Fluid balance', glucose: 'Glucose chart', neuro: 'Neuro observations', nihss: 'NIH Stroke Scale', seizures: 'Seizure chart' }
const SESSION_KEY = 'northstar-careos-session'
const GRADE_KEY = 'northstar-careos-grade'
const LEVEL_KEY = 'northstar-careos-level'
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
  login: (role: RoleId, remember: boolean, department?: DepartmentId, grade?: Grade, residentYear?: number, level?: string) => void
  /** Non-doctors: the level chosen at sign-in (e.g. Senior nurse). */
  level: string | null
  /** The signed-in doctor's grade (and resident year). */
  grade: { grade: Grade; year?: number } | null
  myRank: number
  logout: () => void
  logSecurity: (type: SecurityEvent['type'], detail: string, actor?: string, role?: string) => void
  saveSecurity: (settings: SecuritySettings) => void
  can: (permission: Permission) => boolean
  setSelectedPatientId: (id: string | null) => void
  /** True when the signed-in clinician's view is limited to their department's patients. */
  scoped: boolean
  /** Patients outside the clinician's view, for the emergency-access search (name, MRN, department only). */
  outsidePatients: Array<{ id: string; name: string; mrn: string; age: number; department: DepartmentId; location: string }>
  breakGlass: (patientId: string, reason: string) => void
  linkDepartment: (patientId: string, department: DepartmentId, reason: 'Comorbidity' | 'Shared care', note: string) => void
  unlinkDepartment: (patientId: string, department: DepartmentId) => void
  addTriage: (input: TriageInput) => string
  retriage: (patientId: string, vitals: Vitals, esi: Patient['esi'], reason: string) => void
  addReferral: (patientId: string, to: DepartmentId, reason: string, priority: Priority) => void
  updateReferral: (id: string, status: ReferralStatus, recommendation?: string) => void
  /** Returns the new order's id. `externalProviderId` is a partner id or PRINTOUT for a printed request. */
  addOrder: (patientId: string, title: string, kind: ClinicalOrder['kind'], department: DepartmentId, priority: Priority, externalProviderId?: string) => string | undefined
  updateOrder: (id: string, status: OrderStatus, result?: string) => void
  transferPatient: (patientId: string, to: DepartmentId, location: string) => void
  addNote: (patientId: string, note: string, title?: string) => void
  dischargePatient: (patientId: string) => void
  createPrescription: (input: Omit<Prescription, 'id' | 'createdAt' | 'status' | 'prescriber'>) => void
  setPrescriptionStatus: (id: string, status: RxStatus) => void
  collectPrescription: (id: string, collection: Omit<RxCollection, 'id' | 'at' | 'by'>) => boolean
  sendErx: (id: string, phone: string) => void
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void
  scheduleAppointment: (input: Omit<Appointment, 'id' | 'status'>) => void
  startTeleconsult: (id: string) => void
  recordTeleConsent: (id: string) => void
  finishTeleconsult: (id: string, summary: string, avs?: Pick<VisitSummary, 'diagnosis' | 'plan' | 'advice' | 'followUp'>) => void
  /* Patient portal: the patient is verified on the portal (MRN + phone digits); actions are logged as the patient portal. */
  portalRegister: (input: { name: string; age: number; sex: Patient['sex']; phone: string; email?: string }) => { id: string; mrn: string }
  requestVideoVisit: (input: VideoVisitRequest) => { id: string; joinCode: string; reference: string; amount: number } | null
  cancelVideoVisit: (id: string, by: 'Patient' | 'Staff') => void
  updateIntake: (id: string, intake: TeleIntake) => void
  rateVisit: (id: string, stars: number, comment: string) => void
  setVisitPharmacy: (id: string, pharmacy: string) => void
  claimOnDemand: (id: string) => void
  sendVisitReminder: (id: string, auto?: boolean) => void
  openThread: (input: { patientId: string; department: DepartmentId; subject: string; text: string; photos: string[]; payer: VisitPayer; insurer?: string; confidential?: boolean; gateway?: Gateway }) => string | null
  sendTestSms: (phone: string) => Promise<boolean>
  patientMessage: (threadId: string, text: string, photos: string[]) => void
  replyThread: (threadId: string, text: string, close: boolean) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  setStaffDuty: (id: string, onDuty: boolean) => void
  activateCode: (id: string, location: string) => void
  standDownCode: (id: string) => void
  recordObservations: (patientId: string, vitals: Vitals, onOxygen: boolean, consciousness: Consciousness, context?: ObservationContext) => void
  saveRound: (patientId: string, round: Omit<RoundNote, 'id' | 'at' | 'by'>) => void
  reviewRound: (patientId: string, roundId: string, outcome: NoteReview['outcome'], comment: string) => void
  addChartEntry: <K extends ChartKey>(patientId: string, chart: K, entry: ChartEntryInput<K>, summary: string) => void
  escalatePatient: (patientId: string) => void
  advanceOrder: (orderId: string, result?: string, toStage?: number) => void
  attachImages: (orderId: string, images: OrderImage[]) => void
  removeImage: (orderId: string, imageId: string) => void
  setBedState: (bedId: string, state: BedState) => void
  addHandover: (patientId: string, to: string, note: string) => void
  acknowledgeHandover: (id: string) => void
  registerPatient: (input: { name: string; age: number; sex: Patient['sex']; phone: string; insurance: string; complaint: string }) => void
  receptionCheckIn: (input: CheckInInput) => string
  settleAtReception: (patientId: string, method: 'Cash' | 'Card' | 'Mobile money') => void
  opdCall: (patientId: string, room: string) => void
  opdFinish: (patientId: string, outcome: OpdOutcome) => void
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
  rejectSpecimen: (orderId: string, reason: string) => void
  saveAssessment: (patientId: string, values: Record<string, string>, summary: string) => void
  recordGrowth: (patientId: string, entry: { ageYears: number; weightKg: number; heightCm: number; muacCm?: number; headCm?: number }) => void
  recordPayment: (invoiceId: string, method: NonNullable<Invoice['payments']>[number]['method'], amount: number) => void
  generateInvoice: (patientId: string) => void
  restock: (medicationId: string, amount: number) => void
  createStaff: (input: Omit<StaffMember, 'id' | 'onDuty' | 'pager' | 'email' | 'phone' | 'license'>) => void
  setStaffSuspended: (id: string, suspended: boolean) => void
  setDepartmentServices: (id: DepartmentId, services: string[]) => void
  myStaffId: string | null
  /** Why the given role cannot sign in (pending approval or suspended), or null. */
  signInBlock: (role: RoleId) => string | null
  updateSettings: (changes: Partial<FacilitySettings>) => void
  setModules: (offModules: ModuleId[], what: string) => void
  savePricing: (pricing: PriceList) => void
  submitApplication: (offModules: ModuleId[]) => void
  meAsStaff: () => StaffMember | undefined
  addAssessment: (input: Omit<Assessment, 'id' | 'at' | 'assessor' | 'assessorLevel' | 'profession'>) => void
  acknowledgeAssessment: (id: string, comment: string) => void
  reviewApplication: (approve: boolean, note: string) => void
  payPlatformInvoice: (id: string, method: PaymentMethod, reference: string) => void
  confirmPlatformPayment: (id: string, received: boolean) => void
  saveService: (service: HospitalService) => void
  requestService: (service: Pick<HospitalService, 'name' | 'category' | 'department' | 'price' | 'unit' | 'description'>) => void
  decideService: (id: string, approve: boolean, setupFee: number, monthlyFee: number, note: string) => void
  updateTenant: (id: string, changes: Partial<Pick<Tenant, 'status' | 'offModules' | 'discount'>>, what: string) => void
  requestConnection: (facilityId: string, services: NetworkService[], note: string) => void
  setConnectionStatus: (id: string, status: ConnectionStatus | 'Removed') => void
  saveNetworkFacility: (facility: NetworkFacility) => void
  referOut: (patientId: string, facilityId: string, reason: string, urgency: Priority, shared: string[]) => void
  updateExternalReferral: (id: string, status: ExternalReferralStatus, response: string) => void
  saveDepartment: (department: Department) => void
  removeDepartment: (id: DepartmentId) => void
  saveInvestigation: (item: InvestigationItem) => void
  canEditCatalogue: (kind: InvestigationItem['kind']) => boolean
  removeInvestigation: (id: string) => void
  saveProvider: (provider: ExternalProvider) => void
  removeProvider: (id: string) => void
  requestAccess: (input: { name: string; roleId: RoleId; department: DepartmentId; specialty: string; email: string; grade?: Grade; residentYear?: number; level?: string; unlock?: UnlockSecret }) => void
  /** Set your own quick-unlock secret, or (administrator) clear someone's with null. */
  setUnlock: (staffId: string, secret: UnlockSecret | null) => void
  approveStaff: (id: string) => void
  assignPosition: (staffId: string, position: PositionId, until?: string, note?: string) => void
  removePosition: (staffId: string, position: PositionId) => void
  setStaffPermissions: (id: string, permissions: Permission[]) => void
  saveFormularyItem: (item: FormularyItem) => void
  receiveStock: (medicationId: string, input: { quantity: number; batch: string; expiry: string; supplier: string }) => void
  writeOffStock: (medicationId: string, quantity: number, reason: string) => void
  resetDemo: () => void
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

export interface VideoVisitRequest {
  patientId: string
  service: TeleService
  onDemand: boolean
  department: DepartmentId
  clinician?: string
  startsAt?: string
  reason: string
  intake: TeleIntake
  payer: VisitPayer
  insurer?: string
  reminders?: { channels: Array<'SMS' | 'Email'>; phone?: string; email?: string }
  pharmacy: string
  /** Set when the patient paid online: the payment was verified with the provider first. */
  gateway?: Gateway
}

export interface Gateway { reference: string; provider: string; amount: number; method?: string; currency?: string }

const HospitalContext = createContext<HospitalContextValue | null>(null)

/** Administrators manage the facility, not patients, so record access is a no-op for them. */
const noPatientAccess = () => {}

/** Keeps saved records and adds any seed records (by id) that the saved copy predates. */
function mergeById<T extends { id: string }>(saved: unknown, seed: T[]): T[] {
  if (!Array.isArray(saved)) return seed
  const ids = new Set(saved.map((item: T) => item.id))
  return [...(saved as T[]), ...seed.filter((item) => !ids.has(item.id))]
}

function loadState(): HospitalState {
  // Decrypted at start-up (see lib/secureStore).
  return fromSaved(readSecure(DATA_KEY))
}

function fromSaved(saved: string | null): HospitalState {
  const seed = createInitialState()
  try {
    if (!saved) return seed
    const parsed = JSON.parse(saved) as Partial<HospitalState>
    return {
      // Demo phone numbers saved before they had the full 9 digits after +251 get the corrected number.
      patients: mergeById(parsed.patients, seed.patients).map((item) => item.phone && /^\+251 91\d \d\d \d{3}$/.test(item.phone) ? { ...item, phone: phoneFor(item.mrn) } : item),
      departments: mergeById(parsed.departments, seed.departments),
      referrals: mergeById(parsed.referrals, seed.referrals),
      orders: mergeById(parsed.orders, seed.orders),
      activities: Array.isArray(parsed.activities) ? parsed.activities : seed.activities,
      formulary: mergeById(parsed.formulary, seed.formulary),
      prescriptions: mergeById(parsed.prescriptions, seed.prescriptions),
      invoices: mergeById(parsed.invoices, seed.invoices),
      appointments: mergeById(parsed.appointments, seed.appointments),
      // Custom permission lists saved before history/examination writing became its own privilege keep that ability.
      staff: mergeById(parsed.staff, seed.staff).map((member) => member.permissions && member.roleId && ROLE_PERMISSIONS[member.roleId]?.includes('clinical-notes') && member.permissions.includes('notes') && !member.permissions.includes('clinical-notes') ? { ...member, permissions: [...member.permissions, 'clinical-notes' as Permission] } : member),
      codes: mergeById(parsed.codes, seed.codes),
      wards: mergeById(parsed.wards, seed.wards),
      beds: mergeById(parsed.beds, seed.beds),
      handovers: mergeById(parsed.handovers, seed.handovers),
      pages: mergeById(parsed.pages, seed.pages),
      theatreCases: mergeById(parsed.theatreCases, seed.theatreCases),
      cosignNotes: mergeById(parsed.cosignNotes, seed.cosignNotes),
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
      // The catalogue was rebuilt with sections; earlier seed items (L01, I01…) give way to it. Items the hospital added are kept.
      investigations: mergeById(Array.isArray(parsed.investigations) ? parsed.investigations.filter((item) => !/^[LI]\d\d$/.test(item.id)) : undefined, seed.investigations),
      // The sample partner list was removed; partners the administrator added are kept.
      providers: mergeById(Array.isArray(parsed.providers) ? parsed.providers.filter((item) => !['arsho', 'icl', 'wudassie', 'icmc'].includes(item.id)) : undefined, seed.providers),
      stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : seed.stockMovements,
      accessGrants: Array.isArray(parsed.accessGrants) ? parsed.accessGrants : [],
      tenants: mergeById(parsed.tenants, seed.tenants),
      network: mergeById(parsed.network, seed.network),
      connections: mergeById(parsed.connections, seed.connections),
      externalReferrals: Array.isArray(parsed.externalReferrals) ? parsed.externalReferrals : [],
      services: mergeById(parsed.services, seed.services),
      platformInvoices: mergeById(parsed.platformInvoices, seed.platformInvoices),
      assessments: mergeById(parsed.assessments, seed.assessments),
      securityEvents: Array.isArray(parsed.securityEvents) ? parsed.securityEvents : [],
      messageThreads: mergeById(parsed.messageThreads, seed.messageThreads),
      smsLog: Array.isArray(parsed.smsLog) ? parsed.smsLog : [],
      pricing: { ...DEFAULT_PRICES, ...(parsed.pricing ?? {}), modules: { ...DEFAULT_PRICES.modules, ...(parsed.pricing?.modules ?? {}) } },
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
      storage.removeItem(GRADE_KEY)
      storage.removeItem(LEVEL_KEY)
      storage.removeItem(DEPARTMENT_KEY)
    }
  } catch { /* storage unavailable */ }
}

function loadSessionRole(): RoleId | null {
  const value = readSession(SESSION_KEY)
  return value && value in roleProfiles ? value as RoleId : null
}

function loadSessionGrade(): { grade: Grade; year?: number } | null {
  const value = readSession(GRADE_KEY)
  if (!value) return null
  const [grade, year] = value.split('|')
  return gradeById(grade as Grade) ? { grade: grade as Grade, ...(year ? { year: Number(year) } : {}) } : null
}

function loadSessionDepartment(): DepartmentId | null {
  const value = readSession(DEPARTMENT_KEY)
  return value ? value as DepartmentId : null
}

const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const nextNumber = (ids: string[], prefix: string, start: number) =>
  `${prefix}-${Math.max(start, ...ids.map((id) => Number(id.replace(`${prefix}-`, '')) || 0)) + 1}`
/** Current department list (kept in sync by the provider) so helpers see departments added by the administrator. */
let liveDepartments = departmentSeed
const unitName = (id: DepartmentId) => liveDepartments.find((department) => department.id === id)?.shortName ?? id

export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  physician: ['triage', 'refer', 'transfer', 'notes', 'clinical-notes', 'discharge', 'cosign', 'prescribe', 'vitals', 'register'],
  nurse: ['triage', 'notes', 'clinical-notes', 'vitals', 'administer', 'beds'],
  consultant: ['refer', 'notes', 'clinical-notes', 'discharge', 'cosign', 'prescribe'],
  // Diagnostic and pharmacy staff read the whole record but only write notes and their own work.
  diagnostics: ['results', 'notes'],
  radiographer: ['notes'],
  laboratory: ['results', 'notes'],
  coordinator: ['transfer', 'notes', 'beds', 'records-export'],
  administrator: ['manage'],
  provider: ['pricing'],
  intern: ['notes', 'clinical-notes', 'vitals', 'prescribe', 'refer'],
  pharmacist: ['dispense', 'notes'],
  receptionist: ['register'],
  theatre: ['theatre', 'anaesthesia', 'notes', 'clinical-notes', 'vitals'],
  allied: ['services', 'notes', 'clinical-notes'],
  billing: ['billing'],
}

/** Where each role lands after sign-in. */
export const ROLE_HOME: Record<RoleId, string> = {
  physician: '/dashboard', nurse: '/dashboard', consultant: '/dashboard', diagnostics: '/imaging', radiographer: '/imaging', laboratory: '/lab', coordinator: '/dashboard', administrator: '/dashboard', provider: '/platform',
  intern: '/patients', pharmacist: '/pharmacy', receptionist: '/front-desk', theatre: '/theatres', allied: '/services', billing: '/billing',
}

export function HospitalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HospitalState>(loadState)
  const [currentRole, setCurrentRole] = useState<RoleId | null>(loadSessionRole)
  const [currentDepartment, setCurrentDepartment] = useState<DepartmentId | null>(loadSessionDepartment)
  const [currentGrade, setCurrentGrade] = useState<{ grade: Grade; year?: number } | null>(loadSessionGrade)
  const [currentLevel, setCurrentLevel] = useState<string | null>(() => readSession(LEVEL_KEY))
  const myGrade = currentGrade && gradeById(currentGrade.grade)?.role === currentRole ? currentGrade : null
  const myLevel = currentRole && currentLevel && ROLE_LEVELS[currentRole]?.levels.includes(currentLevel) ? currentLevel : null
  const myRank = myGrade ? rankOf(myGrade.grade) : currentRole === 'intern' ? 1 : currentRole === 'consultant' ? 6 : currentRole === 'physician' ? 5 : 0
  const supervised = myGrade ? gradeById(myGrade.grade)!.supervised : currentRole === 'intern'
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastTimers = useRef(new Map<number, number>())
  const storageWarned = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  setCurrency(state.settings.currency)
  liveDepartments = state.departments
  setReceptionGate(isOn(state.settings, 'reception'))
  setVatRate(state.settings.vatRate ?? 15)

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

  // Another tab on this device changed the record (e.g. a patient joined the video queue): take its copy.
  const external = useRef<string | null>(null)
  useEffect(() => onExternalChange(DATA_KEY, (value) => { external.current = value; setState(fromSaved(value)) }), [])

  useEffect(() => {
    const json = JSON.stringify(state)
    if (external.current !== null && json === external.current) { external.current = null; return }
    external.current = null
    // Saved encrypted (AES-GCM, device key) where the browser supports it.
    writeSecure(DATA_KEY, json, () => {
      if (!storageWarned.current) {
        storageWarned.current = true
        notify('Browser storage is full — recent changes may not persist after reload.', 'warning')
      }
    })
  }, [state, notify])

  const login = useCallback((role: RoleId, remember: boolean, department?: DepartmentId, grade?: Grade, residentYear?: number, level?: string) => {
    clearSession()
    const selectedDepartment = department ?? roleProfiles[role].department
    const chosen = grade && gradeById(grade)?.role === role ? grade : DEFAULT_GRADE[role]
    const year = chosen === 'Resident' ? residentYear ?? 1 : undefined
    try {
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(SESSION_KEY, role)
      storage.setItem(DEPARTMENT_KEY, selectedDepartment)
      if (chosen) storage.setItem(GRADE_KEY, `${chosen}${year ? `|${year}` : ''}`)
      if (level && ROLE_LEVELS[role]?.levels.includes(level)) storage.setItem(LEVEL_KEY, level)
    } catch { /* session lasts for this tab only */ }
    setCurrentRole(role)
    setCurrentDepartment(selectedDepartment)
    setCurrentGrade(chosen ? { grade: chosen, ...(year ? { year } : {}) } : null)
    setCurrentLevel(level && ROLE_LEVELS[role]?.levels.includes(level) ? level : null)
    markSessionStart()
    clearFailures(role)
    setState((previous) => ({ ...previous, securityEvents: [chainEvent(previous.securityEvents, { type: 'sign-in', detail: `Signed in${chosen ? ` as ${gradeLabel(chosen, year)}` : level ? ` as ${level}` : ''}${department ? ` · ${department}` : ''}`, actor: roleProfiles[role].name, role }), ...previous.securityEvents].slice(0, 2000) }))
    setSelectedPatientId(null)
  }, [])

  /** Appends to the tamper-evident security log (never through commit, so it can't be undone or merged away). */
  const logSecurity = useCallback((type: SecurityEvent['type'], detail: string, actor?: string, role?: string) => {
    setState((previous) => ({ ...previous, securityEvents: [chainEvent(previous.securityEvents, { type, detail, actor: actor ?? (currentRole ? roleProfiles[currentRole].name : 'Unknown'), ...(role ?? currentRole ? { role: role ?? currentRole ?? undefined } : {}) }), ...previous.securityEvents].slice(0, 2000) }))
  }, [currentRole])

  const logout = useCallback(() => {
    if (currentRole) logSecurity('sign-out', 'Signed out', roleProfiles[currentRole].name, currentRole)
    clearSessionStart()
    clearSession()
    setCurrentRole(null)
    setCurrentDepartment(null)
    setCurrentGrade(null)
    setCurrentLevel(null)
    setSelectedPatientId(null)
  }, [currentRole, logSecurity])

  const can = useCallback((permission: Permission) => {
    if (!currentRole) return false
    const me = state.staff.find((member) => member.roleId === currentRole)
    return (me?.permissions ?? ROLE_PERMISSIONS[currentRole]).includes(permission) || positionPrivileges(me).includes(permission)
  }, [currentRole, state.staff])

  const actorName = useCallback((fallback: string) => (currentRole ? roleProfiles[currentRole].name : fallback), [currentRole])

  /** Writes are checked here as well as in the UI: anyone may read the record, but only roles with the privilege may write to it. */
  const denied = useCallback((needs: Permission[], what: string) => {
    if (!currentRole || needs.some((permission) => can(permission))) return false
    notify(`Your role can read but not ${what}`, 'warning')
    return true
  }, [currentRole, can, notify])

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
      observations: [{ ...input.vitals, at: now, by: actor, onOxygen: false, consciousness: input.vitals.gcs < 15 ? 'New confusion' : 'Alert', context: 'Triage' }],
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

  const addOrder = useCallback((patientId: string, title: string, kind: ClinicalOrder['kind'], department: DepartmentId, priority: Priority, externalProviderId?: string) => {
    const actor = actorName('Clinical team')
    if (!stateRef.current.patients.some((item) => item.id === patientId)) return undefined
    const id = nextNumber(stateRef.current.orders.map((item) => item.id), 'OR', 8100)
    const sentOutTo = (providers: ExternalProvider[]) => externalProviderId?.startsWith('net:') ? `${stateRef.current.network.find((item) => `net:${item.id}` === externalProviderId)?.name ?? 'a connected facility'} (electronic)` : externalProviderId === PRINTOUT ? 'an outside laboratory or centre (printed request)' : externalProviderId ? providers.find((item) => item.id === externalProviderId)?.name ?? 'a partner facility' : undefined
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient || previous.orders.some((item) => item.id === id)) return null
      const external = sentOutTo(previous.providers)
      return {
        next: {
          ...previous,
          orders: [{ id, patientId, title: title.trim(), kind, department, priority, status: 'ordered', createdAt: new Date().toISOString(), createdBy: actor, externalProviderId, ...((kind === 'Laboratory' || kind === 'Imaging') && !externalProviderId ? { billing: orderBilling(patient) } : {}) }, ...previous.orders],
          patients: withTimeline(previous.patients, patientId, { type: 'order', title: `${title.trim()} ordered`, detail: `${kind} order ${external ? `referred to ${external}` : `sent to ${unitName(department)}`}. Priority: ${priority}.`, author: actor, department, orderId: id }),
        },
        actor, action: `ordered ${title.trim()} for ${patient.name}`, department, patientId,
      }
    })
    notify(externalProviderId ? `${kind} sent to ${sentOutTo(stateRef.current.providers)}` : `${kind} order sent to ${unitName(department)}`)
    return id
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
          orders: previous.orders.map((item) => item.id === orderId ? { ...item, status, stage: done ? stagesFor(item).length - 1 : Math.max(1, orderStage(item)), result: result ?? item.result } : item),
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
    if (denied(['History', 'Examination', 'Plan'].includes(title ?? '') ? ['clinical-notes'] : ['notes', 'clinical-notes', 'vitals', 'prescribe'], 'write history, examination or plans')) return
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const needsCosign = currentRole === 'intern'
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'note', title: needsCosign ? `${title ?? 'Clinical note'} (awaiting co-signature)` : title ?? 'Clinical note added', detail: note.trim(), author: actor, department: patient.department }),
          cosignNotes: needsCosign ? [{ id: makeId('CN'), patientId, author: actor, at: new Date().toISOString(), text: title ? `${title}: ${note.trim()}` : note.trim(), status: 'Pending review', authorRank: myRank, ...(myGrade ? { authorGrade: gradeLabel(myGrade.grade, myGrade.year) } : {}) }, ...previous.cosignNotes] : previous.cosignNotes,
        },
        actor, action: `added ${title ? title.toLowerCase() : 'a clinical note'} for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify(currentRole === 'intern' ? 'Note saved and sent for co-signature' : 'Note saved to the shared episode')
  }, [actorName, commit, currentRole, notify, denied, myRank, myGrade])

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
      const at = new Date().toISOString()
      const lines = input.items.map((item) => `${previous.formulary.find((med) => med.id === item.medicationId)?.name ?? item.medicationId} ${item.dosage} ${item.frequency}`).join('; ')
      return {
        next: {
          ...previous,
          prescriptions: [{ ...input, id, prescriber: actor, createdAt: at, status: 'Pending' }, ...previous.prescriptions],
          patients: input.eRx ? withTimeline(previous.patients, patient.id, { type: 'order', title: `e-Prescription ${input.eRx.code}`, detail: `${lines}. Patient collects from the pharmacy; valid until ${input.eRx.validUntil.slice(0, 10)}.`, author: actor, department: input.department }) : previous.patients,
        },
        actor, action: `${input.eRx ? 'e-prescribed' : 'prescribed'} ${id} for ${patient.name}`, department: 'pharmacy', patientId: patient.id,
      }
    })
    notify(input.eRx ? `e-Prescription ${input.eRx.code} created` : 'Prescription sent to pharmacy')
  }, [actorName, commit, notify])

  const setPrescriptionStatus = useCallback((id: string, status: RxStatus) => {
    const actor = actorName('Pharmacy team')
    if (status === 'Dispensed' || status === 'Ready for collection') {
      const { prescriptions, formulary } = stateRef.current
      const rx = prescriptions.find((item) => item.id === id)
      const controlled = rx?.items.map((item) => formulary.find((med) => med.id === item.medicationId)).find((med) => med?.controlled)
      if (controlled && !can('controlled-drugs')) { notify(`${controlled.name} is a controlled medicine — only staff with controlled-drugs authority can release it`, 'warning'); return }
    }
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
      let stockMovements = previous.stockMovements
      if (status === 'Dispensed') {
        formulary = formulary.map((med) => {
          const used = rx.items.filter((item) => item.medicationId === med.id).reduce((sum, item) => sum + item.quantity, 0)
          return used ? { ...med, stock: med.stock - used } : med
        })
        stockMovements = [...rx.items.map((item): StockMovement => ({ id: makeId('SM'), medicationId: item.medicationId, at: new Date().toISOString(), by: actor, type: 'Dispensed', quantity: -item.quantity, note: `${id} · ${patient.mrn}` })), ...stockMovements].slice(0, 300)
      }
      const changes: Partial<Prescription> = { status, ...(status === 'Verified' ? { verifiedBy: actor } : status === 'Dispensed' ? { dispensedBy: actor } : status === 'Administered' ? { administrations: [...(rx.administrations ?? []), { at: new Date().toISOString(), by: actor }] } : {}) }
      return { next: { ...previous, formulary, stockMovements, prescriptions: previous.prescriptions.map((item) => item.id === id ? { ...item, ...changes } : item) }, actor, action: `${status.toLowerCase()} ${id} for ${patient.name}`, department: 'pharmacy', patientId: patient.id }
    })
    notify(`${id} ${status.toLowerCase()}`)
  }, [actorName, can, commit, notify])

  const collectPrescription = useCallback((id: string, collection: Omit<RxCollection, 'id' | 'at' | 'by'>) => {
    const actor = actorName('Pharmacy team')
    const { prescriptions, formulary } = stateRef.current
    const rx = prescriptions.find((item) => item.id === id)
    if (!rx) return false
    const controlled = collection.items.filter((item) => item.quantity > 0).map((item) => formulary.find((med) => med.id === item.medicationId)).find((med) => med?.controlled)
    if (controlled && !can('controlled-drugs')) { notify(`${controlled.name} is a controlled medicine — only staff with controlled-drugs authority can hand it over`, 'warning'); return false }
    const short = collection.items.find((item) => (formulary.find((med) => med.id === item.medicationId)?.stock ?? 0) < item.quantity)
    if (short) { notify(`Not enough ${formulary.find((med) => med.id === short.medicationId)?.name ?? 'stock'} to supply`, 'warning'); return false }
    if (!collection.items.some((item) => item.quantity > 0)) { notify('Nothing to hand over', 'warning'); return false }
    commit((previous) => {
      const current = previous.prescriptions.find((item) => item.id === id)
      const patient = current && previous.patients.find((item) => item.id === current.patientId)
      if (!current || !patient) return null
      const at = new Date().toISOString()
      const record: RxCollection = { ...collection, id: makeId('COL'), at, by: actor }
      const collections = [...(current.collections ?? []), record]
      const owed = current.items.some((item) => collections.flatMap((c) => c.items).filter((c) => c.medicationId === item.medicationId).reduce((sum, c) => sum + c.quantity, 0) < item.quantity)
      const status: RxStatus = owed ? 'Part collected' : 'Dispensed'
      const given = collection.items.filter((item) => item.quantity > 0)
      const names = given.map((item) => `${previous.formulary.find((med) => med.id === item.medicationId)?.name ?? item.medicationId} × ${item.quantity}`).join(', ')
      return {
        next: {
          ...previous,
          formulary: previous.formulary.map((med) => { const used = given.filter((item) => item.medicationId === med.id).reduce((sum, item) => sum + item.quantity, 0); return used ? { ...med, stock: med.stock - used } : med }),
          stockMovements: [...given.map((item): StockMovement => ({ id: makeId('SM'), medicationId: item.medicationId, at, by: actor, type: 'Dispensed', quantity: -item.quantity, note: `${id} · ${patient.mrn} · collected` })), ...previous.stockMovements].slice(0, 300),
          prescriptions: previous.prescriptions.map((item) => item.id === id ? { ...item, collections, status, dispensedBy: actor } : item),
          patients: withTimeline(previous.patients, patient.id, { type: 'note', title: `Medicines collected · ${current.eRx?.code ?? id}`, detail: `${names} handed to ${collection.collectedBy === 'Patient' ? 'the patient' : `${collection.collectorName || 'a relative or carer'}`}${owed ? '; balance still owed' : ''}.`, author: actor, department: 'pharmacy' }),
        },
        actor, action: `handed over ${id} to ${patient.name}${owed ? ' (part supply)' : ''}`, department: 'pharmacy', patientId: patient.id,
      }
    })
    notify('Medicines handed over')
    return true
  }, [actorName, can, commit, notify])

  const sendErx = useCallback((id: string, phone: string) => {
    const actor = actorName('Clinical team')
    commit((previous) => {
      const rx = previous.prescriptions.find((item) => item.id === id)
      if (!rx?.eRx) return null
      return { next: { ...previous, prescriptions: previous.prescriptions.map((item) => item.id === id ? { ...item, eRx: { ...rx.eRx!, phone, sentAt: new Date().toISOString() } } : item) }, actor, action: `queued e-prescription ${rx.eRx.code} for ${phone}`, department: 'pharmacy', patientId: rx.patientId }
    })
    notify('Code saved for the patient’s phone. Sending texts needs an SMS gateway to be connected.', 'info')
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

  /** Texts the patient through the hospital's SMS gateway; every attempt goes in the SMS log. Demo mode records it without sending. */
  const smsNotify = useCallback((patientId: string, template: SmsTemplate, params: Record<string, string>, ref?: string) => {
    const phone = stateRef.current.patients.find((item) => item.id === patientId)?.phone
    if (!phone) return
    const log = (entry: Omit<SmsRecord, 'id' | 'at' | 'template' | 'ref'>) => setState((previous) => ({ ...previous, smsLog: [{ id: makeId('sms'), at: new Date().toISOString(), template, ref, ...entry }, ...(previous.smsLog ?? [])].slice(0, 300) }))
    void loadIntegrations().then(async (live) => {
      const masked = `${phone.replace(/\s/g, '').slice(0, 5)}•••${phone.replace(/\D/g, '').slice(-3)}`
      if (!live?.sms) { log({ to: masked, status: 'Demo', provider: 'Not connected' }); return }
      const result = await sendTemplateSms(phone, template, params)
      log({ to: result.to ?? masked, status: result.ok ? 'Sent' : 'Failed', provider: result.provider, ...(result.error ? { error: result.error } : {}) })
    })
  }, [])

  /** Video consultation lifecycle: start (doctor joins), patient consent, finish (duration on the timeline). */
  const startTeleconsult = useCallback((id: string) => {
    const actor = actorName('Clinician')
    commit((previous) => {
      const apt = previous.appointments.find((item) => item.id === id)
      if (!apt) return null
      return { next: { ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, status: 'In progress' as const, startedAt: item.startedAt ?? new Date().toISOString(), joinCode: item.joinCode ?? makeJoinCode() } : item) }, actor, action: `opened the video consultation room for ${apt.id}`, department: apt.department, patientId: apt.patientId }
    })
  }, [actorName, commit])

  const recordTeleConsent = useCallback((id: string) => {
    setState((previous) => ({ ...previous, appointments: previous.appointments.map((item) => item.id === id && !item.consentAt ? { ...item, consentAt: new Date().toISOString() } : item) }))
  }, [])

  const finishTeleconsult = useCallback((id: string, summary: string, avs?: Pick<VisitSummary, 'diagnosis' | 'plan' | 'advice' | 'followUp'>) => {
    const actor = actorName('Clinician')
    commit((previous) => {
      const apt = previous.appointments.find((item) => item.id === id)
      if (!apt) return null
      const endedAt = new Date().toISOString()
      const since = apt.startedAt ?? apt.startsAt
      const minutes = apt.startedAt ? Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(apt.startedAt)) / 60_000)) : apt.durationMinutes
      // Prescriptions and orders made during the call go on the after-visit summary; e-prescriptions go to the patient's chosen pharmacy.
      const pharmacy = apt.pharmacy ?? IN_HOUSE
      const rxs = previous.prescriptions.filter((rx) => rx.patientId === apt.patientId && rx.createdAt >= since)
      const orders = previous.orders.filter((order) => order.patientId === apt.patientId && order.createdAt >= since)
      const medName = (medicationId: string) => previous.formulary.find((med) => med.id === medicationId)?.name ?? 'Medicine'
      const visitSummary: VisitSummary | undefined = avs ? {
        ...avs,
        prescriptions: rxs.map((rx) => `${rx.items.map((item) => `${medName(item.medicationId)} ${item.dosage} ${item.frequency} for ${item.duration}`).join('; ')}${rx.eRx ? ` — code ${rx.eRx.code}` : ''}`),
        orders: orders.map((order) => `${order.kind}: ${order.title}`),
        pharmacy: pharmacyName(pharmacy, previous),
        sharedAt: endedAt, by: actor,
      } : undefined
      const detail = apt.confidential
        ? `Confidential ${apt.service === 'Mental health' ? 'mental-health ' : ''}video consultation, ${minutes} min with ${actor}. Details are held by the treating clinician.`
        : `${minutes} min with ${actor} · ${apt.reason}.${apt.consentAt ? ' Patient consented to a video consultation.' : ' Consent not recorded on the join page.'}${summary ? ` ${summary}` : ''}${visitSummary ? ` Diagnosis: ${visitSummary.diagnosis}. Plan: ${visitSummary.plan}` : ''}`
      return {
        next: {
          ...previous,
          appointments: previous.appointments.map((item) => item.id === id ? { ...item, status: 'Completed' as const, endedAt, ...(visitSummary ? { summary: visitSummary } : {}) } : item),
          prescriptions: previous.prescriptions.map((rx) => rxs.includes(rx) && rx.eRx ? { ...rx, eRx: { ...rx.eRx, pharmacy } } : rx),
          patients: withTimeline(previous.patients, apt.patientId, { type: 'note', title: apt.confidential ? 'Confidential video consultation' : 'Video consultation', detail, author: actor, department: apt.department }),
        },
        actor, action: `completed a ${minutes}-minute video consultation (${apt.id})${visitSummary ? ' and shared the after-visit summary' : ''}`, department: apt.department, patientId: apt.patientId,
      }
    })
    const apt = stateRef.current.appointments.find((item) => item.id === id)
    if (apt && avs) smsNotify(apt.patientId, 'summary', { doctor: actorName('Your doctor'), link: appLink('/care') }, id)
    notify(avs ? 'Visit completed — summary shared with the patient' : 'Video consultation completed and added to the record')
  }, [actorName, commit, notify, smsNotify])

  const PORTAL = 'Patient portal'

  const sendTestSms = useCallback(async (phone: string) => {
    const live = await loadIntegrations(true)
    if (!live?.sms) { notify('SMS is not connected — add the gateway keys on the server', 'warning'); return false }
    const result = await sendTemplateSms(phone, 'test')
    setState((previous) => ({ ...previous, smsLog: [{ id: makeId('sms'), at: new Date().toISOString(), to: result.to ?? phone, template: 'test', status: result.ok ? 'Sent' as const : 'Failed' as const, provider: result.provider, ...(result.error ? { error: result.error } : {}) }, ...(previous.smsLog ?? [])].slice(0, 300) }))
    notify(result.ok ? `Test SMS sent through ${result.provider}` : `SMS failed: ${result.error ?? 'unknown error'}`, result.ok ? 'success' : 'warning')
    return result.ok
  }, [notify])

  const portalRegister = useCallback((input: { name: string; age: number; sex: Patient['sex']; phone: string; email?: string }) => {
    const id = makeId('p')
    const used = new Set(stateRef.current.patients.map((item) => item.mrn))
    let mrn = ''
    do { mrn = `NS-${String(Math.floor(100000 + Math.random() * 899999))}` } while (used.has(mrn))
    const now = new Date().toISOString()
    const patient: Patient = {
      id, mrn, name: input.name.trim(), age: input.age, sex: input.sex, pronouns: input.sex === 'Female' ? 'she/her' : input.sex === 'Male' ? 'he/him' : 'they/them',
      complaint: 'Registered for video consultations', history: 'Self-registered on the patient portal.', allergies: ['Not yet recorded'], arrival: now, esi: 5, riskFactors: [], resources: 0,
      vitals: { hr: 0, rr: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, gcs: 15, pain: 0 }, department: 'internal-medicine', encounterType: 'outpatient', location: 'Home · telemedicine', status: 'discharged', assignedTo: 'Unassigned',
      phone: input.phone.trim(), email: input.email?.trim() || undefined,
      timeline: [{ id: makeId('ev'), at: now, type: 'arrival', title: 'Registered on the patient portal', detail: 'New patient record created for video consultations. Identity to be confirmed at the first visit.', author: PORTAL, department: 'internal-medicine' }],
    }
    commit((previous) => ({ next: { ...previous, patients: [patient, ...previous.patients] }, actor: PORTAL, action: `registered ${patient.name} for video consultations`, department: 'internal-medicine', patientId: id }))
    return { id, mrn }
  }, [commit])

  const requestVideoVisit = useCallback((input: VideoVisitRequest) => {
    const current = stateRef.current
    const patient = current.patients.find((item) => item.id === input.patientId)
    if (!patient || input.reason.trim().length < 3) return null
    if (!input.onDemand && (!input.clinician || !input.startsAt)) return null
    const id = nextNumber(current.appointments.map((item) => item.id), 'APT', 500)
    const invoiceId = nextNumber(current.invoices.map((item) => item.id), 'INV', 24000)
    const joinCode = makeJoinCode()
    const reference = input.gateway?.reference ?? paymentReference()
    const serviceId = serviceFor(input.service, input.onDemand)
    const listed = priceOf(serviceId, current.services)
    const name = listed.name
    const price = input.gateway?.amount ?? listed.price
    const now = new Date().toISOString()
    const confidential = input.service === 'Mental health'
    const appointment: Appointment = {
      id, patientId: patient.id, clinician: input.onDemand ? '' : input.clinician!, department: input.department, startsAt: input.onDemand ? now : input.startsAt!, durationMinutes: input.service === 'Mental health' ? 45 : input.onDemand ? 15 : 30,
      mode: 'Video', status: 'Scheduled', reason: input.reason.trim(), joinCode, service: input.service, bookedBy: 'Patient', intake: input.intake, pharmacy: input.pharmacy, confidential,
      ...(input.onDemand ? { onDemand: true, queuedAt: now } : {}),
      payment: { payer: input.payer, amount: price, at: now, invoiceId, reference, ...(input.insurer ? { insurer: input.insurer } : {}), ...(input.gateway ? { provider: input.gateway.provider, method: input.gateway.method, currency: input.gateway.currency } : {}) },
      ...(input.reminders?.channels.length ? { reminders: { ...input.reminders, sent: [] } } : {}),
    }
    commit((previous) => ({
      next: {
        ...previous,
        appointments: [...previous.appointments, appointment],
        invoices: [visitInvoice(invoiceId, patient.id, serviceId, name, price, input.payer, input.insurer, now), ...previous.invoices],
        patients: withTimeline(previous.patients, patient.id, { type: 'note', title: input.onDemand ? 'Joined the on-demand video queue' : 'Video visit booked', detail: confidential ? 'Confidential mental-health session booked on the patient portal.' : `${input.service}${input.onDemand ? ' · next available clinician' : ` with ${input.clinician} on ${new Date(input.startsAt!).toLocaleString()}`}. Reason: ${input.reason.trim()}. Paid by ${input.payer.toLowerCase()} (${reference}).`, author: PORTAL, department: input.department }),
      },
      actor: PORTAL, action: `${input.onDemand ? 'joined the video queue' : 'booked a video visit'} for ${patient.name} (${id})`, department: input.department, patientId: patient.id,
    }))
    const doctor = input.onDemand ? 'the next available doctor' : input.clinician!
    smsNotify(patient.id, input.onDemand ? 'queued' : 'booked', { doctor, when: input.onDemand ? 'now' : new Date(input.startsAt!).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), code: joinCode, link: appLink(`/join/${joinCode}`) }, id)
    return { id, joinCode, reference, amount: price }
  }, [commit, smsNotify])

  const cancelVideoVisit = useCallback((id: string, by: 'Patient' | 'Staff') => {
    const actor = by === 'Patient' ? PORTAL : actorName('Clinical team')
    commit((previous) => {
      const apt = previous.appointments.find((item) => item.id === id)
      if (!apt || apt.status === 'Completed' || apt.status === 'Cancelled') return null
      // Full refund when cancelled by the clinic, or by the patient more than 2 hours before (always for the on-demand queue).
      const refund = Boolean(apt.payment) && (by === 'Staff' || apt.onDemand || Date.parse(apt.startsAt) - Date.now() > 2 * 3_600_000)
      return {
        next: {
          ...previous,
          appointments: previous.appointments.map((item) => item.id === id ? { ...item, status: 'Cancelled' as const, cancelledBy: by, ...(refund && item.payment ? { payment: { ...item.payment, refundedAt: new Date().toISOString() } } : {}) } : item),
          invoices: refund ? previous.invoices.map((inv) => inv.id === apt.payment!.invoiceId ? { ...inv, discount: inv.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), status: 'Paid' as const, paidAt: new Date().toISOString() } : inv) : previous.invoices,
        },
        actor, action: `cancelled video visit ${id}${refund ? ' with a full refund' : ''}`, department: apt.department, patientId: apt.patientId,
      }
    })
    const apt = stateRef.current.appointments.find((item) => item.id === id)
    if (apt && apt.status !== 'Completed' && apt.status !== 'Cancelled') {
      const refund = Boolean(apt.payment) && (by === 'Staff' || apt.onDemand || Date.parse(apt.startsAt) - Date.now() > 2 * 3_600_000)
      smsNotify(apt.patientId, 'cancelled', { code: apt.joinCode ?? id, refund: refund ? `A full refund of ${apt.payment!.amount} is on its way.` : 'This late cancellation is not refundable.' }, id)
    }
    notify(by === 'Patient' ? 'Visit cancelled' : 'Visit cancelled and refunded', 'info')
  }, [actorName, commit, notify, smsNotify])

  const updateIntake = useCallback((id: string, intake: TeleIntake) => {
    setState((previous) => ({ ...previous, appointments: previous.appointments.map((item) => item.id === id && item.status === 'Scheduled' ? { ...item, intake } : item) }))
  }, [])

  const rateVisit = useCallback((id: string, stars: number, comment: string) => {
    const value = Math.min(5, Math.max(1, Math.round(stars)))
    commit((previous) => {
      const apt = previous.appointments.find((item) => item.id === id)
      if (!apt || apt.status !== 'Completed') return null
      return { next: { ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, rating: { stars: value, ...(comment.trim() ? { comment: comment.trim().slice(0, 400) } : {}), at: new Date().toISOString() } } : item) }, actor: PORTAL, action: `rated video visit ${id} ${value} of 5`, department: apt.department, patientId: apt.patientId }
    })
  }, [commit])

  const setVisitPharmacy = useCallback((id: string, pharmacy: string) => {
    setState((previous) => ({ ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, pharmacy } : item) }))
  }, [])

  const claimOnDemand = useCallback((id: string) => {
    if (denied(['clinical-notes', 'notes'], 'see patients from the video queue')) return
    const actor = actorName('Clinician')
    commit((previous) => {
      const apt = previous.appointments.find((item) => item.id === id)
      if (!apt || apt.clinician || apt.status !== 'Scheduled') return null
      return { next: { ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, clinician: actor, startsAt: new Date().toISOString() } : item) }, actor, action: `picked up ${id} from the on-demand video queue`, department: apt.department, patientId: apt.patientId }
    })
    const apt = stateRef.current.appointments.find((item) => item.id === id)
    if (apt && !apt.clinician) smsNotify(apt.patientId, 'ready', { doctor: actorName('Your doctor'), code: apt.joinCode ?? '', link: appLink(`/join/${apt.joinCode}`) }, id)
  }, [actorName, commit, denied, smsNotify])

  const sendVisitReminder = useCallback((id: string, auto = false) => {
    const actor = auto ? 'Reminder service' : actorName('Clinic')
    commit((previous) => {
      const apt = previous.appointments.find((item) => item.id === id)
      const patient = apt && previous.patients.find((item) => item.id === apt.patientId)
      if (!apt || !patient || apt.status !== 'Scheduled') return null
      const reminders = apt.reminders ?? { channels: ['SMS' as const], phone: patient.phone, sent: [] }
      const at = new Date().toISOString()
      const text = reminderText(apt, previous.settings.name)
      const sent = [...reminders.sent, ...reminders.channels.map((channel) => ({ at, channel, text }))]
      return { next: { ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, reminders: { ...reminders, sent } } : item) }, actor, action: `sent a ${reminders.channels.join(' and ')} reminder for ${id}`, department: apt.department, patientId: apt.patientId }
    })
    const apt = stateRef.current.appointments.find((item) => item.id === id)
    if (apt?.status === 'Scheduled' && (apt.reminders?.channels ?? ['SMS']).includes('SMS')) smsNotify(apt.patientId, 'reminder', { doctor: apt.clinician || 'your doctor', when: new Date(apt.startsAt).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), code: apt.joinCode ?? '', link: appLink(`/join/${apt.joinCode}`) }, id)
    if (!auto) notify('Reminder sent')
  }, [actorName, commit, notify, smsNotify])

  // Reminder service: SMS/email 24 hours and 1 hour before each booked video visit.
  useEffect(() => {
    // Runs in signed-in staff tabs only, so a patient's open portal tab does not send duplicates.
    const run = () => { if (!currentRole) return; stateRef.current.appointments.filter((item) => item.reminders && dueReminders(item).length).forEach((item) => sendVisitReminder(item.id, true)) }
    run()
    const timer = window.setInterval(run, 60_000)
    return () => window.clearInterval(timer)
  }, [sendVisitReminder, currentRole])

  const openThread = useCallback((input: { patientId: string; department: DepartmentId; subject: string; text: string; photos: string[]; payer: VisitPayer; insurer?: string; confidential?: boolean; gateway?: Gateway }) => {
    const current = stateRef.current
    const patient = current.patients.find((item) => item.id === input.patientId)
    if (!patient || input.text.trim().length < 5 || input.subject.trim().length < 3) return null
    const id = nextNumber(current.messageThreads.map((item) => item.id), 'MSG', 300)
    const invoiceId = nextNumber(current.invoices.map((item) => item.id), 'INV', 24000)
    const listed = priceOf(MESSAGE_SERVICE, current.services)
    const name = listed.name
    const price = input.gateway?.amount ?? listed.price
    const now = new Date()
    // Replies are promised within one working day.
    const due = new Date(now.getTime() + 24 * 3_600_000); if (due.getDay() === 6) due.setDate(due.getDate() + 2); if (due.getDay() === 0) due.setDate(due.getDate() + 1)
    const thread: MessageThread = { id, patientId: patient.id, department: input.department, subject: input.subject.trim(), status: 'Awaiting reply', openedAt: now.toISOString(), dueAt: due.toISOString(), fee: price, invoiceId, confidential: input.confidential, ...(input.gateway ? { paymentReference: input.gateway.reference, paymentProvider: input.gateway.provider } : {}), messages: [{ id: makeId('m'), at: now.toISOString(), from: 'Patient', name: patient.name, text: input.text.trim(), photos: input.photos }] }
    commit((previous) => ({ next: { ...previous, messageThreads: [thread, ...previous.messageThreads], invoices: [visitInvoice(invoiceId, patient.id, MESSAGE_SERVICE, name, price, input.payer, input.insurer, now.toISOString()), ...previous.invoices] }, actor: PORTAL, action: `sent a secure message to ${unitName(input.department)} (${id})`, department: input.department, patientId: patient.id }))
    return id
  }, [commit])

  const patientMessage = useCallback((threadId: string, text: string, photos: string[]) => {
    if (!text.trim()) return
    commit((previous) => {
      const thread = previous.messageThreads.find((item) => item.id === threadId)
      const patient = thread && previous.patients.find((item) => item.id === thread.patientId)
      if (!thread || !patient || thread.status === 'Closed') return null
      return { next: { ...previous, messageThreads: previous.messageThreads.map((item) => item.id === threadId ? { ...item, status: 'Awaiting reply' as const, messages: [...item.messages, { id: makeId('m'), at: new Date().toISOString(), from: 'Patient' as const, name: patient.name, text: text.trim(), photos }] } : item) }, actor: PORTAL, action: `added to message ${threadId}`, department: thread.department, patientId: patient.id }
    })
  }, [commit])

  const replyThread = useCallback((threadId: string, text: string, close: boolean) => {
    if (denied(['clinical-notes', 'notes'], 'answer patient messages')) return
    if (!text.trim() && !close) return
    const actor = actorName('Clinician')
    commit((previous) => {
      const thread = previous.messageThreads.find((item) => item.id === threadId)
      if (!thread) return null
      const messages = text.trim() ? [...thread.messages, { id: makeId('m'), at: new Date().toISOString(), from: 'Clinician' as const, name: actor, text: text.trim() }] : thread.messages
      return {
        next: {
          ...previous,
          messageThreads: previous.messageThreads.map((item) => item.id === threadId ? { ...item, messages, clinician: item.clinician ?? actor, status: close ? 'Closed' as const : 'Answered' as const } : item),
          patients: text.trim() ? withTimeline(previous.patients, thread.patientId, { type: 'note', title: thread.confidential ? 'Confidential message answered' : `Secure message answered: ${thread.subject}`, detail: thread.confidential ? 'Reply held with the treating clinician.' : text.trim(), author: actor, department: thread.department }) : previous.patients,
        },
        actor, action: `${text.trim() ? 'answered' : 'closed'} secure message ${threadId}`, department: thread.department, patientId: thread.patientId,
      }
    })
    const thread = stateRef.current.messageThreads.find((item) => item.id === threadId)
    if (thread && text.trim()) smsNotify(thread.patientId, 'reply', { subject: thread.confidential ? 'your confidential message' : thread.subject, link: appLink('/care') }, threadId)
    notify(close ? 'Message answered and closed' : 'Reply sent to the patient')
  }, [actorName, commit, notify, denied, smsNotify])

  const scheduleAppointment = useCallback((input: Omit<Appointment, 'id' | 'status'>) => {
    const actor = actorName('Scheduling team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === input.patientId)
      if (!patient) return null
      const id = nextNumber(previous.appointments.map((item) => item.id), 'APT', 500)
      return { next: { ...previous, appointments: [...previous.appointments, { ...input, id, status: 'Scheduled', ...(input.mode === 'Video' && !input.joinCode ? { joinCode: makeJoinCode() } : {}) }] }, actor, action: `scheduled a ${input.mode.toLowerCase()} visit for ${patient.name}`, department: input.department, patientId: patient.id }
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

  const recordObservations = useCallback((patientId: string, vitals: Vitals, onOxygen: boolean, consciousness: Consciousness, context: ObservationContext = 'Bedside') => {
    // Readings a patient reports on a video visit can be documented by any clinician who writes notes.
    if (denied(context === 'Telemedicine' ? ['vitals', 'clinical-notes'] : ['vitals'], 'record vital signs')) return
    const actor = actorName('Nursing team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const set: ObservationSet = { ...vitals, at: new Date().toISOString(), by: actor, onOxygen, consciousness, context }
      const updated = { ...patient, vitals, observations: [set, ...(patient.observations ?? [])] }
      const score = patientNews2(updated)
      return {
        next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: `${context} observations${score ? ` · NEWS2 ${score.score}` : ''}`, detail: `HR ${vitals.hr}, BP ${vitals.bpSys}/${vitals.bpDia}, RR ${vitals.rr}, SpO₂ ${vitals.spo2}%${onOxygen ? ' on oxygen' : ''}, T ${vitals.temp}°C, ${consciousness}.`, author: actor, department: patient.department }, { vitals, observations: set ? [set, ...(patient.observations ?? [])] : patient.observations }) },
        actor, action: `recorded observations for ${patient.name}${score ? ` (NEWS2 ${score.score})` : ''}`, department: patient.department, patientId,
      }
    })
    notify('Observations saved')
  }, [actorName, commit, notify, denied])

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

  const attachImages = useCallback((orderId: string, images: OrderImage[]) => {
    const actor = actorName('Radiology')
    commit((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      const patient = order && previous.patients.find((item) => item.id === order.patientId)
      if (!order || !patient || !images.length) return null
      const stamped = images.map((image) => ({ ...image, by: actor }))
      return {
        next: {
          ...previous,
          orders: previous.orders.map((item) => item.id === orderId ? { ...item, images: [...(item.images ?? []), ...stamped] } : item),
          patients: withTimeline(previous.patients, patient.id, { type: 'result', title: `Images attached · ${order.title}`, detail: `${images.length} image${images.length > 1 ? 's' : ''}${images[0].caption ? `: ${images.map((image) => image.caption).filter(Boolean).join('; ')}` : ''}.`, author: actor, department: order.department, orderId }),
        },
        actor, action: `attached ${images.length} image${images.length > 1 ? 's' : ''} to ${order.title} for ${patient.name}`, department: order.department, patientId: patient.id,
      }
    })
    notify(`${images.length} image${images.length > 1 ? 's' : ''} attached`)
  }, [actorName, commit, notify])

  const removeImage = useCallback((orderId: string, imageId: string) => {
    const actor = actorName('Radiology')
    commit((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      if (!order) return null
      return { next: { ...previous, orders: previous.orders.map((item) => item.id === orderId ? { ...item, images: (item.images ?? []).filter((image) => image.id !== imageId) } : item) }, actor, action: `removed an image from ${order.title}`, department: order.department, patientId: order.patientId }
    })
  }, [actorName, commit])

  const advanceOrder = useCallback((orderId: string, result?: string, toStage?: number) => {
    const target = stateRef.current.orders.find((item) => item.id === orderId)
    if (target && currentRole && !canAdvanceOrder(target, currentRole)) { notify(target.kind === 'Imaging' && currentRole === 'radiographer' ? 'Only the radiologist reports imaging studies' : 'This step belongs to another role', 'warning'); return }
    const actor = actorName('Clinical team')
    commit((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      const patient = order && previous.patients.find((item) => item.id === order.patientId)
      if (!order || !patient) return null
      const stages = stagesFor(order)
      const next = Math.min(toStage ?? orderStage(order) + 1, stages.length - 1)
      const status = statusForStage(order, next)
      const specimen = order.kind === 'Laboratory' && !order.externalProviderId && next === 1 ? { id: `SP-${Math.floor(1000 + Math.random() * 9000)}`, type: /gas/i.test(order.title) ? 'Arterial blood' : /culture/i.test(order.title) ? 'Blood culture bottles' : 'Venous blood', collectedBy: actor, collectedAt: new Date().toISOString() } : order.specimen
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
  }, [actorName, commit, notify, currentRole])

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
      const set = { ...input.vitals, at: new Date().toISOString(), by: actor, onOxygen: false, consciousness: (input.vitals.gcs < 15 ? 'New confusion' : 'Alert') as Consciousness, context: 'Triage' as const }
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'triage', title: `Triaged ESI ${input.esi}`, detail: `${input.impression}. ${input.history}`.trim(), author: actor, department: input.department }, {
            vitals: input.vitals, observations: [set], esi: input.esi, status: 'waiting', department: input.department, history: input.history || patient.history,
            allergies: input.allergies.length ? input.allergies : ['No known allergies'], complaint: input.impression || patient.complaint,
            ...(patient.visit?.type === 'OPD' && input.esi >= 3
              ? { location: `${unitName(input.department)} OPD · waiting`, visit: { ...patient.visit, department: input.department, opd: 'Waiting' as const } }
              : { location: input.esi <= 2 ? 'ED priority queue' : 'Waiting Room A', ...(patient.visit?.type === 'OPD' ? { department: 'emergency', visit: { ...patient.visit, type: 'Emergency' as const, department: 'emergency' } } : {}) }),
          }),
        },
        actor, action: `completed ESI ${input.esi} triage for ${patient.name}`, department: input.department, patientId,
      }
    })
    notify('Triage complete — patient is waiting for a doctor')
  }, [actorName, commit, notify])

  const receptionCheckIn = useCallback((input: CheckInInput) => {
    const actor = actorName('Reception')
    const now = new Date().toISOString()
    const snapshot = stateRef.current
    const queueDept = snapshot.departments.find((item) => item.id === input.department) ?? snapshot.departments[0]
    const issuedNo = nextQueueNo(snapshot.patients, queueDept)
    commit((previous) => {
      const fees = previous.settings.fees ?? DEFAULT_FEES
      const department = previous.departments.find((item) => item.id === input.department) ?? previous.departments[0]
      const existing = input.patientId ? previous.patients.find((item) => item.id === input.patientId) : undefined
      const patientId = existing?.id ?? makeId('p')
      const tests = (input.tests ?? []).map((name) => { const item = previous.investigations.find((inv) => inv.name === name); return { name, price: item?.price ?? 0, kind: (item?.kind ?? 'Laboratory') as ClinicalOrder['kind'] } })
      const { lines, total } = visitCharges({ returning: Boolean(existing), type: input.type, department: department.id, tests }, fees)
      const cover = input.payment === 'Waived' ? 0 : payerCover(input.payer)
      const invoiceId = nextNumber(previous.invoices.map((item) => item.id), 'INV', 24000)
      const covered = Math.round(total * cover * 100) / 100
      const patientShare = Math.round((total - covered) * 100) / 100
      const paidNow = input.payment === 'Paid' && patientShare > 0
      const billing: BillingState = input.payment === 'Waived' ? 'Waived' : input.payment === 'Deferred' ? 'Deferred' : patientShare <= 0 ? 'Covered' : paidNow ? 'Paid' : 'Unpaid'
      const receipt = billing === 'Paid' || billing === 'Covered' ? `RC-${Date.now().toString().slice(-6)}` : undefined
      const invoice: Invoice = {
        id: invoiceId, patientId, issuedAt: now, dueAt: now, tax: 0,
        items: lines.map((line) => ({ id: makeId('b'), description: line.description, code: line.category === 'Investigation' ? 'INV' : 'REC', category: line.category, quantity: 1, unitPrice: line.price })),
        discount: input.payment === 'Waived' ? total : 0, insuranceCovered: covered, insuranceProvider: cover > 0 ? `${input.payer}${input.payerRef ? ` · ${input.payerRef}` : ''}` : undefined,
        status: billing === 'Unpaid' || billing === 'Deferred' ? 'Pending' : 'Paid', ...(billing === 'Paid' || billing === 'Covered' || billing === 'Waived' ? { paidAt: now } : {}),
        payments: paidNow ? [{ at: now, by: actor, method: input.method ?? 'Cash', amount: patientShare }] : [],
      }
      const queueNo = issuedNo
      const visit: Visit = { id: makeId('V'), type: input.type, department: department.id, queueNo, checkedInAt: now, payer: input.payer, payerRef: input.payerRef, billing, invoiceId, receipt, waiverReason: input.waiverReason }
      const cleared = billing !== 'Unpaid'
      const investigationOnly = input.type === 'Investigation'
      const status: Patient['status'] = !cleared ? 'awaiting-payment' : investigationOnly ? 'waiting' : 'awaiting-triage'
      const location = !cleared ? 'Reception · cashier' : investigationOnly ? 'Diagnostics waiting area' : 'Triage waiting area'
      const base: Patient = existing ?? {
        id: patientId, mrn: `NS-${String(Math.floor(100000 + Math.random() * 899999))}`, name: (input.name ?? '').trim(), age: input.age ?? 0, sex: input.sex ?? 'Female',
        pronouns: input.sex === 'Female' ? 'she/her' : input.sex === 'Male' ? 'he/him' : 'they/them', complaint: input.complaint.trim(), history: 'Awaiting triage assessment.',
        allergies: ['Not yet recorded'], arrival: now, esi: 3, riskFactors: [], resources: 0, vitals: { hr: 0, rr: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, gcs: 15, pain: 0 },
        department: department.id, location, status, encounterType: 'outpatient', assignedTo: 'Unassigned', timeline: [],
      }
      const patient: Patient = {
        ...base, complaint: input.complaint.trim() || base.complaint, phone: input.phone?.trim() || base.phone, insurance: input.payer,
        department: input.type === 'Emergency' ? 'emergency' : department.id, status, location, visit,
        encounterType: input.type === 'Admission' ? 'inpatient' : 'outpatient',
        ...(existing ? { arrival: now } : {}),
        timeline: [{ id: makeId('ev'), at: now, type: 'arrival', title: `Checked in at reception · ${VISIT_LABEL[input.type]}`, detail: `${queueNo} · ${department.name}. ${input.payer}${input.payerRef ? ` (${input.payerRef})` : ''}. Bill ${total.toFixed(2)}: ${billing === 'Paid' ? `paid ${patientShare.toFixed(2)}` : billing === 'Covered' ? 'covered by payer' : billing === 'Waived' ? `waived — ${input.waiverReason}` : billing === 'Deferred' ? 'emergency — treat first, bill later' : 'waiting for payment'}.`, author: actor, department: department.id }, ...base.timeline],
      }
      const firstOrder = Number(nextNumber(previous.orders.map((item) => item.id), 'OR', 8100).replace('OR-', ''))
      const orders = investigationOnly ? tests.map((test, index): ClinicalOrder => ({ id: `OR-${firstOrder + index}`, patientId, title: test.name, kind: test.kind, department: test.kind === 'Imaging' ? 'radiology' : 'laboratory', priority: 'routine', status: 'ordered', createdAt: now, createdBy: actor, billing: cleared ? billing : 'Unpaid' })) : []
      return {
        next: { ...previous, patients: existing ? previous.patients.map((item) => item.id === patientId ? patient : item) : [patient, ...previous.patients], invoices: [invoice, ...previous.invoices], orders: [...orders, ...previous.orders] },
        actor, action: `checked in ${patient.name} for ${VISIT_LABEL[input.type].toLowerCase()} (${queueNo}, ${billing.toLowerCase()})`, department: department.id, patientId,
      }
    })
    notify(input.payment === 'Unpaid' ? 'Checked in — waiting at the cashier' : input.type === 'Investigation' ? 'Checked in — sent to lab / imaging' : 'Checked in — sent to triage')
    return issuedNo
  }, [actorName, commit, notify])

  const settleAtReception = useCallback((patientId: string, method: 'Cash' | 'Card' | 'Mobile money') => {
    const actor = actorName('Reception')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const now = new Date().toISOString()
      let invoices = previous.invoices
      if (patient.visit?.invoiceId) invoices = invoices.map((inv) => {
        if (inv.id !== patient.visit!.invoiceId || inv.status === 'Paid') return inv
        const due = invoiceTotals(inv).patientPayable - (inv.payments ?? []).filter((pay) => pay.method !== 'Insurer').reduce((sum, pay) => sum + pay.amount, 0)
        return { ...inv, status: 'Paid' as const, paidAt: now, payments: [...(inv.payments ?? []), ...(due > 0 ? [{ at: now, by: actor, method, amount: Math.round(due * 100) / 100 }] : [])] }
      })
      const owed = previous.orders.filter((order) => order.patientId === patientId && order.billing === 'Unpaid')
      if (owed.length) {
        const items = owed.map((order) => ({ id: makeId('b'), description: `${order.kind}: ${order.title}`, code: order.id, category: order.kind, quantity: 1, unitPrice: previous.investigations.find((item) => item.name === order.title.split(' — ')[0])?.price ?? (order.kind === 'Imaging' ? 40 : 8) }))
        const total = items.reduce((sum, item) => sum + item.unitPrice, 0)
        invoices = [{ id: nextNumber(invoices.map((item) => item.id), 'INV', 24000), patientId, issuedAt: now, dueAt: now, items, tax: 0, discount: 0, insuranceCovered: 0, status: 'Paid', paidAt: now, payments: [{ at: now, by: actor, method, amount: total }] }, ...invoices]
      }
      const visit = patient.visit ? { ...patient.visit, billing: 'Paid' as const, receipt: patient.visit.receipt ?? `RC-${Date.now().toString().slice(-6)}` } : undefined
      const wasWaiting = patient.status === 'awaiting-payment'
      const next: Partial<Patient> = { visit }
      if (wasWaiting) {
        if (visit?.type === 'Investigation') Object.assign(next, { status: 'waiting', location: 'Diagnostics waiting area' })
        else if (visit?.type === 'Admission') Object.assign(next, { status: 'admitted', encounterType: 'inpatient', location: `${unitName(visit.department)} ward`, department: visit.department })
        else Object.assign(next, { status: 'awaiting-triage', location: 'Triage waiting area' })
      }
      return {
        next: {
          ...previous, invoices,
          orders: previous.orders.map((order) => order.patientId === patientId && order.billing === 'Unpaid' ? { ...order, billing: 'Paid' as const } : order),
          patients: withTimeline(previous.patients, patientId, { type: 'note', title: 'Paid at reception', detail: `${method}${owed.length ? ` · ${owed.length} test${owed.length > 1 ? 's' : ''} released to lab / imaging` : ''}${wasWaiting ? ` · sent to ${visit?.type === 'Admission' ? 'the ward' : visit?.type === 'Investigation' ? 'lab / imaging' : 'triage'}` : ''}.`, author: actor, department: patient.department }, next),
        },
        actor, action: `took payment from ${patient.name} (${method})`, department: patient.department, patientId,
      }
    })
    notify('Payment taken')
  }, [actorName, commit, notify])

  const opdCall = useCallback((patientId: string, room: string) => {
    const actor = actorName('Clinic')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient?.visit) return null
      return { next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: `Called in to ${room}`, detail: `${patient.visit.queueNo} seen by ${actor}.`, author: actor, department: patient.visit.department }, { status: 'in-treatment', assignedTo: actor, location: `${unitName(patient.visit.department)} OPD · ${room}`, visit: { ...patient.visit, opd: 'With doctor', room } }) }, actor, action: `called ${patient.name} (${patient.visit.queueNo}) into ${room}`, department: patient.visit.department, patientId }
    })
  }, [actorName, commit])

  const opdFinish = useCallback((patientId: string, outcome: OpdOutcome) => {
    const actor = actorName('Clinic')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient?.visit) return null
      const visit = patient.visit
      const now = new Date().toISOString()
      if (outcome.kind === 'Refer') {
        const target = previous.departments.find((item) => item.id === outcome.department)
        if (!target) return null
        const queueNo = nextQueueNo(previous.patients, target)
        return { next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'referral', title: `Sent to ${target.name} OPD`, detail: `${outcome.note || 'Specialist opinion requested.'} New queue number ${queueNo}.`, author: actor, department: target.id }, { status: 'waiting', department: target.id, location: `${target.shortName} OPD · waiting`, visit: { ...visit, department: target.id, queueNo, opd: 'Waiting', room: undefined } }) }, actor, action: `referred ${patient.name} to ${target.name} OPD`, department: target.id, patientId }
      }
      if (outcome.kind === 'Admit') {
        const fees = previous.settings.fees ?? DEFAULT_FEES
        const cover = payerCover(visit.payer)
        const invoiceId = nextNumber(previous.invoices.map((item) => item.id), 'INV', 24000)
        const covered = Math.round(fees.admissionDeposit * cover * 100) / 100
        const billing: BillingState = visit.billing === 'Waived' ? 'Waived' : cover >= 1 ? 'Covered' : 'Unpaid'
        const invoice: Invoice = { id: invoiceId, patientId, issuedAt: now, dueAt: now, items: [{ id: makeId('b'), description: 'Admission deposit', code: 'ADM', category: 'Room & nursing', quantity: 1, unitPrice: fees.admissionDeposit }], tax: 0, discount: billing === 'Waived' ? fees.admissionDeposit : 0, insuranceCovered: covered, insuranceProvider: cover > 0 ? visit.payer : undefined, status: billing === 'Unpaid' ? 'Pending' : 'Paid', payments: [] }
        const admitted = billing !== 'Unpaid'
        return {
          next: {
            ...previous, invoices: [invoice, ...previous.invoices],
            patients: withTimeline(previous.patients, patientId, { type: 'transfer', title: `Admission decided in ${unitName(visit.department)} OPD`, detail: `${outcome.note || 'Admitted for inpatient care.'} ${admitted ? 'Deposit covered — going to the ward.' : 'Patient to pay the admission deposit at reception, then go to the ward.'}`, author: actor, department: visit.department }, {
              status: admitted ? 'admitted' : 'awaiting-payment', encounterType: admitted ? 'inpatient' : patient.encounterType, location: admitted ? `${unitName(visit.department)} ward` : 'Reception · cashier', department: visit.department,
              visit: { ...visit, type: 'Admission', billing, invoiceId, opd: 'Seen', outcome: 'Admitted' },
            }),
          },
          actor, action: `admitted ${patient.name} from ${unitName(visit.department)} OPD${admitted ? '' : ' (deposit due at reception)'}`, department: visit.department, patientId,
        }
      }
      const appointments = outcome.kind === 'Follow-up' && outcome.date ? [{ id: nextNumber(previous.appointments.map((item) => item.id), 'APT', 500), patientId, clinician: actor, department: visit.department, startsAt: new Date(`${outcome.date}T09:00:00`).toISOString(), durationMinutes: 20, mode: 'In person' as const, status: 'Scheduled' as const, reason: outcome.note || 'OPD follow-up' }, ...previous.appointments] : previous.appointments
      return {
        next: { ...previous, appointments, patients: withTimeline(previous.patients, patientId, { type: 'discharge', title: `OPD visit completed · ${outcome.kind === 'Follow-up' ? 'follow-up booked' : 'home'}`, detail: `${outcome.note || 'Seen and sent home.'}${outcome.kind === 'Follow-up' && outcome.date ? ` Return on ${outcome.date}.` : ''}`, author: actor, department: visit.department }, { status: 'discharged', location: 'Home', visit: { ...visit, opd: 'Seen', outcome: outcome.kind === 'Follow-up' ? 'Follow-up booked' : 'Home' } }) },
        actor, action: `completed the OPD visit of ${patient.name}`, department: visit.department, patientId,
      }
    })
    notify(outcome.kind === 'Admit' ? 'Admission recorded' : outcome.kind === 'Refer' ? 'Sent to the other clinic' : 'Visit completed')
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
    const pendingNote = stateRef.current.cosignNotes.find((item) => item.id === id)
    if (pendingNote && myRank <= (pendingNote.authorRank ?? 1)) { notify('This note needs a more senior doctor to co-sign', 'warning'); return }
    commit((previous) => {
      const note = previous.cosignNotes.find((item) => item.id === id)
      const patient = note && previous.patients.find((item) => item.id === note.patientId)
      if (!note || !patient || note.status === 'Co-signed') return null
      return {
        next: { ...previous, cosignNotes: previous.cosignNotes.map((item) => item.id === id ? { ...item, status: 'Co-signed', cosignedBy: actor } : item), patients: withTimeline(previous.patients, patient.id, { type: 'note', title: `Note by ${note.author} co-signed`, detail: note.text, author: actor, department: patient.department }, patient.rounds?.some((round) => round.id === note.evaluationId) ? { rounds: patient.rounds.map((round) => round.id === note.evaluationId ? { ...round, cosign: 'Co-signed' as const } : round) } : {}) },
        actor, action: `co-signed a note by ${note.author} for ${patient.name}`, department: patient.department, patientId: patient.id,
      }
    })
    notify('Note co-signed')
  }, [actorName, commit, notify, myRank, notify])

  const saveEvaluation = useCallback((patientId: string, evaluation: Omit<Evaluation, 'id' | 'at' | 'by'>) => {
    if (denied(['clinical-notes'], 'write clinical evaluations')) return
    const actor = actorName('Clinical team')
    const pending = supervised
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
          cosignNotes: pending ? [{ id: makeId('CN'), patientId, author: actor, at: new Date().toISOString(), text: `Clinical evaluation. ${summary}`, status: 'Pending review', evaluationId: id, authorRank: myRank, ...(myGrade ? { authorGrade: gradeLabel(myGrade.grade, myGrade.year) } : {}) }, ...previous.cosignNotes] : previous.cosignNotes,
        },
        actor, action: `completed a clinical evaluation for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify(pending ? 'Evaluation saved and sent for co-signature' : 'Evaluation saved')
  }, [actorName, commit, currentRole, notify, denied, supervised, myRank, myGrade])

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

  const rejectSpecimen = useCallback((orderId: string, reason: string) => {
    const actor = actorName('Laboratory')
    commit((previous) => {
      const order = previous.orders.find((item) => item.id === orderId)
      const patient = order && previous.patients.find((item) => item.id === order.patientId)
      if (!order || !patient) return null
      return {
        next: {
          ...previous,
          orders: previous.orders.map((item) => item.id === orderId ? { ...item, stage: 0, status: 'ordered' as const, specimen: undefined } : item),
          patients: withTimeline(previous.patients, patient.id, { type: 'order', title: `${order.title}: sample rejected`, detail: `${reason}. A new sample is needed.`, author: actor, department: order.department, orderId }),
        },
        actor, action: `rejected the sample for ${order.title} (${reason}) for ${patient.name}`, department: order.department, patientId: patient.id,
      }
    })
    notify('Sample rejected — the ward has been asked to recollect', 'warning')
  }, [actorName, commit, notify])

  const addChartEntry = useCallback(<K extends ChartKey>(patientId: string, chart: K, input: ChartEntryInput<K>, summary: string) => {
    if (denied(['vitals', 'clinical-notes'], 'add chart entries')) return
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const entry = { ...input, id: makeId('CH'), at: input.at ?? new Date().toISOString(), by: actor }
      const list = [...(patient.charts?.[chart] ?? []), entry].sort((a, b) => a.at.localeCompare(b.at))
      return { next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: `${CHART_TITLES[chart]} charted`, detail: summary, author: actor, department: patient.department }, { charts: { ...patient.charts, [chart]: list } }) }, actor, action: `updated the ${CHART_TITLES[chart].toLowerCase()} for ${patient.name}`, department: patient.department, patientId }
    })
    notify(`${CHART_TITLES[chart]} updated`)
  }, [actorName, commit, notify, denied])

  const saveRound = useCallback((patientId: string, round: Omit<RoundNote, 'id' | 'at' | 'by'>) => {
    if (denied(['clinical-notes'], 'write round or bedside assessments')) return
    const actor = actorName('Clinical team')
    const kind = round.kind ?? 'Ward round'
    const nurseReview = kind === 'Junior nurse assessment' || kind === 'Intern nurse assessment'
    const doctorReview = supervised && currentRole !== 'nurse'
    const pending = doctorReview || nurseReview
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const at = new Date().toISOString()
      const id = makeId('RN')
      const entry: RoundNote = { ...round, kind, id, at, by: actor, authorRank: myRank, ...(pending ? { cosign: 'Pending review' as const, reviewer: doctorReview ? 'Senior doctor' as const : 'Senior nurse' as const } : {}) }
      // Vitals taken on the round also go on the observation chart.
      let changes: Partial<Patient> = { rounds: [entry, ...(patient.rounds ?? [])] }
      if (round.vitals) {
        const { onOxygen, consciousness, ...vitals } = round.vitals
        const set: ObservationSet = { ...vitals, at, by: actor, onOxygen, consciousness, context: kind === 'Bedside assessment' ? 'Bedside' : 'Ward round' }
        changes = { ...changes, vitals, observations: [set, ...(patient.observations ?? [])] }
      }
      const summary = `${round.assessment} Plan: ${round.plan}`
      return {
        next: {
          ...previous,
          patients: withTimeline(previous.patients, patientId, { type: 'note', title: `${kind} · ${round.status}${pending ? ' (awaiting co-signature)' : ''}`, detail: summary, author: actor, department: patient.department }, changes),
          cosignNotes: doctorReview ? [{ id: makeId('CN'), patientId, author: actor, at, text: `${kind}. ${summary}`, status: 'Pending review', evaluationId: id, authorRank: myRank, ...(myGrade ? { authorGrade: gradeLabel(myGrade.grade, myGrade.year) } : {}) }, ...previous.cosignNotes] : previous.cosignNotes,
        },
        actor, action: `documented a ${kind.toLowerCase()} for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify(doctorReview ? 'Saved — sent to a senior doctor for co-signature' : nurseReview ? 'Saved — waiting for a senior nurse to review' : 'Saved to the record')
  }, [actorName, commit, currentRole, notify, denied, supervised, myRank, myGrade])

  const reviewRound = useCallback((patientId: string, roundId: string, outcome: NoteReview['outcome'], comment: string) => {
    const actor = actorName('Senior clinician')
    const role = myGrade ? gradeLabel(myGrade.grade, myGrade.year) : currentRole === 'consultant' ? 'Consultant' : currentRole === 'nurse' ? 'Senior nurse' : 'Senior doctor'
    const target = stateRef.current.patients.find((item) => item.id === patientId)?.rounds?.find((item) => item.id === roundId)
    if (target?.cosign === 'Pending review' && target.reviewer !== 'Senior nurse' && myRank <= (target.authorRank ?? 1)) { notify('This note needs a more senior doctor to co-sign', 'warning'); return }
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      const round = patient?.rounds?.find((item) => item.id === roundId)
      if (!patient || !round) return null
      const review: NoteReview = { at: new Date().toISOString(), by: actor, role, outcome, comment }
      const rounds = (patient.rounds ?? []).map((item) => item.id === roundId ? { ...item, cosign: item.cosign ? 'Co-signed' as const : undefined, reviews: [...(item.reviews ?? []), review] } : item)
      return {
        next: {
          ...previous,
          cosignNotes: previous.cosignNotes.map((note) => note.evaluationId === roundId && note.status === 'Pending review' ? { ...note, status: 'Co-signed' as const, cosignedBy: actor } : note),
          patients: withTimeline(previous.patients, patientId, { type: 'note', title: `${role} review · ${round.kind ?? 'Ward round'} by ${round.by}`, detail: `${outcome}${comment ? `: ${comment}` : '.'}`, author: actor, department: patient.department }, { rounds }),
        },
        actor, action: `reviewed a ${(round.kind ?? 'ward round').toLowerCase()} for ${patient.name}`, department: patient.department, patientId,
      }
    })
    notify('Review added')
  }, [actorName, commit, currentRole, notify, myGrade, myRank, notify])

  const saveAssessment = useCallback((patientId: string, values: Record<string, string>, summary: string) => {
    if (denied(['clinical-notes'], 'write specialty assessments')) return
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const entry = { id: makeId('SA'), at: new Date().toISOString(), by: actor, values }
      return { next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: 'Specialty assessment', detail: summary, author: actor, department: patient.department }, { assessments: [entry, ...(patient.assessments ?? [])] }) }, actor, action: `recorded a specialty assessment for ${patient.name}`, department: patient.department, patientId }
    })
    notify('Assessment saved')
  }, [actorName, commit, notify, denied])

  const recordGrowth = useCallback((patientId: string, entry: { ageYears: number; weightKg: number; heightCm: number; muacCm?: number; headCm?: number }) => {
    if (denied(['vitals', 'clinical-notes'], 'record growth')) return
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      return { next: { ...previous, patients: previous.patients.map((item) => item.id === patientId ? { ...item, weightKg: entry.weightKg, growth: [...(item.growth ?? []), { ...entry, at: new Date().toISOString() }] } : item) }, actor, action: `recorded growth measurements for ${patient.name}`, department: patient.department, patientId }
    })
    notify('Growth measurement saved')
  }, [actorName, commit, notify, denied])

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
      const price = (id: string, fallback: number) => previous.services.find((item) => item.id === id && item.active)?.price ?? fallback
      const tariff: Record<string, number> = { Laboratory: 85, Imaging: 420, Medication: 35, Procedure: 650, Physiotherapy: 110, Nutrition: 70, 'Blood bank': 480 }
      const items = [
        { id: makeId('b'), description: 'Consultation', code: 'SV-01', category: 'Consultation', quantity: 1, unitPrice: price(patient.department === 'emergency' ? 'SV-03' : 'SV-02', 320) },
        ...previous.orders.filter((order) => order.patientId === patientId).map((order) => ({ id: makeId('b'), description: `${order.kind}: ${order.title}${order.externalProviderId ? ' (referred)' : ''}`, code: order.id, category: order.kind, quantity: 1, unitPrice: previous.investigations.find((item) => item.name === order.title.split(' — ')[0])?.price ?? tariff[order.kind] ?? 100 })),
        ...((['admitted', 'observation'].includes(patient.status) || patient.encounterType === 'inpatient') ? [{ id: makeId('b'), description: 'Room and nursing (per day)', code: 'SV-04', category: 'Room & nursing', quantity: 1, unitPrice: price('SV-04', 850) }] : []),
        ...previous.theatreCases.filter((item) => item.patientId === patientId).map((item) => ({ id: makeId('b'), description: `Procedure: ${item.procedure}`, code: item.id, category: 'Procedure', quantity: 1, unitPrice: price('SV-07', 4200) })),
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
    if (!can('stock-receive')) { notify('You need the “receive stock” privilege for this', 'warning'); return }
    commit((previous) => {
      const med = previous.formulary.find((item) => item.id === medicationId)
      if (!med) return null
      return { next: { ...previous, formulary: previous.formulary.map((item) => item.id === medicationId ? { ...item, stock: item.stock + amount } : item), stockMovements: [{ id: makeId('SM'), medicationId, at: new Date().toISOString(), by: actor, type: 'Received' as const, quantity: amount, note: 'Quick restock' }, ...previous.stockMovements].slice(0, 300) }, actor, action: `restocked ${med.name} (+${amount} ${med.unit})`, department: 'pharmacy' }
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

  const signInBlock = useCallback((role: RoleId) => {
    const member = stateRef.current.staff.find((item) => item.roleId === role)
    if (member?.suspended) return `${member.name}'s account is suspended. Ask the administrator to reactivate it.`
    if (member?.status === 'Pending approval') return `${member.name}'s account is waiting for administrator approval.`
    const subscription = stateRef.current.settings.subscription ?? 'Active'
    if (role !== 'provider' && subscription === 'Suspended') return `${stateRef.current.settings.name}'s subscription is suspended. Please contact Northstar Cloud.`
    if (!['provider', 'administrator'].includes(role) && !['Active', 'Trial'].includes(subscription)) return `${stateRef.current.settings.name} is not live yet (${subscription.toLowerCase()}). The administrator completes set-up and payment first.`
    const needed = moduleForRole(role)
    if (needed && !isOn(stateRef.current.settings, needed.id)) return `${stateRef.current.settings.name} has not switched on ${needed.name}. The administrator can add it under Administration → Plan & modules.`
    return null
  }, [])

  const updateSettings = useCallback((changes: Partial<FacilitySettings>) => {
    const actor = actorName('Administrator')
    commit((previous) => ({ next: { ...previous, settings: { ...previous.settings, ...changes } }, actor, action: `updated facility settings (${Object.keys(changes).join(', ')})`, department: 'emergency' }))
    notify('Settings saved')
  }, [actorName, commit, notify])

  /** The client switches modules on or off. Data is kept; switched-off parts are hidden and not billed. */
  const setModules = useCallback((offModules: ModuleId[], what: string) => {
    if (!can('manage') && !can('pricing')) { notify('Only the administrator can change the plan', 'warning'); return }
    const actor = actorName('Administrator')
    commit((previous) => ({ next: { ...previous, settings: { ...previous.settings, offModules }, tenants: previous.tenants.map((item) => item.live ? { ...item, offModules } : item) }, actor, action: what, department: 'emergency' }))
    notify(what.charAt(0).toUpperCase() + what.slice(1))
  }, [actorName, can, commit, notify])

  const syncLive = (previous: HospitalState, status: SubscriptionStatus, extra: Partial<FacilitySettings> = {}) => ({ settings: { ...previous.settings, subscription: status, ...extra }, tenants: previous.tenants.map((item) => item.live ? { ...item, status } : item) })
  const nextInvoiceId = (previous: HospitalState) => `NC-${new Date().getFullYear()}-${String(Math.max(200, ...previous.platformInvoices.map((item) => Number(item.id.split('-').pop()) || 0)) + 1).padStart(4, '0')}`

  /** First sign-in: the administrator chooses the services the facility is made of and applies. */
  const submitApplication = useCallback((offModules: ModuleId[]) => {
    if (!can('manage')) return
    const actor = actorName('Administrator')
    commit((previous) => ({ next: { ...previous, ...syncLive(previous, 'Pending approval', { offModules, applicationNote: undefined }), tenants: previous.tenants.map((item) => item.live ? { ...item, status: 'Pending approval' as SubscriptionStatus, offModules } : item) }, actor, action: `applied to run ${MODULES.length - offModules.length} modules`, department: 'emergency' }))
    notify('Application sent to Northstar Cloud for approval')
  }, [actorName, can, commit, notify])

  /** Super admin: approve (and issue the first invoice) or send the application back. */
  const reviewApplication = useCallback((approve: boolean, note: string) => {
    if (!can('pricing')) return
    commit((previous) => {
      if (!approve) return { next: { ...previous, ...syncLive(previous, 'Setup', { applicationNote: note.trim() || 'Please review your selection.' }) }, actor: 'Northstar Cloud', action: `returned the application of ${previous.settings.name}`, department: 'emergency' }
      const bill = estimateBill(previous, previous.pricing)
      const invoice: PlatformInvoice = { id: nextInvoiceId(previous), purpose: 'Subscription', description: 'Platform subscription — first month', amount: Math.round(bill.total * 100) / 100, vatRate: previous.pricing.vatRate, status: 'Issued', issuedAt: new Date().toISOString(), ...(note.trim() ? { note: note.trim() } : {}) }
      return { next: { ...previous, ...syncLive(previous, 'Awaiting payment', { applicationNote: undefined }), platformInvoices: [invoice, ...previous.platformInvoices] }, actor: 'Northstar Cloud', action: `approved ${previous.settings.name} and issued invoice ${invoice.id}`, department: 'emergency' }
    })
    notify(approve ? 'Approved — invoice issued' : 'Application returned to the client')
  }, [can, commit, notify])

  /** Client administrator reports a payment for a platform invoice. */
  const payPlatformInvoice = useCallback((id: string, method: PaymentMethod, reference: string) => {
    if (!can('manage')) return
    const actor = actorName('Administrator')
    commit((previous) => {
      const invoice = previous.platformInvoices.find((item) => item.id === id)
      if (!invoice || invoice.status !== 'Issued') return null
      const paid = { ...invoice, status: 'Payment review' as const, method, reference: reference.trim(), paidAt: new Date().toISOString() }
      const subscription = invoice.purpose === 'Subscription' && previous.settings.subscription === 'Awaiting payment' ? syncLive(previous, 'Payment review') : {}
      const services = invoice.serviceId ? previous.services.map((item) => item.id === invoice.serviceId ? { ...item, status: 'Payment review' as const } : item) : previous.services
      return { next: { ...previous, ...subscription, services, platformInvoices: previous.platformInvoices.map((item) => item.id === id ? paid : item) }, actor, action: `paid platform invoice ${id} by ${method} (${reference.trim()})`, department: 'emergency' }
    })
    notify('Payment sent for confirmation')
  }, [actorName, can, commit, notify])

  /** Super admin confirms (or rejects) a payment. Confirming activates the facility or launches the service. */
  const confirmPlatformPayment = useCallback((id: string, received: boolean) => {
    if (!can('pricing')) return
    commit((previous) => {
      const invoice = previous.platformInvoices.find((item) => item.id === id)
      if (!invoice) return null
      const now = new Date().toISOString()
      const platformInvoices = previous.platformInvoices.map((item) => item.id === id ? (received ? { ...item, status: 'Paid' as const, confirmedAt: now } : { ...item, status: 'Issued' as const, note: 'Payment not found — please check the reference and pay again.' }) : item)
      const subscription = invoice.purpose === 'Subscription' && previous.settings.subscription === 'Payment review' ? syncLive(previous, received ? 'Active' : 'Awaiting payment') : {}
      const services = invoice.serviceId ? previous.services.map((item) => item.id === invoice.serviceId ? (received ? { ...item, status: 'Live' as const, active: true, featured: true, launchedAt: now } : { ...item, status: 'Awaiting payment' as const }) : item) : previous.services
      return { next: { ...previous, ...subscription, services, platformInvoices }, actor: 'Northstar Cloud', action: `${received ? 'confirmed' : 'rejected'} payment for ${id}`, department: 'emergency' }
    })
    notify(received ? 'Payment confirmed' : 'Payment rejected')
  }, [can, commit, notify])

  /** Administrator edits the price or availability of a live service. */
  const saveService = useCallback((service: HospitalService) => {
    if (!can('manage')) { notify('Only the administrator sets prices', 'warning'); return }
    const actor = actorName('Administrator')
    commit((previous) => ({ next: { ...previous, services: previous.services.map((item) => item.id === service.id ? service : item) }, actor, action: `updated ${service.name} (${service.price} incl. VAT${service.active ? '' : ', off'})`, department: service.department ?? 'emergency' }))
  }, [actorName, can, commit, notify])

  /** Administrator creates a service the facility doesn't have yet; it goes to the super admin. */
  const requestService = useCallback((service: Pick<HospitalService, 'name' | 'category' | 'department' | 'price' | 'unit' | 'description'>) => {
    if (!can('manage')) return
    const actor = actorName('Administrator')
    commit((previous) => {
      const created: HospitalService = { ...service, id: nextNumber(previous.services.map((item) => item.id), 'SV', 1), active: false, status: 'Pending approval', custom: true, requestedAt: new Date().toISOString(), requestedBy: actor }
      return { next: { ...previous, services: [...previous.services, created] }, actor, action: `asked to add the service ${service.name}`, department: service.department ?? 'emergency' }
    })
    notify('New service sent to Northstar Cloud for approval')
  }, [actorName, can, commit, notify])

  /** Super admin approves a new service (setting its set-up and monthly fee) or declines it. */
  const decideService = useCallback((id: string, approve: boolean, setupFee: number, monthlyFee: number, note: string) => {
    if (!can('pricing')) return
    commit((previous) => {
      const service = previous.services.find((item) => item.id === id)
      if (!service) return null
      const now = new Date().toISOString()
      if (!approve) return { next: { ...previous, services: previous.services.map((item) => item.id === id ? { ...item, status: 'Declined' as const, decisionNote: note.trim() || undefined } : item) }, actor: 'Northstar Cloud', action: `declined the service ${service.name}`, department: 'emergency' }
      const amount = setupFee + monthlyFee
      const free = amount <= 0
      const updated: HospitalService = { ...service, setupFee, monthlyFee, decisionNote: note.trim() || undefined, ...(free ? { status: 'Live', active: true, featured: true, launchedAt: now } : { status: 'Awaiting payment' }) }
      const invoice: PlatformInvoice | null = free ? null : { id: nextInvoiceId(previous), purpose: 'New service', description: `${service.name} — set-up and first month`, serviceId: id, amount, vatRate: previous.pricing.vatRate, status: 'Issued', issuedAt: now }
      return { next: { ...previous, services: previous.services.map((item) => item.id === id ? updated : item), platformInvoices: invoice ? [invoice, ...previous.platformInvoices] : previous.platformInvoices }, actor: 'Northstar Cloud', action: `approved the service ${service.name}${invoice ? ` and issued ${invoice.id}` : ''}`, department: 'emergency' }
    })
    notify(approve ? 'Service approved' : 'Service declined')
  }, [can, commit, notify])

  /** The signed-in person as a member of staff, with a doctor's chosen grade applied. */
  const meAsStaff = useCallback((): StaffMember | undefined => {
    const member = stateRef.current.staff.find((item) => item.roleId === currentRole)
    if (!member) return undefined
    if (myGrade) return { ...member, grade: myGrade.grade, residentYear: myGrade.year }
    return myLevel ? { ...member, level: myLevel } : member
  }, [currentRole, myGrade, myLevel])

  /** Workplace-based assessment of a more junior colleague in the same profession. */
  const addAssessment = useCallback((input: Omit<Assessment, 'id' | 'at' | 'assessor' | 'assessorLevel' | 'profession'>) => {
    const me = meAsStaff()
    const trainee = stateRef.current.staff.find((item) => item.id === input.traineeId)
    if (!isOn(stateRef.current.settings, 'teaching')) { notify('Teaching is not switched on for this facility', 'warning'); return }
    if (!me || !trainee || !canAssess(levelOf(me), professionOf(me), trainee)) { notify('You can assess only more junior colleagues in your own profession', 'warning'); return }
    const level = levelOf(me)!
    commit((previous) => {
      const assessment: Assessment = { ...input, id: nextNumber(previous.assessments.map((item) => item.id), 'AS', 1), at: new Date().toISOString(), assessor: me.name, assessorLevel: level.id, profession: professionOf(trainee)! }
      return { next: { ...previous, assessments: [assessment, ...previous.assessments] }, actor: me.name, action: `assessed ${trainee.name} (${input.tool})`, department: trainee.department }
    })
    notify(`Assessment of ${trainee.name} saved`)
  }, [commit, meAsStaff, notify])

  /** The trainee reads and accepts an assessment, with an optional reflection. */
  const acknowledgeAssessment = useCallback((id: string, comment: string) => {
    const me = meAsStaff()
    commit((previous) => {
      const assessment = previous.assessments.find((item) => item.id === id)
      if (!assessment || !me || assessment.traineeId !== me.id) return null
      return { next: { ...previous, assessments: previous.assessments.map((item) => item.id === id ? { ...item, acknowledgedAt: new Date().toISOString(), ...(comment.trim() ? { traineeComment: comment.trim() } : {}) } : item) }, actor: me.name, action: `acknowledged assessment ${id}`, department: me.department }
    })
    notify('Assessment acknowledged')
  }, [commit, meAsStaff, notify])

  /** Quick-unlock secret: people set their own; the administrator can only clear one (the person then sets a new one). */
  const setUnlock = useCallback((staffId: string, secret: UnlockSecret | null) => {
    const me = stateRef.current.staff.find((item) => item.roleId === currentRole)
    const member = stateRef.current.staff.find((item) => item.id === staffId)
    if (!member) return
    const self = me?.id === staffId
    if (!(self && secret) && !(secret === null && (self || can('manage')))) { notify('Only the person can set their own unlock secret', 'warning'); return }
    setState((previous) => ({ ...previous, staff: previous.staff.map((item) => item.id === staffId ? (secret ? { ...item, unlock: secret } : (({ unlock: _removed, ...rest }) => rest)(item)) : item) }))
    logSecurity(secret ? 'unlock-set' : 'unlock-reset', secret ? `${member.name} set a ${secret.method === 'PIN' ? 'PIN' : secret.method === 'Phone digits' ? 'phone-digit code' : 'passphrase'} for quick unlock` : `${member.name}'s quick unlock was cleared`)
    notify(secret ? 'Quick unlock saved' : 'Quick unlock cleared')
  }, [can, currentRole, logSecurity, notify])

  /** Administrator changes the facility's security policy (logged in the security log). */
  const saveSecurity = useCallback((settings: SecuritySettings) => {
    if (!can('manage')) { notify('Only the administrator changes security settings', 'warning'); return }
    setState((previous) => ({ ...previous, settings: { ...previous.settings, security: settings } }))
    logSecurity('settings', `Idle lock ${settings.idleMinutes} min · session ${settings.sessionHours} h · lock after ${settings.maxAttempts} failed sign-ins · re-authenticate for exports ${settings.stepUpExports ? 'on' : 'off'}, emergency access ${settings.stepUpBreakGlass ? 'on' : 'off'}`)
    notify('Security settings saved')
  }, [can, logSecurity, notify])

  /** Every file exported from the app is recorded in the security log, and exports carry the user's name. */
  useEffect(() => {
    setExportAudit(currentRole ? (file) => logSecurity('export', `Exported ${file}`) : null, currentRole ? roleProfiles[currentRole].name : '')
  }, [currentRole, logSecurity])

  /** Sessions end after the configured number of hours, whatever the activity. */
  useEffect(() => {
    if (!currentRole) return
    const hours = state.settings.security?.sessionHours ?? DEFAULT_SECURITY.sessionHours
    const check = () => {
      const started = sessionStartedAt()
      if (started && Date.now() - started > hours * 3_600_000) {
        logSecurity('session-expired', `Session ended after ${hours} hours`)
        logout()
        notify('Your session has expired. Please sign in again.', 'warning')
      }
    }
    check()
    const timer = window.setInterval(check, 60_000)
    return () => window.clearInterval(timer)
  }, [currentRole, state.settings.security?.sessionHours, logSecurity, logout, notify])

  /** Super admin: change a client's status, modules or discount. This facility's settings follow its own record. */
  const updateTenant = useCallback((id: string, changes: Partial<Pick<Tenant, 'status' | 'offModules' | 'discount'>>, what: string) => {
    if (!can('pricing')) { notify('Only the super admin manages clients', 'warning'); return }
    commit((previous) => {
      const tenant = previous.tenants.find((item) => item.id === id)
      if (!tenant) return null
      const tenants = previous.tenants.map((item) => item.id === id ? { ...item, ...changes } : item)
      const settings = tenant.live ? { ...previous.settings, ...(changes.offModules ? { offModules: changes.offModules } : {}), ...(changes.status ? { subscription: changes.status } : {}) } : previous.settings
      return { next: { ...previous, tenants, settings }, actor: 'Northstar Cloud', action: `${what} for ${tenant.live ? previous.settings.name : tenant.name}`, department: 'emergency' }
    })
    notify(what.charAt(0).toUpperCase() + what.slice(1))
  }, [can, commit, notify])

  /** Client administrator asks to connect to a network member. */
  const requestConnection = useCallback((facilityId: string, services: NetworkService[], note: string) => {
    if (!can('manage')) { notify('Only the administrator manages connections', 'warning'); return }
    const actor = actorName('Administrator')
    commit((previous) => {
      const facility = previous.network.find((item) => item.id === facilityId)
      if (!facility) return null
      const existing = previous.connections.find((item) => item.facilityId === facilityId)
      const connection: Connection = { id: existing?.id ?? nextNumber(previous.connections.map((item) => item.id), 'CX', 1), facilityId, services, status: 'Requested', requestedAt: new Date().toISOString(), requestedBy: actor, ...(note.trim() ? { note: note.trim() } : {}) }
      return { next: { ...previous, connections: existing ? previous.connections.map((item) => item.id === existing.id ? connection : item) : [...previous.connections, connection] }, actor, action: `requested a connection to ${facility.name} (${services.join(', ')})`, department: 'emergency' }
    })
    notify('Connection requested. The platform team will approve it.')
  }, [actorName, can, commit, notify])

  /** Super admin approves or declines; the client administrator can pause, resume or disconnect. */
  const setConnectionStatus = useCallback((id: string, status: ConnectionStatus | 'Removed') => {
    const deciding = status === 'Active' || status === 'Declined'
    const pending = stateRef.current.connections.find((item) => item.id === id)?.status === 'Requested'
    if (deciding && pending ? !can('pricing') : !(can('manage') || can('pricing'))) { notify(deciding ? 'Connections are approved by the platform team' : 'Only the administrator manages connections', 'warning'); return }
    const actor = can('pricing') ? 'Northstar Cloud' : actorName('Administrator')
    commit((previous) => {
      const connection = previous.connections.find((item) => item.id === id)
      const facility = previous.network.find((item) => item.id === connection?.facilityId)
      if (!connection || !facility) return null
      const connections = status === 'Removed' ? previous.connections.filter((item) => item.id !== id) : previous.connections.map((item) => item.id === id ? { ...item, status, decidedAt: new Date().toISOString(), decidedBy: actor } : item)
      const verb = { Active: connection.status === 'Paused' ? 'resumed' : 'approved', Declined: 'declined', Paused: 'paused', Requested: 'requested', Removed: 'removed' }[status]
      return { next: { ...previous, connections }, actor, action: `${verb} the connection to ${facility.name}`, department: 'emergency' }
    })
    notify(status === 'Removed' ? 'Connection removed' : `Connection ${status.toLowerCase()}`)
  }, [actorName, can, commit, notify])

  /** Super admin adds or edits a network member. */
  const saveNetworkFacility = useCallback((facility: NetworkFacility) => {
    if (!can('pricing')) { notify('Only the super admin edits the network', 'warning'); return }
    commit((previous) => {
      const exists = previous.network.some((item) => item.id === facility.id)
      return { next: { ...previous, network: exists ? previous.network.map((item) => item.id === facility.id ? facility : item) : [...previous.network, facility] }, actor: 'Northstar Cloud', action: `${exists ? 'updated' : 'added'} ${facility.name} on the care network`, department: 'emergency' }
    })
    notify('Network updated')
  }, [can, commit, notify])

  /** Refer a patient to another hospital on the network. */
  const referOut = useCallback((patientId: string, facilityId: string, reason: string, urgency: Priority, shared: string[]) => {
    if (denied(['refer'], 'refer patients to another hospital')) return
    const actor = actorName('Clinical team')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      const facility = previous.network.find((item) => item.id === facilityId)
      if (!patient || !facility) return null
      const referral: ExternalReferral = { id: nextNumber(previous.externalReferrals.map((item) => item.id), 'XR', 100), patientId, facilityId, reason: reason.trim(), urgency, status: 'Sent', at: new Date().toISOString(), by: actor, shared }
      return {
        next: { ...previous, externalReferrals: [referral, ...previous.externalReferrals], patients: withTimeline(previous.patients, patientId, { type: 'referral', title: `Referred to ${facility.name}`, detail: `${urgency} · ${reason.trim()} Shared: ${shared.join(', ')}.`, author: actor, department: patient.department }) },
        actor, action: `referred ${patient.name} to ${facility.name}`, department: patient.department, patientId,
      }
    })
    notify('Referral sent through the network')
  }, [actorName, commit, denied, notify])

  const updateExternalReferral = useCallback((id: string, status: ExternalReferralStatus, response: string) => {
    if (denied(['refer'], 'update referrals')) return
    const actor = actorName('Clinical team')
    commit((previous) => {
      const referral = previous.externalReferrals.find((item) => item.id === id)
      const facility = previous.network.find((item) => item.id === referral?.facilityId)
      if (!referral || !facility) return null
      return {
        next: { ...previous, externalReferrals: previous.externalReferrals.map((item) => item.id === id ? { ...item, status, ...(response.trim() ? { response: response.trim() } : {}) } : item), patients: withTimeline(previous.patients, referral.patientId, { type: 'referral', title: `${facility.name}: referral ${status.toLowerCase()}`, detail: response.trim() || `Marked ${status.toLowerCase()} by ${actor}.`, author: actor, department: 'emergency' }) },
        actor, action: `marked the referral to ${facility.name} ${status.toLowerCase()}`, department: 'emergency', patientId: referral.patientId,
      }
    })
  }, [actorName, commit, denied, notify])

  /** The SaaS provider's price list. */
  const savePricing = useCallback((pricing: PriceList) => {
    if (!can('pricing')) { notify('Only the platform provider sets prices', 'warning'); return }
    commit((previous) => ({ next: { ...previous, pricing }, actor: 'Northstar Cloud', action: 'updated the price list', department: 'emergency' }))
    notify('Price list saved')
  }, [can, commit, notify])

  const saveDepartment = useCallback((department: Department) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const exists = previous.departments.some((item) => item.id === department.id)
      return { next: { ...previous, departments: exists ? previous.departments.map((item) => item.id === department.id ? department : item) : [...previous.departments, department] }, actor, action: `${exists ? 'updated' : 'added'} the ${department.name} department`, department: department.id }
    })
    notify('Department saved')
  }, [actorName, commit, notify])

  const removeDepartment = useCallback((id: DepartmentId) => {
    const actor = actorName('Administrator')
    const current = stateRef.current
    const inUse = current.patients.some((patient) => patient.department === id && patient.status !== 'discharged') || current.staff.some((member) => member.department === id) || current.wards.some((ward) => ward.department === id)
    commit((previous) => {
      const department = previous.departments.find((item) => item.id === id)
      if (!department) return null
      return inUse
        ? { next: { ...previous, departments: previous.departments.map((item) => item.id === id ? { ...item, active: false } : item) }, actor, action: `deactivated the ${department.name} department`, department: id }
        : { next: { ...previous, departments: previous.departments.filter((item) => item.id !== id) }, actor, action: `removed the ${department.name} department`, department: id }
    })
    notify(inUse ? 'Department has patients, staff or wards, so it was deactivated instead of removed' : 'Department removed', inUse ? 'warning' : 'info')
  }, [actorName, commit, notify])

  /** The administrator, or the laboratory / imaging head for their own catalogue. */
  const canEditCatalogue = useCallback((kind: InvestigationItem['kind']) => can('manage') || can(kind === 'Imaging' ? 'imaging-catalogue' : 'lab-catalogue'), [can])

  const saveInvestigation = useCallback((item: InvestigationItem) => {
    if (!canEditCatalogue(item.kind)) { notify(`Only the administrator or the ${item.kind === 'Imaging' ? 'head of imaging' : 'laboratory head'} can change this catalogue`, 'warning'); return }
    const actor = actorName('Administrator')
    commit((previous) => {
      const exists = previous.investigations.some((candidate) => candidate.id === item.id)
      return { next: { ...previous, investigations: exists ? previous.investigations.map((candidate) => candidate.id === item.id ? item : candidate) : [...previous.investigations, item] }, actor, action: `${exists ? 'updated' : 'added'} investigation ${item.name}`, department: item.kind === 'Imaging' ? 'radiology' : 'laboratory' }
    })
  }, [actorName, commit, canEditCatalogue, notify])

  const removeInvestigation = useCallback((id: string) => {
    const actor = actorName('Administrator')
    const target = stateRef.current.investigations.find((candidate) => candidate.id === id)
    if (target && !canEditCatalogue(target.kind)) { notify('You cannot change this catalogue', 'warning'); return }
    commit((previous) => {
      const item = previous.investigations.find((candidate) => candidate.id === id)
      if (!item) return null
      return { next: { ...previous, investigations: previous.investigations.filter((candidate) => candidate.id !== id) }, actor, action: `removed investigation ${item.name}`, department: item.kind === 'Imaging' ? 'radiology' : 'laboratory' }
    })
    notify('Investigation removed', 'info')
  }, [actorName, commit, notify, canEditCatalogue])

  const saveProvider = useCallback((provider: ExternalProvider) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const exists = previous.providers.some((item) => item.id === provider.id)
      return { next: { ...previous, providers: exists ? previous.providers.map((item) => item.id === provider.id ? provider : item) : [...previous.providers, provider] }, actor, action: `${exists ? 'updated' : 'added'} external provider ${provider.name}`, department: 'laboratory' }
    })
    notify('Provider saved')
  }, [actorName, commit, notify])

  const removeProvider = useCallback((id: string) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const provider = previous.providers.find((item) => item.id === id)
      if (!provider) return null
      const used = previous.orders.some((order) => order.externalProviderId === id)
      return used
        ? { next: { ...previous, providers: previous.providers.map((item) => item.id === id ? { ...item, active: false } : item) }, actor, action: `deactivated external provider ${provider.name}`, department: 'laboratory' }
        : { next: { ...previous, providers: previous.providers.filter((item) => item.id !== id) }, actor, action: `removed external provider ${provider.name}`, department: 'laboratory' }
    })
    notify('Provider updated', 'info')
  }, [actorName, commit, notify])

  const requestAccess = useCallback((input: { name: string; roleId: RoleId; department: DepartmentId; specialty: string; email: string; grade?: Grade; residentYear?: number; level?: string; unlock?: UnlockSecret }) => {
    commit((previous) => {
      const id = nextNumber(previous.staff.map((item) => item.id), 'ST', 0).replace(/ST-(\d)$/, 'ST-0$1')
      const title = input.grade ? gradeLabel(input.grade, input.residentYear) : input.level ?? roleProfiles[input.roleId].title
      const member: StaffMember = { id, name: input.name.trim(), roleId: input.roleId, role: title, ...(input.grade ? { grade: input.grade, ...(input.residentYear ? { residentYear: input.residentYear } : {}) } : {}), ...(input.level ? { level: input.level } : {}), ...(input.unlock ? { unlock: input.unlock } : {}), department: input.department, specialty: input.specialty.trim() || title, shift: 'Day · 07:00–15:00', onDuty: false, pager: '—', email: input.email.trim(), phone: '—', license: 'Not yet verified', status: 'Pending approval' }
      return { next: { ...previous, staff: [...previous.staff, member] }, actor: member.name, action: `requested a ${title.toLowerCase()} account`, department: input.department }
    })
    notify('Request sent — an administrator will review it', 'info')
  }, [commit, notify])

  const approveStaff = useCallback((id: string) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === id)
      if (!member) return null
      return { next: { ...previous, staff: previous.staff.map((item) => item.id === id ? { ...item, status: 'Active', pager: item.pager === '—' ? `PG-${String(4100 + previous.staff.length)}` : item.pager } : item) }, actor, action: `approved the account of ${member.name}`, department: member.department }
    })
    notify('Account approved')
  }, [actorName, commit, notify])

  const assignPosition = useCallback((staffId: string, position: PositionId, until?: string, note?: string) => {
    const actor = actorName('Administrator')
    if (!can('manage')) { notify('Only the administrator can assign positions', 'warning'); return }
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === staffId)
      const def = positionById(position)
      if (!member || !def) return null
      const assignment: PositionAssignment = { id: position, since: new Date().toISOString(), by: actor, ...(until ? { until } : {}), ...(note ? { note } : {}) }
      return { next: { ...previous, staff: previous.staff.map((item) => item.id === staffId ? { ...item, positions: [...(item.positions ?? []).filter((p) => p.id !== position), assignment] } : item) }, actor, action: `appointed ${member.name} as ${def.title}${until ? ` until ${until}` : ''} (${def.privileges.join(', ')})`, department: member.department }
    })
    notify('Position assigned')
  }, [actorName, can, commit, notify])

  const removePosition = useCallback((staffId: string, position: PositionId) => {
    const actor = actorName('Administrator')
    if (!can('manage')) return
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === staffId)
      if (!member) return null
      return { next: { ...previous, staff: previous.staff.map((item) => item.id === staffId ? { ...item, positions: (item.positions ?? []).filter((p) => p.id !== position) } : item) }, actor, action: `removed ${member.name} from ${positionById(position)?.title ?? position}`, department: member.department }
    })
    notify('Position removed', 'info')
  }, [actorName, can, commit, notify])

  const setStaffPermissions = useCallback((id: string, list: Permission[]) => {
    const actor = actorName('Administrator')
    commit((previous) => {
      const member = previous.staff.find((item) => item.id === id)
      if (!member) return null
      return { next: { ...previous, staff: previous.staff.map((item) => item.id === id ? { ...item, permissions: list } : item) }, actor, action: `changed the access of ${member.name}`, department: member.department }
    })
  }, [actorName, commit])

  const saveFormularyItem = useCallback((item: FormularyItem) => {
    const actor = actorName('Pharmacy team')
    if (!can('formulary-edit')) { notify('You need the “edit medicines and prices” privilege for this', 'warning'); return }
    commit((previous) => {
      const exists = previous.formulary.some((candidate) => candidate.id === item.id)
      return { next: { ...previous, formulary: exists ? previous.formulary.map((candidate) => candidate.id === item.id ? item : candidate) : [...previous.formulary, item] }, actor, action: `${exists ? 'updated' : 'added'} ${item.name} in the formulary`, department: 'pharmacy' }
    })
    notify('Medicine saved')
  }, [actorName, can, commit, notify])

  const receiveStock = useCallback((medicationId: string, input: { quantity: number; batch: string; expiry: string; supplier: string }) => {
    const actor = actorName('Pharmacy team')
    if (!can('stock-receive')) { notify('You need the “receive stock” privilege for this', 'warning'); return }
    commit((previous) => {
      const med = previous.formulary.find((item) => item.id === medicationId)
      if (!med || input.quantity <= 0) return null
      return {
        next: { ...previous, formulary: previous.formulary.map((item) => item.id === medicationId ? { ...item, stock: item.stock + input.quantity, batch: input.batch || item.batch, expiry: input.expiry || item.expiry, supplier: input.supplier || item.supplier } : item), stockMovements: [{ id: makeId('SM'), medicationId, at: new Date().toISOString(), by: actor, type: 'Received' as const, quantity: input.quantity, note: [input.batch && `Batch ${input.batch}`, input.expiry && `exp ${input.expiry}`, input.supplier].filter(Boolean).join(' · ') }, ...previous.stockMovements].slice(0, 300) },
        actor, action: `received ${input.quantity} ${med.unit} of ${med.name}`, department: 'pharmacy',
      }
    })
    notify('Stock received')
  }, [actorName, can, commit, notify])

  const writeOffStock = useCallback((medicationId: string, quantity: number, reason: string) => {
    const actor = actorName('Pharmacy team')
    if (!can('stock-adjust')) { notify('You need the “write off and adjust stock” privilege for this', 'warning'); return }
    commit((previous) => {
      const med = previous.formulary.find((item) => item.id === medicationId)
      if (!med || quantity <= 0) return null
      const amount = Math.min(quantity, med.stock)
      return {
        next: { ...previous, formulary: previous.formulary.map((item) => item.id === medicationId ? { ...item, stock: item.stock - amount } : item), stockMovements: [{ id: makeId('SM'), medicationId, at: new Date().toISOString(), by: actor, type: 'Written off' as const, quantity: -amount, note: reason }, ...previous.stockMovements].slice(0, 300) },
        actor, action: `wrote off ${amount} ${med.unit} of ${med.name} (${reason})`, department: 'pharmacy',
      }
    })
    notify('Stock written off', 'info')
  }, [actorName, can, commit, notify])

  const resetDemo = useCallback(() => {
    // The security log is never reset: restoring the demo keeps the audit trail.
    setState((previous) => ({ ...createInitialState(), securityEvents: previous.securityEvents }))
    setSelectedPatientId(null)
    notify('Demo data restored', 'info')
  }, [notify])

  const deptProfile = useMemo<RoleProfile | null>(() => {
    if (!currentRole) return null
    const base = roleProfiles[currentRole]
    const departmentId = currentDepartment ?? base.department
    if (departmentId === base.department) return base
    const department = state.departments.find((item) => item.id === departmentId)
    if (!department) return base
    const specialtyProfile = { ...base, department: departmentId }
    if (currentRole === 'physician') return { ...specialtyProfile, title: `${department.shortName} Physician`, workspace: `${department.shortName} clinical command`, headline: `Your ${/^[A-Z./]+$/.test(department.shortName) ? department.shortName : department.shortName.toLowerCase()} patients, first.`, description: `Specialty-specific inpatient and outpatient review, diagnostics and referrals for ${department.name}.` }
    if (currentRole === 'nurse') return { ...specialtyProfile, title: `${department.shortName} Nurse`, workspace: `${department.shortName} nursing workspace`, headline: `Safe, coordinated ${/^[A-Z./]+$/.test(department.shortName) ? department.shortName : department.shortName.toLowerCase()} care.`, description: `A focused nursing census with inpatient observations, outpatient flow and shared handoffs across ${department.name}.` }
    return specialtyProfile
  }, [currentRole, currentDepartment, state.departments])

  /** Doctors carry their grade in the title (e.g. "Resident (R2) · Emergency"). */
  const profile = useMemo<RoleProfile | null>(() => {
    if (deptProfile && myLevel) {
      const department = state.departments.find((item) => item.id === deptProfile.department)
      return { ...deptProfile, title: `${myLevel}${department ? ` · ${department.shortName}` : ''}`, shortTitle: myLevel }
    }
    if (!deptProfile || !myGrade) return deptProfile
    const department = state.departments.find((item) => item.id === deptProfile.department)
    const label = gradeLabel(myGrade.grade, myGrade.year)
    return { ...deptProfile, title: `${label}${department ? ` · ${department.shortName}` : ''}`, shortTitle: myGrade.grade === 'Resident' ? `R${myGrade.year ?? 1} Resident` : gradeById(myGrade.grade)!.short }
  }, [deptProfile, myGrade, myLevel, state.departments])

  const viewerDepartment = currentDepartment ?? (currentRole ? roleProfiles[currentRole].department : undefined)
  const scoped = Boolean(currentRole && SCOPED_ROLES.includes(currentRole))
  const viewerName = currentRole ? roleProfiles[currentRole].name : ''
  const canTriage = can('triage')
  const visibleIds = useMemo(() => {
    if (!scoped) return null
    const viewer = { role: currentRole, department: viewerDepartment, name: viewerName, canTriage, grants: state.accessGrants ?? [], departments: state.departments }
    return new Set(state.patients.filter((patient) => canSeePatient(patient, viewer, state.referrals, state.theatreCases)).map((patient) => patient.id))
  }, [scoped, currentRole, viewerDepartment, viewerName, canTriage, state.patients, state.referrals, state.theatreCases, state.accessGrants, state.departments])

  /** What the screens see: for department-scoped clinicians, only their patients and the records attached to them. */
  const scopedState = useMemo<HospitalState>(() => {
    if (!visibleIds) return state
    const seen = (id?: string) => !id || visibleIds.has(id)
    return {
      ...state,
      patients: state.patients.filter((patient) => visibleIds.has(patient.id)),
      orders: state.orders.filter((item) => seen(item.patientId)),
      referrals: state.referrals.filter((item) => seen(item.patientId)),
      prescriptions: state.prescriptions.filter((item) => seen(item.patientId)),
      appointments: state.appointments.filter((item) => seen(item.patientId)),
      invoices: state.invoices.filter((item) => seen(item.patientId)),
      handovers: state.handovers.filter((item) => seen(item.patientId)),
      cosignNotes: state.cosignNotes.filter((item) => seen(item.patientId)),
      theatreCases: state.theatreCases.filter((item) => seen(item.patientId)),
      activities: state.activities.filter((item) => seen(item.patientId)),
    }
  }, [state, visibleIds])

  const outsidePatients = useMemo(() => visibleIds ? state.patients.filter((patient) => !visibleIds.has(patient.id) && patient.status !== 'discharged').map((patient) => ({ id: patient.id, name: patient.name, mrn: patient.mrn, age: patient.age, department: patient.department, location: patient.location })) : [], [state.patients, visibleIds])

  const guardedSelect = useCallback((id: string | null) => {
    if (id && visibleIds && !visibleIds.has(id)) { notify('This patient is not under your department. Use emergency access on the Patients page if you need the record.', 'warning'); return }
    setSelectedPatientId(id)
  }, [visibleIds, notify])

  const breakGlass = useCallback((patientId: string, reason: string) => {
    if (!currentRole || !viewerDepartment) return
    logSecurity('break-glass', `Emergency access to ${stateRef.current.patients.find((item) => item.id === patientId)?.mrn ?? patientId}: ${reason}`)
    const actor = actorName('Clinician')
    const at = new Date().toISOString()
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const grant: AccessGrant = { id: makeId('AG'), patientId, role: currentRole, department: viewerDepartment, by: actor, at, until: new Date(Date.now() + BREAK_GLASS_HOURS * 3_600_000).toISOString(), reason }
      return {
        next: { ...previous, accessGrants: [grant, ...(previous.accessGrants ?? [])].slice(0, 500), patients: withTimeline(previous.patients, patientId, { type: 'note', title: 'Emergency access to the record', detail: `${actor} (${unitName(viewerDepartment)}) opened the record outside their department for ${BREAK_GLASS_HOURS} hours. Reason: ${reason}`, author: actor, department: viewerDepartment }) },
        actor, action: `used emergency access to ${patient.name}'s record (${reason})`, department: viewerDepartment, patientId,
      }
    })
    notify(`Emergency access granted for ${BREAK_GLASS_HOURS} hours — recorded in the audit log`, 'warning')
    setTimeout(() => setSelectedPatientId(patientId), 0)
  }, [actorName, commit, currentRole, notify, viewerDepartment, logSecurity])

  const linkDepartment = useCallback((patientId: string, department: DepartmentId, reason: 'Comorbidity' | 'Shared care', note: string) => {
    const actor = actorName('Clinician')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      const links = [...(patient.links ?? []).filter((link) => link.department !== department), { department, reason, note, by: actor, at: new Date().toISOString() }]
      return { next: { ...previous, patients: withTimeline(previous.patients, patientId, { type: 'note', title: `${unitName(department)} added to the care team`, detail: `${reason}: ${note}`, author: actor, department }, { links }) }, actor, action: `linked ${patient.name} to ${unitName(department)} (${reason.toLowerCase()})`, department, patientId }
    })
    notify(`${unitName(department)} can now see this patient`)
  }, [actorName, commit, notify])

  const unlinkDepartment = useCallback((patientId: string, department: DepartmentId) => {
    const actor = actorName('Clinician')
    commit((previous) => {
      const patient = previous.patients.find((item) => item.id === patientId)
      if (!patient) return null
      return { next: { ...previous, patients: previous.patients.map((item) => item.id === patientId ? { ...item, links: (item.links ?? []).filter((link) => link.department !== department) } : item) }, actor, action: `removed ${unitName(department)} from ${patient.name}'s care team`, department, patientId }
    })
  }, [actorName, commit])

  const value = useMemo<HospitalContextValue>(() => ({
    state: scopedState, currentRole, profile, grade: myGrade, level: myLevel, myRank, selectedPatientId, toasts, scoped, outsidePatients, breakGlass, linkDepartment, unlinkDepartment,
    login, logout, can, setSelectedPatientId: currentRole === 'administrator' || currentRole === 'provider' ? noPatientAccess : guardedSelect,
    addTriage, retriage, addReferral, updateReferral, addOrder, updateOrder, transferPatient, addNote, dischargePatient,
    createPrescription, setPrescriptionStatus, collectPrescription, sendErx, setInvoiceStatus, scheduleAppointment, startTeleconsult, recordTeleConsent, finishTeleconsult, portalRegister, requestVideoVisit, cancelVideoVisit, updateIntake, rateVisit, setVisitPharmacy, claimOnDemand, sendVisitReminder, openThread, sendTestSms, patientMessage, replyThread, setAppointmentStatus, setStaffDuty, activateCode, standDownCode,
    recordObservations, saveRound, reviewRound, addChartEntry, attachImages, removeImage, saveAssessment, rejectSpecimen, escalatePatient, advanceOrder, setBedState, addHandover, acknowledgeHandover, registerPatient, receptionCheckIn, settleAtReception, opdCall, opdFinish, completeTriage, sendPage, acknowledgePage,
    advanceTheatreCase, toggleChecklist, saveAnaesthesia, logAnaesthesia, cosignNote, saveEvaluation, dischargeWithSummary, recordGrowth, recordPayment, generateInvoice, restock, createStaff, setStaffSuspended, setDepartmentServices, myStaffId,
    signInBlock, logSecurity, saveSecurity, setUnlock, updateSettings, setModules, savePricing, meAsStaff, addAssessment, acknowledgeAssessment, submitApplication, reviewApplication, payPlatformInvoice, confirmPlatformPayment, saveService, requestService, decideService, updateTenant, requestConnection, setConnectionStatus, saveNetworkFacility, referOut, updateExternalReferral, saveDepartment, removeDepartment, saveInvestigation, canEditCatalogue, removeInvestigation, saveProvider, removeProvider, requestAccess, approveStaff, assignPosition, removePosition, setStaffPermissions, saveFormularyItem, receiveStock, writeOffStock,
    resetDemo, notify, dismissToast,
  }), [recordObservations, saveRound, reviewRound, addChartEntry, attachImages, removeImage, attachImages, removeImage, saveAssessment, rejectSpecimen, escalatePatient, advanceOrder, setBedState, addHandover, acknowledgeHandover, registerPatient, receptionCheckIn, settleAtReception, opdCall, opdFinish, completeTriage, sendPage, acknowledgePage, advanceTheatreCase, toggleChecklist, saveAnaesthesia, logAnaesthesia, cosignNote, saveEvaluation, dischargeWithSummary, recordGrowth, recordPayment, generateInvoice, restock, createStaff, setStaffSuspended, setDepartmentServices, myStaffId, signInBlock, logSecurity, saveSecurity, updateSettings, setModules, savePricing, meAsStaff, addAssessment, acknowledgeAssessment, submitApplication, reviewApplication, payPlatformInvoice, confirmPlatformPayment, saveService, requestService, decideService, updateTenant, requestConnection, setConnectionStatus, saveNetworkFacility, referOut, updateExternalReferral, saveDepartment, removeDepartment, saveInvestigation, canEditCatalogue, removeInvestigation, saveProvider, removeProvider, requestAccess, approveStaff, assignPosition, removePosition, setStaffPermissions, saveFormularyItem, receiveStock, writeOffStock, scopedState, scoped, outsidePatients, breakGlass, linkDepartment, unlinkDepartment, guardedSelect, currentRole, profile, myGrade, myLevel, myRank, selectedPatientId, toasts, login, logout, can, addTriage, retriage, addReferral, updateReferral, addOrder, updateOrder, transferPatient, addNote, dischargePatient, createPrescription, setPrescriptionStatus, collectPrescription, sendErx, collectPrescription, sendErx, setInvoiceStatus, scheduleAppointment, startTeleconsult, recordTeleConsent, finishTeleconsult, portalRegister, requestVideoVisit, cancelVideoVisit, updateIntake, rateVisit, setVisitPharmacy, claimOnDemand, sendVisitReminder, openThread, sendTestSms, patientMessage, replyThread, setAppointmentStatus, setStaffDuty, activateCode, standDownCode, resetDemo, notify, dismissToast])

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>
}

export function useHospital() {
  const context = useContext(HospitalContext)
  if (!context) throw new Error('useHospital must be used within HospitalProvider')
  return context
}
