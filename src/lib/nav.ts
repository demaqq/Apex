import { DoorOpen, Activity, BedDouble, Building2, CalendarClock, ClipboardCheck, FilePenLine, FlaskConical, GitBranch, HandHeart, LayoutDashboard, MonitorDot, Network, Pill, Receipt, Scissors, ShieldAlert, ShieldCheck, Stethoscope, UserPlus, UsersRound, Video, type LucideIcon } from 'lucide-react'
import type { RoleId } from '../types'

export interface NavItem {
  to: string
  label: string
  /** Breadcrumb and document title. */
  page: string
  icon: LucideIcon
  roles: RoleId[] | 'all'
  /** Single-key shortcut (Selam keymap). */
  key?: string
  /** Only shown when the user's department has a specialty assessment. */
  specialty?: boolean
}

const CLINICIANS: RoleId[] = ['physician', 'consultant', 'intern', 'nurse']
const CLASSIC: RoleId[] = ['physician', 'nurse', 'consultant', 'diagnostics', 'coordinator', 'administrator']
/** Clinical roles only — administrators manage the facility and never see patient records. */
const CLINICAL_CLASSIC: RoleId[] = ['physician', 'nurse', 'consultant', 'diagnostics', 'coordinator']

export const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  { label: 'Clinical', items: [
    { to: '/dashboard', label: 'Overview', page: 'Overview', icon: LayoutDashboard, roles: CLASSIC, key: 'g' },
    { to: '/specialty', label: 'Department dashboard', page: 'Department dashboard', icon: Stethoscope, roles: ['physician', 'consultant', 'intern', 'nurse'], key: 'y', specialty: true },
    { to: '/front-desk', label: 'Reception', page: 'Reception & billing', icon: UserPlus, roles: ['receptionist', 'billing'], key: 'n' },
    { to: '/opd', label: 'OPD clinics', page: 'Outpatient clinics (OPD)', icon: DoorOpen, roles: ['physician', 'consultant', 'intern', 'nurse', 'receptionist', 'coordinator'], key: 'u' },
    { to: '/triage', label: 'Triage', page: 'Triage & waiting room', icon: Activity, roles: ['physician', 'nurse', 'consultant'], key: 't' },
    { to: '/patients', label: 'Patients', page: 'Patient records', icon: UsersRound, roles: [...CLINICIANS, 'coordinator', 'diagnostics', 'theatre', 'allied'], key: 'p' },
    { to: '/review', label: 'Notes to review', page: 'Notes to review', icon: FilePenLine, roles: ['consultant', 'physician', 'intern'] },
    { to: '/telehealth', label: 'Appointments', page: 'Appointments & telehealth', icon: Video, roles: ['physician', 'consultant', 'intern', 'receptionist'], key: 'a' },
  ] },
  { label: 'Wards', items: [
    { to: '/beds', label: 'Bed board', page: 'Bed board', icon: BedDouble, roles: [...CLINICIANS, 'coordinator'], key: 'b' },
    { to: '/handover', label: 'Shift handover', page: 'Shift handover', icon: HandHeart, roles: ['nurse', 'physician', 'intern'], key: 'h' },
    { to: '/med-round', label: 'Medication round', page: 'Medication round', icon: ClipboardCheck, roles: ['nurse', 'physician'], key: 'm' },
  ] },
  { label: 'Diagnostics & services', items: [
    { to: '/lab-imaging', label: 'Lab & imaging', page: 'Lab & imaging', icon: FlaskConical, roles: [...CLINICIANS, 'diagnostics'], key: 'l' },
    { to: '/pharmacy', label: 'Pharmacy', page: 'Pharmacy', icon: Pill, roles: [...CLINICIANS, 'pharmacist'], key: 'r' },
    { to: '/theatres', label: 'Operating theatres', page: 'Operating theatres', icon: Scissors, roles: ['theatre', 'physician', 'consultant', 'nurse', 'coordinator'], key: 'o' },
    { to: '/services', label: 'Therapy & blood bank', page: 'Service worklist', icon: Stethoscope, roles: ['allied', 'nurse', 'physician', 'intern'], key: 's' },
  ] },
  { label: 'Operations', items: [
    { to: '/ops', label: 'Operations center', page: 'Operations center', icon: MonitorDot, roles: ['physician', 'nurse', 'consultant', 'coordinator', 'administrator', 'receptionist'], key: 'd' },
    { to: '/flow', label: 'Care flow', page: 'Care flow', icon: GitBranch, roles: 'all', key: 'f' },
    { to: '/departments', label: 'Departments & beds', page: 'Departments & live capacity', icon: Building2, roles: CLINICAL_CLASSIC },
    { to: '/network', label: 'Care network', page: 'Interdepartmental care network', icon: Network, roles: CLINICAL_CLASSIC },
    { to: '/staff', label: 'Roster & pagers', page: 'Roster & pagers', icon: CalendarClock, roles: 'all', key: 'k' },
    { to: '/billing', label: 'Billing & claims', page: 'Billing & claims', icon: Receipt, roles: ['billing'] },
    { to: '/audit', label: 'Codes & audit', page: 'Emergency codes & audit', icon: ShieldAlert, roles: 'all' },
    { to: '/admin', label: 'Administration', page: 'Administration', icon: ShieldCheck, roles: ['administrator'], key: 'x' },
  ] },
]

export const ALL_NAV = NAV_SECTIONS.flatMap((section) => section.items)

export const canSee = (item: NavItem, role: RoleId) => item.roles === 'all' || item.roles.includes(role)

/** Modules the administrator can never switch off. */
export const CORE_MODULES = ['/dashboard', '/admin', '/audit', '/staff']

export const moduleEnabled = (path: string, disabled: string[]) => CORE_MODULES.includes(path) || !disabled.includes(path)

export function navFor(role: RoleId, disabled: string[] = []) {
  return NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => canSee(item, role) && moduleEnabled(item.to, disabled)) })).filter((section) => section.items.length)
}

export const pageName = (path: string) => ALL_NAV.find((item) => item.to === path)?.page

export const sectionName = (path: string) => NAV_SECTIONS.find((section) => section.items.some((item) => item.to === path))?.label
