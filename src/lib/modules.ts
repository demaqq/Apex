import type { FacilitySettings, HospitalState, ModuleId, PriceList, RoleId } from '../types'

export interface ModuleDef {
  id: ModuleId
  name: string
  group: 'Front office' | 'Clinical care' | 'Diagnostics' | 'Services' | 'Operations'
  description: string
  /** Pages the module adds. */
  routes: string[]
  /** Sign-in accounts that only make sense with this module. */
  roles?: RoleId[]
  /** Other modules this one needs. */
  requires?: ModuleId[]
}

/** Every part of the product a client can switch on or off. Patient records, staff, audit and administration are the always-on platform. */
export const MODULES: ModuleDef[] = [
  { id: 'reception', name: 'Reception & cashier', group: 'Front office', description: 'Check-in, queue numbers and payment before triage, clinics, tests and admission.', routes: ['/front-desk'], roles: ['receptionist'] },
  { id: 'appointments', name: 'Appointments & telehealth', group: 'Front office', description: 'Clinic booking, follow-up visits and video consultations.', routes: ['/telehealth'] },
  { id: 'billing', name: 'Billing & insurance claims', group: 'Front office', description: 'Episode invoices, payments and insurer claims.', routes: ['/billing'], roles: ['billing'] },
  { id: 'triage', name: 'Emergency & triage', group: 'Clinical care', description: 'ESI triage, waiting room and emergency department board.', routes: ['/triage'] },
  { id: 'opd', name: 'Outpatient clinics (OPD)', group: 'Clinical care', description: 'Clinic queues for every department, called from reception.', routes: ['/opd'], requires: ['reception'] },
  { id: 'wards', name: 'Inpatient wards', group: 'Clinical care', description: 'Bed board, shift handover and medication rounds.', routes: ['/beds', '/handover', '/med-round'] },
  { id: 'specialty', name: 'Specialty charts & dashboards', group: 'Clinical care', description: 'Partograph, SAM, neuro, ANC, oncology and other department charts.', routes: ['/specialty'] },
  { id: 'review', name: 'Supervision & co-signing', group: 'Clinical care', description: 'Intern and resident notes reviewed by seniors.', routes: ['/review'] },
  { id: 'network', name: 'Care network & referrals', group: 'Clinical care', description: 'Interdepartmental referrals, consults and live department capacity.', routes: ['/network', '/departments'] },
  { id: 'laboratory', name: 'Laboratory', group: 'Diagnostics', description: 'Specimen worklist, results and verification, test catalogue.', routes: ['/lab'], roles: ['laboratory'] },
  { id: 'imaging', name: 'Imaging & radiology', group: 'Diagnostics', description: 'X-ray, ultrasound, CT, MRI and more: worklist, images and reports.', routes: ['/imaging'], roles: ['diagnostics', 'radiographer'] },
  { id: 'pharmacy', name: 'Pharmacy & stock', group: 'Services', description: 'Verification, dispensing, e-prescription pickup and inventory.', routes: ['/pharmacy'], roles: ['pharmacist'] },
  { id: 'theatres', name: 'Operating theatres', group: 'Services', description: 'Theatre lists, safety checklist and anaesthesia records.', routes: ['/theatres'], roles: ['theatre'] },
  { id: 'services', name: 'Therapy & blood bank', group: 'Services', description: 'Physiotherapy, nutrition and blood bank worklists.', routes: ['/services'], roles: ['allied'] },
  { id: 'operations', name: 'Operations centre', group: 'Operations', description: 'Live hospital command view for managers and coordinators.', routes: ['/ops'] },
]

export const MODULE_GROUPS = ['Front office', 'Clinical care', 'Diagnostics', 'Services', 'Operations'] as const

export const moduleById = (id: ModuleId) => MODULES.find((item) => item.id === id)!

export const isOn = (settings: Pick<FacilitySettings, 'offModules'>, id: ModuleId) => !(settings.offModules ?? []).includes(id)

/** Pages hidden because their module is off (plus any switched off the old way). */
export function disabledRoutes(settings: Pick<FacilitySettings, 'offModules' | 'disabledModules'>) {
  return [...(settings.disabledModules ?? []), ...MODULES.filter((item) => !isOn(settings, item.id)).flatMap((item) => item.routes)]
}

/** The module a role needs to sign in, if any. */
export const moduleForRole = (role: RoleId) => MODULES.find((item) => item.roles?.includes(role))

/** Modules that must stay on because another switched-on module needs them, or because patients need a way in. */
export function lockedOn(settings: Pick<FacilitySettings, 'offModules'>): Partial<Record<ModuleId, string>> {
  const locks: Partial<Record<ModuleId, string>> = {}
  MODULES.filter((item) => isOn(settings, item.id)).forEach((item) => item.requires?.forEach((needed) => { locks[needed] = `Needed by ${item.name}` }))
  const entry: ModuleId[] = ['reception', 'triage']
  const onEntry = entry.filter((id) => isOn(settings, id))
  if (onEntry.length === 1) locks[onEntry[0]] = locks[onEntry[0]] ?? 'Patients need a way in: keep reception or triage'
  return locks
}

/** Switching a module on also switches on what it needs. */
export function withRequirements(off: ModuleId[], turnOn: ModuleId): ModuleId[] {
  const needed = new Set<ModuleId>([turnOn, ...(moduleById(turnOn).requires ?? [])])
  return off.filter((id) => !needed.has(id))
}

export const DEFAULT_PRICES: PriceList = {
  currency: 'USD',
  platform: 150,
  modules: { reception: 60, appointments: 40, billing: 50, triage: 60, opd: 50, wards: 80, specialty: 60, review: 25, network: 30, laboratory: 90, imaging: 110, pharmacy: 80, theatres: 90, services: 40, operations: 30 },
  perDepartment: 15,
  perUser: 4,
  perBed: 2,
  perVisit: 0.4,
  perLabTest: 0.1,
  perImagingStudy: 0.3,
  includedDepartments: 3,
  includedUsers: 10,
}

/** Packages a client can start from. */
export const PACKAGES: Array<{ id: string; name: string; description: string; on: ModuleId[] }> = [
  { id: 'clinic', name: 'Clinic', description: 'Outpatient clinic with reception, lab and pharmacy.', on: ['reception', 'appointments', 'opd', 'laboratory', 'pharmacy', 'billing'] },
  { id: 'hospital', name: 'General hospital', description: 'Emergency, wards, OPD, lab, imaging and pharmacy.', on: ['reception', 'appointments', 'billing', 'triage', 'opd', 'wards', 'network', 'laboratory', 'imaging', 'pharmacy', 'review'] },
  { id: 'referral', name: 'Referral hospital', description: 'Everything, including theatres, specialty charts and operations centre.', on: MODULES.map((item) => item.id) },
]

const DAY = 86_400_000

export interface BillLine { label: string; detail: string; amount: number; kind: 'platform' | 'module' | 'departments' | 'usage' }

/** Usage over the last 30 days and the resulting monthly bill. */
export function estimateBill(state: Pick<HospitalState, 'settings' | 'staff' | 'beds' | 'patients' | 'orders' | 'departments'>, prices: PriceList, now = Date.now()) {
  const since = now - 30 * DAY
  const recent = (at?: string) => Boolean(at) && new Date(at!).getTime() >= since
  const users = state.staff.filter((member) => !member.suspended && member.status !== 'Pending approval').length
  const beds = isOn(state.settings, 'wards') ? state.beds.length : 0
  const visits = state.patients.filter((patient) => recent(patient.arrival)).length
  const labTests = isOn(state.settings, 'laboratory') ? state.orders.filter((order) => order.kind === 'Laboratory' && !order.externalProviderId && recent(order.createdAt)).length : 0
  const imagingStudies = isOn(state.settings, 'imaging') ? state.orders.filter((order) => order.kind === 'Imaging' && !order.externalProviderId && recent(order.createdAt)).length : 0
  const departments = state.departments.filter((department) => department.active !== false && !['laboratory', 'radiology', 'pharmacy'].includes(department.id)).length
  const on = MODULES.filter((item) => isOn(state.settings, item.id))

  const lines: BillLine[] = [
    { label: 'Platform', detail: 'Patient records, staff, roles, audit and administration', amount: prices.platform, kind: 'platform' },
    ...on.map((item) => ({ label: item.name, detail: 'Module', amount: prices.modules[item.id] ?? 0, kind: 'module' as const })),
    { label: 'Clinical departments', detail: `${departments} active · first ${prices.includedDepartments} included`, amount: Math.max(0, departments - prices.includedDepartments) * prices.perDepartment, kind: 'departments' },
    { label: 'Staff accounts', detail: `${users} active · first ${prices.includedUsers} included`, amount: Math.max(0, users - prices.includedUsers) * prices.perUser, kind: 'usage' },
    ...(isOn(state.settings, 'wards') ? [{ label: 'Beds', detail: `${beds} beds`, amount: beds * prices.perBed, kind: 'usage' as const }] : []),
    { label: 'Patient visits', detail: `${visits} in the last 30 days`, amount: visits * prices.perVisit, kind: 'usage' },
    ...(isOn(state.settings, 'laboratory') ? [{ label: 'Laboratory tests', detail: `${labTests} done here in 30 days`, amount: labTests * prices.perLabTest, kind: 'usage' as const }] : []),
    ...(isOn(state.settings, 'imaging') ? [{ label: 'Imaging studies', detail: `${imagingStudies} done here in 30 days`, amount: imagingStudies * prices.perImagingStudy, kind: 'usage' as const }] : []),
  ]
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  return { lines, total, usage: { users, beds, visits, labTests, imagingStudies, departments, modules: on.length } }
}

export const money = (amount: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount)
