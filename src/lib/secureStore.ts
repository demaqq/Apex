/**
 * Encryption at rest for this device. Hospital data is saved in the browser encrypted with AES-GCM (256-bit)
 * under a key that is generated on this device, marked non-extractable and kept in IndexedDB: the key itself
 * can never be read out, so a copy of the saved data cannot be decrypted elsewhere.
 * Falls back to plain storage only where the browser has no Web Crypto or IndexedDB.
 */
const DB = 'northstar-careos-keys'
const STORE = 'keys'
const KEY_ID = 'data-key-v1'
const PREFIX = 'enc:v1:'

let key: CryptoKey | null = null
let cache: Record<string, string | null> = {}
export let encryptionActive = false

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadOrCreateKey(): Promise<CryptoKey> {
  const db = await openDb()
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY_ID)
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined)
    request.onerror = () => reject(request.error)
  })
  if (existing) return existing
  const created = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(created, KEY_ID)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return created
}

const toBase64 = (bytes: Uint8Array) => { let text = ''; bytes.forEach((byte) => { text += String.fromCharCode(byte) }); return btoa(text) }
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

async function decrypt(value: string): Promise<string | null> {
  if (!value.startsWith(PREFIX)) return value
  if (!key) return null
  try {
    const data = fromBase64(value.slice(PREFIX.length))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12))
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

/** Run once before the app renders: prepares the key and decrypts the saved data into memory. */
export async function initSecureStorage(keys: string[]) {
  try {
    if (!globalThis.crypto?.subtle || !globalThis.indexedDB) throw new Error('no web crypto')
    key = await loadOrCreateKey()
    encryptionActive = true
  } catch {
    key = null
    encryptionActive = false
  }
  for (const name of keys) {
    let raw: string | null = null
    try { raw = localStorage.getItem(name) } catch { raw = null }
    cache[name] = raw === null ? null : await decrypt(raw)
  }
}

/** The decrypted value read at start-up. */
export const readSecure = (name: string) => cache[name] ?? null

const version = new Map<string, number>()
/** Saves immediately (encrypted when possible); a slower older save never overwrites a newer one. */
export function writeSecure(name: string, value: string, onError?: () => void) {
  cache[name] = value
  const mine = (version.get(name) ?? 0) + 1
  version.set(name, mine)
  if (!key) { try { localStorage.setItem(name, value) } catch { onError?.() } return }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)).then((buffer) => {
    if (version.get(name) !== mine) return
    const cipher = new Uint8Array(buffer)
    const out = new Uint8Array(iv.length + cipher.length)
    out.set(iv); out.set(cipher, iv.length)
    localStorage.setItem(name, PREFIX + toBase64(out))
  }).catch(() => onError?.())
}

export const resetSecureCache = () => { cache = {} }
