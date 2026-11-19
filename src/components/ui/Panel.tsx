import React, { isValidElement } from 'react'
import { type ReactNode, type HTMLAttributes, type ComponentType, type SVGProps } from 'react'
import { motion } from 'framer-motion'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: ReactNode
  className?: string
}

export function Panel({ title, action, children, className = '', style, ...props }: PanelProps) {
  return (
    <div className={`panel ${className}`} style={style} {...props}>
      {(title || action) && (
        <div className="panel-heading">
          {title && <h2>{title}</h2>}
          {action && <div className="panel-heading-action">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export interface MetricProps {
  label: string
  value: string | number
  detail: string
  icon: ReactNode | ComponentType<SVGProps<SVGSVGElement>>
  tone?: string
  progress?: number
}

export function Metric({ label, value, detail, icon: Icon, tone, progress }: MetricProps) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ''}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          {isValidElement(Icon) ? Icon : Icon ? React.createElement(Icon as ComponentType<SVGProps<SVGSVGElement>>, { width: 16, height: 16 }) : null}
        </span>
      </div>
      <strong>{value}</strong>
      <p className="metric-detail">{detail}</p>
      {progress !== undefined && (
        <div className="metric-track">
          <motion.span initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

export interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export interface EmptyStateProps {
  icon: ReactNode | ComponentType<SVGProps<SVGSVGElement>>
  title: string
  text: string
  action?: ReactNode
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span>
        {isValidElement(icon) ? icon : icon ? React.createElement(icon as ComponentType<SVGProps<SVGSVGElement>>, { width: 21, height: 21 }) : null}
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export interface TextLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
}

export function TextLink({ children, className = '', ...props }: TextLinkProps) {
  return <a className={`text-link ${className}`} {...props}>{children}</a>
}
