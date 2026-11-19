import { type ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export interface ModalProps {
  isOpen?: boolean
  open?: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export function Modal({ isOpen, open, onClose, title, subtitle, description, children, size = 'md', showClose = true, closeOnOverlayClick = true, closeOnEscape = true }: ModalProps) {
  const modalOpen = isOpen ?? open ?? false
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (modalOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      contentRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!modalOpen) return
      if (event.key === 'Escape' && closeOnEscape) onClose()
      if (event.key === 'Tab') {
        const focusableElements = contentRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!focusableElements?.length) return
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]
        if (event.shiftKey && document.activeElement === firstElement) { event.preventDefault(); lastElement.focus() }
        else if (!event.shiftKey && document.activeElement === lastElement) { event.preventDefault(); firstElement.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen, closeOnEscape, onClose])

  if (!modalOpen) return null

  const sizeClass = { sm: 'modal-sm', md: 'modal-md', lg: 'modal-lg', xl: 'modal-xl', full: 'modal-xl' }[size]

  return (
    <div
      className="modal-backdrop"
      ref={overlayRef}
      onMouseDown={closeOnOverlayClick ? (event) => { if (event.target === event.currentTarget) onClose() } : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div ref={contentRef} tabIndex={-1} className={`modal ${sizeClass}`}>
        {(title || subtitle || showClose) && (
          <div className="modal-header">
            <div>
              {title && <h2 id="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
              {description && <p id="modal-description">{description}</p>}
            </div>
            {showClose && (
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
                <X size={18} />
              </Button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}