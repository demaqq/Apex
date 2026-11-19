import { type HTMLAttributes, type ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({ children, variant = 'default', padding = 'md', hover = false, className = '', style, ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 shadow-sm border border-slate-200/50 dark:border-slate-700/50',
    elevated: 'bg-white dark:bg-slate-900 shadow-lg border border-slate-200/50 dark:border-slate-700/50',
    outlined: 'bg-transparent border border-slate-200 dark:border-slate-700',
  }
  const paddingStyles = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

  return (
    <div
      className={`rounded-2xl ${variantStyles[variant]} ${paddingStyles[padding]} ${hover ? 'transition-shadow duration-200 hover:shadow-md cursor-pointer' : ''} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 ${className}`} {...props}>{children}</div>
}

export function CardTitle({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-semibold text-slate-900 dark:text-slate-100 ${className}`} {...props}>{children}</h3>
}

export function CardDescription({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`mt-1 text-sm text-slate-500 dark:text-slate-400 ${className}`} {...props}>{children}</p>
}

export function CardContent({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props}>{children}</div>
}

export function CardFooter({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 ${className}`} {...props}>{children}</div>
}