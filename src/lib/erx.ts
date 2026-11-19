import type { Prescription } from '../types'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short code without look-alike characters (no 0/O, 1/I). */
export function makeErxCode() {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return `ERX-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

export const normaliseCode = (text: string) => {
  const raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^NSERX/, '').replace(/^ERX/, '')
  return raw ? `ERX-${raw}` : ''
}

export const qrPayload = (code: string) => `NSERX:${code}`

/** Quantity of each line still to be collected. */
export function remaining(rx: Prescription) {
  return rx.items.map((item) => {
    const given = (rx.collections ?? []).flatMap((c) => c.items).filter((c) => c.medicationId === item.medicationId).reduce((sum, c) => sum + c.quantity, 0)
    return { ...item, given, left: Math.max(0, item.quantity - given) }
  })
}

export const isExpired = (rx: Prescription) => Boolean(rx.eRx && new Date(rx.eRx.validUntil).getTime() < Date.now())
