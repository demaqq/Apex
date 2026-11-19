import type { CSSProperties, HTMLAttributes } from 'react'
import { Baby, BedDouble, Brain, Building2, Ear, FlaskConical, Hand, Ribbon, HeartPulse, MonitorDot, Pill, ScanLine, Scissors, Siren, Stethoscope, Venus, type LucideIcon } from 'lucide-react'
import { esiLabels } from '../../data'
import type { DepartmentId, EsiLevel } from '../../types'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  accent?: string
}

export function Avatar({ name, size = 'md', accent, className = '', style, ...props }: AvatarProps) {
  const initials = name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s+/, '').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div aria-hidden="true" className={`avatar avatar-${size} ${className}`} style={accent ? { ...style, background: accent, color: '#fff' } : style} {...props}>
      {initials}
    </div>
  )
}

export function Brand({ compact = false, light = false, name = 'Northstar', tagline = 'CareOS · Unified care platform' }: { compact?: boolean; light?: boolean; name?: string; tagline?: string }) {
  return (
    <div className="brand">
      <span className={`brand-mark ${light ? 'brand-mark-light' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 64 64" width="22" height="22"><path d="M8 34h12l4-12 8 22 6-16 4 6h14" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>{name}</strong>
          <span>{tagline}</span>
        </span>
      )}
    </div>
  )
}

const departmentIcons: Record<DepartmentId, { icon: LucideIcon; color: string }> = {
  emergency: { icon: Siren, color: '#d86151' },
  cardiology: { icon: HeartPulse, color: '#7b8fd6' },
  neurology: { icon: Brain, color: '#a487c7' },
  radiology: { icon: ScanLine, color: '#3ea3b3' },
  laboratory: { icon: FlaskConical, color: '#47a893' },
  icu: { icon: MonitorDot, color: '#d0697a' },
  surgery: { icon: Scissors, color: '#c48a52' },
  ward: { icon: BedDouble, color: '#5f9cc4' },
  pharmacy: { icon: Pill, color: '#86ab5f' },
  pediatrics: { icon: Baby, color: '#d99460' },
  obgyn: { icon: Venus, color: '#c97a9a' },
  'internal-medicine': { icon: Stethoscope, color: '#55a08e' },
  ent: { icon: Ear, color: '#6f9cc2' },
  dermatology: { icon: Hand, color: '#c08c6c' },
  oncology: { icon: Ribbon, color: '#a487d8' },
}

export function DepartmentIcon({ id, size = 16, className = '' }: { id: DepartmentId; size?: number; className?: string }) {
  const { icon: Icon, color } = departmentIcons[id] ?? { icon: Building2, color: 'currentColor' }
  return <Icon size={size} className={className} color={color} strokeWidth={1.9} aria-hidden="true" />
}

export function EsiBadge({ level, compact = false }: { level: EsiLevel; compact?: boolean }) {
  const label = esiLabels[level]
  return (
    <span className={`esi-badge ${compact ? 'esi-compact' : ''}`} style={{ '--esi': label.color } as CSSProperties} title={`ESI ${level} · ${label.name}`}>
      <b>ESI {level}</b>
      {!compact && <span>{label.name}</span>}
    </span>
  )
}

const statusLabels: Record<string, string> = {
  'awaiting-triage': 'Awaiting triage',
  'in-treatment': 'In treatment',
  'in-progress': 'In progress',
  'on-duty': 'On duty',
  'off-duty': 'Off duty',
  'claim-submitted': 'Claim submitted',
}

/** Renders any status string; class names are the slugified status, e.g. "Claim submitted" → status-claim-submitted. */
export function StatusBadge({ status }: { status: string }) {
  const slug = status.toLowerCase().replace(/\s+/g, '-')
  const label = statusLabels[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
  return <span className={`status-badge status-${slug}`}>{label}</span>
}
