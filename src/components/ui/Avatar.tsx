import { type ReactNode, type HTMLAttributes, type SVGAttributes } from 'react'
import { Building2, Users } from 'lucide-react'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  src?: string
  accent?: string
}

export function Avatar({ name, size = 'md', src, accent, className = '', style, ...props }: AvatarProps) {
  const sizeClass = `avatar-${size === 'xs' ? 'sm' : size}`
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  if (src) {
    return <img src={src} alt={name} className={`avatar ${sizeClass} object-cover ${className}`} style={style} {...props} />
  }

  return (
    <div
      className={`avatar ${sizeClass} ${className}`}
      style={accent ? { ...style, background: accent, color: '#fff' } : style}
      {...props}
    >
      {initials}
    </div>
  )
}

export interface BrandProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean
  light?: boolean
}

export function Brand({ compact = false, light = false, className = '', ...props }: BrandProps) {
  return (
    <div className={`brand ${className}`} {...props}>
      <span className={`brand-mark ${light ? 'brand-mark-light' : ''}`}>
        <Building2 size={19} strokeWidth={1.9} />
        <span />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>Northstar</strong>
          <span>CAREOS · UNIVERSITY HOSPITAL</span>
        </span>
      )}
    </div>
  )
}

export interface DepartmentIconProps extends SVGAttributes<SVGSVGElement> {
  id: string
  size?: number
}

const departmentColors: Record<string, string> = {
  emergency: '#d86151',
  cardiology: '#5367a8',
  neurology: '#7a5d9d',
  radiology: '#2f8290',
  laboratory: '#378777',
  icu: '#b65464',
  surgery: '#9b6a3c',
  ward: '#487a9a',
  pharmacy: '#67864a',
  pediatrics: '#c5824f',
  obgyn: '#ad6682',
  'internal-medicine': '#477e71',
  ent: '#597d9c',
  dermatology: '#a57558',
}

const departmentIcons: Record<string, React.ReactNode> = {
  emergency: <Users className="h-4 w-4" />,
  cardiology: <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" /></svg>,
  neurology: <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  radiology: <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>,
  laboratory: <svg viewBox="0 0 24 24"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8.17L16.83 6H11l-2-4z" fill="currentColor"/></svg>,
  icu: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>,
  surgery: <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/></svg>,
  ward: <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9H8V7h4v5zm4-7v10h4V5h-4zm0 12h4v-2h-4v2z" fill="currentColor"/></svg>,
  pharmacy: <svg viewBox="0 0 24 24"><path d="M19 5H5v14h14V5zm-5 11h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z" fill="currentColor"/></svg>,
  pediatrics: <svg viewBox="0 0 24 24"><path d="M12 2c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>,
  obgyn: <svg viewBox="0 0 24 24"><path d="M12 2c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/></svg>,
  'internal-medicine': <svg viewBox="0 0 24 24"><path d="M19 5H5v14h14V5zm-7 11H8V7h4v5zm4-7v10h4V5h-4zm0 12h4v-2h-4v2z" fill="currentColor"/></svg>,
  ent: <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  dermatology: <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
}

export function DepartmentIcon({ id, size = 16, className = '', ...props }: DepartmentIconProps) {
  const color = departmentColors[id] || '#64748b'
  const Icon = departmentIcons[id] || <Users className="h-4 w-4" />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={{ color }} {...props}>
      {Icon}
    </svg>
  )
}

export interface EsiBadgeProps {
  level: 1 | 2 | 3 | 4 | 5
  compact?: boolean
  showLabel?: boolean
}

export function EsiBadge({ level, compact = false, showLabel = !compact }: EsiBadgeProps) {
  const label = esiLabels[level]
  const color = label.color
  return (
    <span className={`esi-badge ${compact ? 'esi-compact' : ''}`} style={{ '--esi': color } as React.CSSProperties}>
      <b>ESI {level}</b>
      {showLabel && <span>{label.name}</span>}
    </span>
  )
}

export interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, string> = {
  'awaiting-triage': 'Awaiting triage',
  waiting: 'Waiting',
  'in-treatment': 'In treatment',
  observation: 'Observation',
  admitted: 'Admitted',
  discharged: 'Discharged',
  ordered: 'Ordered',
  'in-progress': 'In progress',
  completed: 'Completed',
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  available: 'Available',
  limited: 'Limited',
  'high-occupancy': 'High occupancy',
  'critical-capacity': 'Critical capacity',
  'accepting-patients': 'Accepting patients',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = statusConfig[status] ?? status.replace(/-/g, ' ')
  return <span className={`status-badge status-${status}`}>{label}</span>
}

const esiLabels: Record<number, { name: string; description: string; color: string; target: string }> = {
  1: { name: 'Resuscitation', description: 'Immediate life-saving intervention', color: '#b42332', target: 'Immediate' },
  2: { name: 'Emergent', description: 'High-risk or severe distress', color: '#df6b3f', target: '≤ 10 min' },
  3: { name: 'Urgent', description: 'Stable, multiple resources', color: '#d19a26', target: '≤ 30 min' },
  4: { name: 'Less urgent', description: 'Stable, one resource', color: '#3b8791', target: '≤ 60 min' },
  5: { name: 'Non-urgent', description: 'Stable, no resources', color: '#58816c', target: '≤ 120 min' },
}