/** Full-size attached images live in IndexedDB so they don't fill localStorage. */
const DB = 'northstar-images'
const STORE = 'images'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } catch (error) { reject(error) }
  })
}

export async function putImage(id: string, dataUrl: string): Promise<boolean> {
  try {
    const db = await open()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch { return false }
}

export async function getImage(id: string): Promise<string | null> {
  try {
    const db = await open()
    return await new Promise((resolve) => {
      const request = db.transaction(STORE).objectStore(STORE).get(id)
      request.onsuccess = () => resolve((request.result as string | undefined) ?? null)
      request.onerror = () => resolve(null)
    })
  } catch { return null }
}

export async function deleteImage(id: string) {
  try {
    const db = await open()
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
  } catch { /* nothing stored */ }
}

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} is not an image this browser can open`)) }
    img.src = url
  })
}

function draw(img: HTMLImageElement, max: number, quality: number) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { url: canvas.toDataURL('image/jpeg', quality), width: canvas.width, height: canvas.height }
}

/** Downscale to at most 1800 px (full) and 260 px (thumbnail), JPEG. */
export async function prepareImage(file: File) {
  const img = await load(file)
  const full = draw(img, 1800, 0.85)
  const thumb = draw(img, 260, 0.72)
  return { full: full.url, thumb: thumb.url, width: full.width, height: full.height }
}
