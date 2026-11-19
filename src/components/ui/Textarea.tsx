import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`
    const errorId = `${textareaId}-error`
    const hintId = `${textareaId}-hint`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full rounded-xl border bg-white dark:bg-slate-900
            text-slate-900 dark:text-slate-100 placeholder:text-slate-400
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            p-4 text-sm resize-y min-h-[100px]
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {error && <p id={errorId} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        {hint && !error && <p id={hintId} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'