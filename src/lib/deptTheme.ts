import type { Department, DepartmentId } from '../types'

export type Ambient = 'orbs' | 'bubbles' | 'waves' | 'ribbons' | 'ecg' | 'neural' | 'scan' | 'molecules'

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
  emergency: { name: 'Ember', ambient: 'ecg', d: ['#fb923c', '#f97316', '#fdba74', '#431407'], l: ['#c2410c', '#9a3412'], tint: '#ea580c', second: '#ef4444' },
  icu: { name: 'Monitor cyan', ambient: 'ecg', d: ['#22d3ee', '#06b6d4', '#67e8f9', '#083344'], l: ['#0e7490', '#155e75'], tint: '#0891b2', second: '#f43f5e' },
  surgery: { name: 'Theatre blue', ambient: 'orbs', d: ['#60a5fa', '#3b82f6', '#93c5fd', '#172554'], l: ['#1d4ed8', '#1e40af'], tint: '#2563eb', second: '#2dd4bf' },
  radiology: { name: 'X-ray slate', ambient: 'scan', d: ['#93c5fd', '#60a5fa', '#bfdbfe', '#172554'], l: ['#2563eb', '#1d4ed8'], tint: '#475569', second: '#38bdf8' },
  laboratory: { name: 'Lab lime', ambient: 'molecules', d: ['#a3e635', '#84cc16', '#bef264', '#1a2e05'], l: ['#4d7c0f', '#3f6212'], tint: '#65a30d', second: '#2dd4bf' },
  pharmacy: { name: 'Emerald', ambient: 'molecules', d: ['#34d399', '#10b981', '#6ee7b7', '#022c22'], l: ['#047857', '#065f46'], tint: '#059669', second: '#a3e635' },
}

/** Theme for a department; departments added by the administrator take their colour. */
export function themeFor(id: DepartmentId | undefined, department?: Department): DeptTheme {
  if (!id) return DEFAULT
  const known = DEPT_THEMES[id]
  if (known) return known
  if (department?.color && !['ward', 'internal-medicine', 'ent', 'dermatology'].includes(id)) {
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
