import type { Department, DepartmentId } from '../types'

export type Ambient = 'orbs' | 'bubbles' | 'waves' | 'ribbons' | 'ecg' | 'neural' | 'scan' | 'molecules' | 'ripples' | 'pulse' | 'cells' | 'iris' | 'siren' | 'crosses' | 'drops' | 'beams' | 'night' | 'lamp'

export interface DeptTheme {
  name: string
  ambient: Ambient
  /** Dark accent: bright, strong, text, text on accent. */
  d: [string, string, string, string]
  /** Light accent: mid (white text passes 4.5:1), strong. */
  l: [string, string]
  tint: string
  second: string
}

const DEFAULT: DeptTheme = { name: 'Northstar green', ambient: 'orbs', d: ['#2dd4bf', '#14b8a6', '#5eead4', '#052e2b'], l: ['#0f766e', '#115e59'], tint: '#0d9488', second: '#22c55e' }

export const DEPT_THEMES: Partial<Record<DepartmentId, DeptTheme>> = {
  pediatrics: { name: 'Sky & sunshine', ambient: 'bubbles', d: ['#38bdf8', '#0ea5e9', '#7dd3fc', '#082f49'], l: ['#0369a1', '#075985'], tint: '#0ea5e9', second: '#fbbf24' },
  obgyn: { name: 'Blush rose', ambient: 'waves', d: ['#f472b6', '#ec4899', '#f9a8d4', '#500724'], l: ['#be185d', '#9d174d'], tint: '#db2777', second: '#a78bfa' },
  oncology: { name: 'Lavender', ambient: 'ribbons', d: ['#a78bfa', '#8b5cf6', '#c4b5fd', '#2e1065'], l: ['#7c3aed', '#6d28d9'], tint: '#7c3aed', second: '#f0abfc' },
  cardiology: { name: 'Heart red', ambient: 'ecg', d: ['#fb7185', '#f43f5e', '#fda4af', '#4c0519'], l: ['#e11d48', '#be123c'], tint: '#e11d48', second: '#fb923c' },
  neurology: { name: 'Indigo', ambient: 'neural', d: ['#818cf8', '#6366f1', '#a5b4fc', '#1e1b4b'], l: ['#4f46e5', '#4338ca'], tint: '#6366f1', second: '#22d3ee' },
  emergency: { name: 'Ember', ambient: 'siren', d: ['#fb923c', '#f97316', '#fdba74', '#431407'], l: ['#c2410c', '#9a3412'], tint: '#ea580c', second: '#ef4444' },
  icu: { name: 'Monitor cyan', ambient: 'ecg', d: ['#22d3ee', '#06b6d4', '#67e8f9', '#083344'], l: ['#0e7490', '#155e75'], tint: '#0891b2', second: '#f43f5e' },
  surgery: { name: 'Theatre blue', ambient: 'crosses', d: ['#60a5fa', '#3b82f6', '#93c5fd', '#172554'], l: ['#1d4ed8', '#1e40af'], tint: '#2563eb', second: '#2dd4bf' },
  radiology: { name: 'X-ray slate', ambient: 'scan', d: ['#93c5fd', '#60a5fa', '#bfdbfe', '#172554'], l: ['#2563eb', '#1d4ed8'], tint: '#475569', second: '#38bdf8' },
  laboratory: { name: 'Lab lime', ambient: 'molecules', d: ['#a3e635', '#84cc16', '#bef264', '#1a2e05'], l: ['#4d7c0f', '#3f6212'], tint: '#65a30d', second: '#2dd4bf' },
  ent: { name: 'Gold sound', ambient: 'ripples', d: ['#fbbf24', '#f59e0b', '#fcd34d', '#422006'], l: ['#a16207', '#854d0e'], tint: '#ca8a04', second: '#fb923c' },
  'internal-medicine': { name: 'Forest green', ambient: 'pulse', d: ['#4ade80', '#22c55e', '#86efac', '#052e16'], l: ['#15803d', '#166534'], tint: '#16a34a', second: '#38bdf8' },
  dermatology: { name: 'Orchid', ambient: 'cells', d: ['#e879f9', '#d946ef', '#f0abfc', '#4a044e'], l: ['#a21caf', '#86198f'], tint: '#c026d3', second: '#fda4af' },
  ophthalmology: { name: 'Silver lens', ambient: 'iris', d: ['#cbd5e1', '#94a3b8', '#e2e8f0', '#0f172a'], l: ['#475569', '#334155'], tint: '#64748b', second: '#22d3ee' },
  endocrinology: { name: 'Honey', ambient: 'drops', d: ['#facc15', '#eab308', '#fde047', '#422006'], l: ['#854d0e', '#713f12'], tint: '#ca8a04', second: '#38bdf8' },
  orthopedics: { name: 'Bone', ambient: 'beams', d: ['#d6d3d1', '#a8a29e', '#e7e5e4', '#1c1917'], l: ['#57534e', '#44403c'], tint: '#78716c', second: '#60a5fa' },
  nicu: { name: 'Lullaby', ambient: 'night', d: ['#c084fc', '#a855f7', '#d8b4fe', '#3b0764'], l: ['#7e22ce', '#6b21a8'], tint: '#9333ea', second: '#f9a8d4' },
  or: { name: 'Scrub teal', ambient: 'lamp', d: ['#5eead4', '#14b8a6', '#99f6e4', '#042f2e'], l: ['#0f766e', '#115e59'], tint: '#0f766e', second: '#f87171' },
  psychiatry: { name: 'Calm blue', ambient: 'ripples', d: ['#93c5fd', '#7aa2d6', '#bfdbfe', '#0f1e36'], l: ['#3b5f8a', '#2c4a70'], tint: '#4a6fa0', second: '#c4b5fd' },
  pharmacy: { name: 'Emerald', ambient: 'molecules', d: ['#34d399', '#10b981', '#6ee7b7', '#022c22'], l: ['#047857', '#065f46'], tint: '#059669', second: '#a3e635' },
}

/** Theme for a department; departments added by the administrator take their colour. */
export function themeFor(id: DepartmentId | undefined, department?: Department): DeptTheme {
  if (!id) return DEFAULT
  const known = DEPT_THEMES[id]
  if (known) return known
  if (department?.color && id !== 'ward') {
    const c = department.color
    return { name: department.name, ambient: 'orbs', d: [`color-mix(in oklab, ${c} 70%, white)`, c, `color-mix(in oklab, ${c} 50%, white)`, `color-mix(in oklab, ${c} 25%, black)`], l: [`color-mix(in oklab, ${c} 70%, black)`, `color-mix(in oklab, ${c} 55%, black)`], tint: c, second: DEFAULT.second }
  }
  return DEFAULT
}

const VARS = ['--a-d', '--a-d2', '--a-dt', '--a-don', '--a-l', '--a-l2', '--a-tint', '--a-2']

export function applyDeptTheme(theme: DeptTheme | null) {
  const root = document.documentElement
  if (!theme) { VARS.forEach((name) => root.style.removeProperty(name)); root.removeAttribute('data-ambient'); return }
  const values = [...theme.d, ...theme.l, theme.tint, theme.second]
  VARS.forEach((name, i) => root.style.setProperty(name, values[i]))
  root.setAttribute('data-ambient', theme.ambient)
}
