import { type HTMLAttributes, type ReactNode } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  dot?: boolean
}

export function Badge({ children, variant = 'default', size = 'md', dot = false, className = '', ...props }: BadgeProps) {
  return (
    <span className={`tag tag-${variant} tag-${size}${className ? ` ${className}` : ''}`} {...props}>
      {dot && <i className="tag-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export type { ReactNode }
