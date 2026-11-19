import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode, type ComponentType, type SVGProps } from 'react'
import { isValidElement } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode | ComponentType<SVGProps<SVGSVGElement>>
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variantClasses = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  outline: 'button-secondary',
  ghost: 'button-ghost',
  danger: 'button-danger',
}

const sizeClasses = {
  sm: 'button-sm',
  md: 'button-md',
  lg: 'button-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', loading = false, icon, leftIcon, rightIcon, fullWidth = false, disabled, className = '', style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`button ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled || loading}
        style={style}
        {...props}
      >
        {loading ? (
          <span className="is-spinning" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </span>
        ) : (
          <>
            {(icon || leftIcon) && (
              <span className="button-icon">
                {isValidElement(icon) ? icon : icon ? React.createElement(icon as ComponentType<SVGProps<SVGSVGElement>>, { width: 16, height: 16 }) : leftIcon}
              </span>
            )}
            {children}
            {rightIcon && <span className="button-icon">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
