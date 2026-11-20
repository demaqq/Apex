import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Contrast, ImagePlus, Loader2, RotateCcw, SunMedium, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { deleteImage, getImage, prepareImage, putImage } from '../lib/imageStore'
import { formatDateTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ClinicalOrder, OrderImage, RoleId } from '../types'
import { Button, Modal } from './ui'

const makeId = () => `IMG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** Radiology attaches images; clinicians may attach outside films for studies referred to a partner. */
export function canAttachImages(order: ClinicalOrder, role: RoleId | null | undefined) {
  if (order.kind !== 'Imaging' || !role) return false
  if (role === 'diagnostics' || role === 'radiographer') return true
  return Boolean(order.externalProviderId) && ['physician', 'consultant', 'intern'].includes(role)
}

export function AttachImagesButton({ order, size = 'sm', label = 'Attach images' }: { order: ClinicalOrder; size?: 'sm' | 'md'; label?: string }) {
  const { attachImages, notify } = useHospital()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const ready: OrderImage[] = []
    for (const file of Array.from(files).slice(0, 12)) {
      if (!file.type.startsWith('image/')) { notify(`${file.name}: only image files (JPEG, PNG, WebP). Export DICOM studies as images first.`, 'warning'); continue }
      try {
        const prepared = await prepareImage(file)
        const id = makeId()
        const stored = await putImage(id, prepared.full)
        ready.push({ id, name: file.name, at: new Date().toISOString(), by: '', width: prepared.width, height: prepared.height, thumb: prepared.thumb, ...(stored ? {} : { full: prepared.full }) })
      } catch (error) { notify(error instanceof Error ? error.message : `Could not read ${file.name}`, 'warning') }
    }
    if (ready.length) attachImages(order.id, ready)
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" multiple hidden aria-label={`Attach images to ${order.title}`} onChange={(event) => onFiles(event.target.files)} />
      <Button size={size === 'sm' ? 'sm' : undefined} variant="secondary" icon={busy ? Loader2 : ImagePlus} disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Preparing…' : label}</Button>
    </>
  )
}

/** Thumbnail strip; opens the viewer. */
export function ImageStrip({ order, compact }: { order: ClinicalOrder; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const images = order.images ?? []
  if (!images.length) return null
  const shown = compact ? images.slice(0, 4) : images
  return (
    <>
      <div className={`image-strip ${compact ? 'compact' : ''}`} aria-label={`${images.length} attached images`}>
        {shown.map((image, index) => (
          <button key={image.id} type="button" className="image-thumb" onClick={(event) => { event.stopPropagation(); setOpen(index) }} title={image.caption || image.name}>
            <img src={image.thumb} alt={image.caption || `${order.title} image ${index + 1}`} loading="lazy" />
            {compact && index === shown.length - 1 && images.length > shown.length && <span>+{images.length - shown.length}</span>}
          </button>
        ))}
      </div>
      {open !== null && <ImageViewer order={order} start={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export function ImageViewer({ order, start, onClose }: { order: ClinicalOrder; start: number; onClose: () => void }) {
  const { currentRole, removeImage } = useHospital()
  const images = order.images ?? []
  const [index, setIndex] = useState(Math.min(start, images.length - 1))
  const [src, setSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [invert, setInvert] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const image = images[index]

  useEffect(() => {
    let live = true
    if (!image) return
    setSrc(image.full ?? image.thumb)
    if (!image.full) getImage(image.id).then((full) => { if (live && full) setSrc(full) })
    setZoom(1); setPan({ x: 0, y: 0 })
    return () => { live = false }
  }, [image])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(images.length - 1, i + 1))
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (event.key === '+' || event.key === '=') setZoom((z) => Math.min(6, z * 1.25))
      if (event.key === '-') setZoom((z) => Math.max(1, z / 1.25))
      if (event.key.toLowerCase() === 'i') setInvert((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length])

  if (!image) return null
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); setBrightness(100); setContrast(100); setInvert(false) }
  const remove = () => { removeImage(order.id, image.id); deleteImage(image.id); if (images.length <= 1) onClose(); else setIndex(Math.max(0, index - 1)) }

  return (
    <Modal open onClose={onClose} title={order.title} subtitle={`Image ${index + 1} of ${images.length} · ${image.by || 'Radiology'} · ${formatDateTime(image.at)}`} size="lg">
      <div className="viewer-stage"
        onWheel={(event) => setZoom((z) => Math.min(6, Math.max(1, z * (event.deltaY < 0 ? 1.12 : 0.89))))}
        onPointerDown={(event) => { drag.current = { x: event.clientX - pan.x, y: event.clientY - pan.y }; (event.target as HTMLElement).setPointerCapture?.(event.pointerId) }}
        onPointerMove={(event) => { if (drag.current && zoom > 1) setPan({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }) }}
        onPointerUp={() => { drag.current = null }}
        onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}>
        {src && <img src={src} alt={image.caption || image.name} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, filter: `brightness(${brightness}%) contrast(${contrast}%)${invert ? ' invert(1)' : ''}`, cursor: zoom > 1 ? 'grab' : 'zoom-in' }} />}
        {images.length > 1 && <>
          <button type="button" className="viewer-nav prev" aria-label="Previous image" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={22} /></button>
          <button type="button" className="viewer-nav next" aria-label="Next image" disabled={index === images.length - 1} onClick={() => setIndex(index + 1)}><ChevronRight size={22} /></button>
        </>}
      </div>
      <div className="viewer-tools">
        <div className="viewer-group">
          <button type="button" className="icon-button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z / 1.25))}><ZoomOut size={17} /></button>
          <span className="mono">{Math.round(zoom * 100)}%</span>
          <button type="button" className="icon-button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(6, z * 1.25))}><ZoomIn size={17} /></button>
        </div>
        <label className="viewer-slider"><SunMedium size={15} /><span className="sr-only">Brightness</span><input type="range" min={40} max={200} value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} aria-label="Brightness" /></label>
        <label className="viewer-slider"><Contrast size={15} /><span className="sr-only">Contrast</span><input type="range" min={40} max={250} value={contrast} onChange={(event) => setContrast(Number(event.target.value))} aria-label="Contrast" /></label>
        <button type="button" className={`pick-chip ${invert ? 'on' : ''}`} aria-pressed={invert} onClick={() => setInvert(!invert)}>Invert</button>
        <button type="button" className="icon-button" aria-label="Reset view" onClick={reset}><RotateCcw size={16} /></button>
        {(currentRole === 'diagnostics' || currentRole === 'radiographer') && <Button size="sm" variant="ghost" icon={Trash2} onClick={remove}>Remove</Button>}
      </div>
      {images.length > 1 && <div className="image-strip viewer-thumbs">{images.map((item, i) => <button key={item.id} type="button" className={`image-thumb ${i === index ? 'on' : ''}`} onClick={() => setIndex(i)}><img src={item.thumb} alt="" /></button>)}</div>}
      <p className="record-hint">{image.name} · {image.width}×{image.height}px · scroll or +/− to zoom, drag to pan, I to invert, arrows for next image. For viewing alongside the report — not a diagnostic-grade PACS viewer.</p>
    </Modal>
  )
}
