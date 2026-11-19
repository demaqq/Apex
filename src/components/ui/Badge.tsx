import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  return <span className={`tag tag-${variant} ${className}`} {...props}>{children}</span>
}
