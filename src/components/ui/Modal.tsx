import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/** Open dialogs, topmost last: only the top one answers Escape and traps Tab. */
const stack: string[] = []

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, subtitle, children, size = 'md' }: ModalProps) {
  const titleId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const content = contentRef.current
    // Focus the first field (or the dialog) so keyboard users land inside it.
    const first = content?.querySelector<HTMLElement>('input, select, textarea')
    ;(first ?? content)?.focus()

    stack.push(titleId)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== titleId) return
      if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !content) return
      const focusable = content.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!focusable.length) return
      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstEl) { event.preventDefault(); lastEl.focus() }
      else if (!event.shiftKey && document.activeElement === lastEl) { event.preventDefault(); firstEl.focus() }
    }
    // Capture on window so the dialog handles keys before page-level shortcuts and the record popup.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      const at = stack.lastIndexOf(titleId)
      if (at >= 0) stack.splice(at, 1)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, titleId])

  if (!open) return null

  // Portal to <body> so frosted-glass ancestors (backdrop-filter) can't trap the fixed overlay.
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={contentRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal modal-${size}`}>
        <div className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
