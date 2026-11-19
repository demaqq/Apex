import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: string
  action?: ReactNode
}

export function Panel({ title, action, children, className = '', ...props }: PanelProps) {
  return (
    <section className={`panel ${className}`} {...props}>
      {(title || action) && (
        <div className="panel-heading">
          {title && <h2>{title}</h2>}
          {action && <div className="panel-heading-action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export interface MetricProps {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone?: 'teal' | 'blue' | 'amber' | 'coral' | 'green'
  progress?: number
}

export function Metric({ label, value, detail, icon: Icon, tone, progress }: MetricProps) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ''}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={16} aria-hidden="true" /></span>
      </div>
      <strong>{value}</strong>
      <p className="metric-detail">{detail}</p>
      {progress !== undefined && (
        <div className="metric-track">
          <motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span><Icon size={21} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
