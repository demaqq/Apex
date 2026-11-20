import type { FacilitySettings, HospitalState, ModuleId, PriceList, RoleId, Tenant, TenantUsage } from '../types'

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

/** This facility's usage over the last 30 days, counted from its records. */
export function liveUsage(state: Pick<HospitalState, 'settings' | 'staff' | 'beds' | 'patients' | 'orders' | 'departments'>, now = Date.now()): TenantUsage {
  const since = now - 30 * DAY
  const recent = (at?: string) => Boolean(at) && new Date(at!).getTime() >= since
  return {
    users: state.staff.filter((member) => !member.suspended && member.status !== 'Pending approval').length,
    beds: state.beds.length,
    visits: state.patients.filter((patient) => recent(patient.arrival)).length,
    labTests: state.orders.filter((order) => order.kind === 'Laboratory' && !order.externalProviderId && recent(order.createdAt)).length,
    imagingStudies: state.orders.filter((order) => order.kind === 'Imaging' && !order.externalProviderId && recent(order.createdAt)).length,
    departments: state.departments.filter((department) => department.active !== false && !['laboratory', 'radiology', 'pharmacy'].includes(department.id)).length,
  }
}

/** The price follows automatically from the modules that are on, the usage and the super admin's price list. */
export function billFor(usage: TenantUsage, offModules: ModuleId[], prices: PriceList, discount = 0) {
  const on = MODULES.filter((item) => !offModules.includes(item.id))
  const has = (id: ModuleId) => !offModules.includes(id)
  const lines: BillLine[] = [
    { label: 'Platform', detail: 'Patient records, staff, roles, audit and administration', amount: prices.platform, kind: 'platform' },
    ...on.map((item) => ({ label: item.name, detail: 'Module', amount: prices.modules[item.id] ?? 0, kind: 'module' as const })),
    { label: 'Clinical departments', detail: `${usage.departments} active · first ${prices.includedDepartments} included`, amount: Math.max(0, usage.departments - prices.includedDepartments) * prices.perDepartment, kind: 'departments' },
    { label: 'Staff accounts', detail: `${usage.users} active · first ${prices.includedUsers} included`, amount: Math.max(0, usage.users - prices.includedUsers) * prices.perUser, kind: 'usage' },
    ...(has('wards') ? [{ label: 'Beds', detail: `${usage.beds} beds`, amount: usage.beds * prices.perBed, kind: 'usage' as const }] : []),
    { label: 'Patient visits', detail: `${usage.visits} in the last 30 days`, amount: usage.visits * prices.perVisit, kind: 'usage' },
    ...(has('laboratory') ? [{ label: 'Laboratory tests', detail: `${usage.labTests} done here in 30 days`, amount: usage.labTests * prices.perLabTest, kind: 'usage' as const }] : []),
    ...(has('imaging') ? [{ label: 'Imaging studies', detail: `${usage.imagingStudies} done here in 30 days`, amount: usage.imagingStudies * prices.perImagingStudy, kind: 'usage' as const }] : []),
  ]
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const off = Math.round(subtotal * Math.min(100, Math.max(0, discount))) / 100
  if (off > 0) lines.push({ label: 'Discount', detail: `${discount}% agreed with the provider`, amount: -off, kind: 'platform' })
  return { lines, subtotal, total: subtotal - off, usage: { ...usage, modules: on.length } }
}

/** This facility's monthly bill. */
export function estimateBill(state: Pick<HospitalState, 'settings' | 'staff' | 'beds' | 'patients' | 'orders' | 'departments' | 'tenants'>, prices: PriceList, now = Date.now()) {
  const tenant = state.tenants?.find((item) => item.live)
  return billFor(liveUsage(state, now), state.settings.offModules ?? [], prices, tenant?.discount ?? 0)
}

/** Any client's monthly bill (this facility's usage is counted live). */
export function tenantBill(tenant: Tenant, state: Parameters<typeof estimateBill>[0], prices: PriceList) {
  return tenant.live ? estimateBill(state, prices) : billFor(tenant.usage, tenant.offModules, prices, tenant.discount)
}

export const money = (amount: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount)
