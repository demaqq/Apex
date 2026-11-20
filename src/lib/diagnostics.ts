import type { ClinicalOrder, ExternalProvider, FacilitySettings, InvestigationItem, NetworkFacility, Patient } from '../types'

/** Laboratory sections, in the order they appear on the worklist and catalogue. */
export const LAB_SECTIONS = ['Haematology', 'Clinical chemistry', 'Hormones & tumour markers', 'Serology & immunology', 'Microbiology', 'Parasitology', 'Urine & body fluids', 'Blood bank', 'Molecular', 'Histopathology & cytology'] as const

/** Imaging modalities. */
export const MODALITIES = ['X-ray', 'Ultrasound', 'CT', 'MRI', 'PET-CT', 'Mammography', 'Fluoroscopy', 'DEXA', 'Nuclear medicine', 'Echo & Doppler', 'Interventional'] as const
export type Modality = (typeof MODALITIES)[number]

/** Value stored in `externalProviderId` for a test sent out on a printed request form. */
export const PRINTOUT = 'printout'

/** Done here only if the item is offered in-house and the facility has the laboratory / imaging module switched on. */
export const doneHere = (item: Pick<InvestigationItem, 'inHouse' | 'kind'>, settings: Pick<FacilitySettings, 'offModules'>) => item.inHouse && !(settings.offModules ?? []).includes(item.kind === 'Imaging' ? 'imaging' : 'laboratory')

export const isSentOut = (order: Pick<ClinicalOrder, 'externalProviderId'>) => Boolean(order.externalProviderId)

/** Where a sent-out test went, in words. */
export function sentOutLabel(order: Pick<ClinicalOrder, 'externalProviderId'>, providers: ExternalProvider[], network?: NetworkFacility[]) {
  if (!order.externalProviderId) return ''
  if (order.externalProviderId === PRINTOUT) return 'Printed request · outside lab or centre'
  if (order.externalProviderId.startsWith('net:')) return `Sent electronically · ${network?.find((item) => `net:${item.id}` === order.externalProviderId)?.name ?? 'connected facility'}`
  return `Referred to ${providers.find((item) => item.id === order.externalProviderId)?.name ?? 'partner facility'}`
}

/** The catalogue entry an order was placed from (orders may add detail after an em dash). */
export function catalogueItem(order: Pick<ClinicalOrder, 'title' | 'kind'>, catalogue: InvestigationItem[]) {
  const base = order.title.split(' — ')[0].trim().toLowerCase()
  return catalogue.find((item) => item.kind === order.kind && item.name.toLowerCase() === base)
    ?? catalogue.find((item) => item.kind === order.kind && base.startsWith(item.name.toLowerCase()))
}

/** Imaging modality from the catalogue, or guessed from the study name. */
export function modalityOf(order: Pick<ClinicalOrder, 'title' | 'kind'>, catalogue: InvestigationItem[]): Modality {
  const section = catalogueItem(order, catalogue)?.section
  if (section && (MODALITIES as readonly string[]).includes(section)) return section as Modality
  const t = order.title
  if (/PET/i.test(t)) return 'PET-CT'
  if (/\bCT\b|angiogra/i.test(t)) return 'CT'
  if (/MRI|MRCP|MRA\b/i.test(t)) return 'MRI'
  if (/mammog/i.test(t)) return 'Mammography'
  if (/DEXA|bone density/i.test(t)) return 'DEXA'
  if (/barium|fluoro|HSG|swallow/i.test(t)) return 'Fluoroscopy'
  if (/scintig|bone scan|thyroid scan|nuclear/i.test(t)) return 'Nuclear medicine'
  if (/echo|doppler/i.test(t)) return 'Echo & Doppler'
  if (/biopsy|drain|guided/i.test(t)) return 'Interventional'
  if (/ultrasound|\bUS\b|sonograph/i.test(t)) return 'Ultrasound'
  return 'X-ray'
}

/** Laboratory section from the catalogue, or guessed from the test name. */
export function labSectionOf(order: Pick<ClinicalOrder, 'title' | 'kind'>, catalogue: InvestigationItem[]) {
  const section = catalogueItem(order, catalogue)?.section
  if (section) return section
  const t = order.title
  if (/blood count|FBC|ESR|coag|INR|film|haemoglobin/i.test(t)) return 'Haematology'
  if (/culture|gram|AFB|GeneXpert|sensitivity/i.test(t)) return 'Microbiology'
  if (/stool|malaria|parasite/i.test(t)) return 'Parasitology'
  if (/urin|CSF|fluid/i.test(t)) return 'Urine & body fluids'
  if (/HIV|hepatitis|HBs|VDRL|widal|serolog|antibod/i.test(t)) return 'Serology & immunology'
  if (/thyroid|TSH|hormone|PSA|CA-?125|AFP|beta|HCG/i.test(t)) return 'Hormones & tumour markers'
  if (/group|crossmatch/i.test(t)) return 'Blood bank'
  if (/viral load|PCR/i.test(t)) return 'Molecular'
  if (/histo|biopsy|cytolog|pap/i.test(t)) return 'Histopathology & cytology'
  return 'Clinical chemistry'
}

/** Safety checks a radiographer or radiologist must clear before the study. */
export function imagingChecks(patient: Patient | undefined, modality: Modality, orders: ClinicalOrder[], prep?: string) {
  if (!patient) return []
  const out: Array<{ text: string; tone: 'danger' | 'warning' | 'neutral' }> = []
  const record = `${patient.history} ${patient.riskFactors.join(' ')}`
  const contrast = ['CT', 'MRI', 'Fluoroscopy', 'Interventional', 'PET-CT'].includes(modality)
  const renal = orders.some((order) => order.patientId === patient.id && order.result && /creatinine|\bcr\b|egfr/i.test(order.title + order.result) && /high|raised|elevated/i.test(order.result)) || /kidney|renal/i.test(record)
  if (contrast && renal) out.push({ text: 'Kidney function: check before contrast', tone: 'danger' })
  patient.allergies.filter((allergy) => /contrast|iodine|gadolinium/i.test(allergy)).forEach((allergy) => out.push({ text: `Allergy: ${allergy}`, tone: 'danger' }))
  if (modality === 'MRI') out.push(/pacemaker|implant|cochlear|metal|shrapnel|clip/i.test(record) ? { text: 'Implant on record: MRI safety review', tone: 'danger' } : { text: 'MRI safety questionnaire', tone: 'warning' })
  const ionising = ['X-ray', 'CT', 'Fluoroscopy', 'Nuclear medicine', 'PET-CT', 'Mammography', 'Interventional'].includes(modality)
  if (ionising && patient.sex === 'Female' && patient.age >= 12 && patient.age <= 50) out.push(/pregnan/i.test(record) ? { text: 'Pregnant: justify or use ultrasound/MRI', tone: 'danger' } : { text: 'Confirm not pregnant', tone: 'warning' })
  if (modality === 'PET-CT' && /diabet/i.test(record)) out.push({ text: 'Diabetic: check glucose before FDG', tone: 'warning' })
  if (prep) out.push({ text: prep, tone: 'neutral' })
  return out
}

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export interface RequestFormInput {
  facility: FacilitySettings
  patient: Patient
  orders: Array<Pick<ClinicalOrder, 'id' | 'title' | 'kind' | 'priority' | 'createdAt' | 'createdBy'>>
  catalogue: InvestigationItem[]
  clinicalInfo?: string
}

/** A printable investigation request the patient takes to an outside laboratory or imaging centre. */
export function requestFormHtml({ facility, patient, orders, catalogue, clinicalInfo }: RequestFormInput) {
  const kind = orders.every((order) => order.kind === 'Imaging') ? 'Imaging' : orders.every((order) => order.kind === 'Laboratory') ? 'Laboratory' : 'Investigation'
  const rows = orders.map((order) => {
    const item = catalogueItem(order, catalogue)
    const detail = order.kind === 'Imaging' ? [modalityOf(order, catalogue), item?.prep].filter(Boolean).join(' · ') : [item?.section ?? labSectionOf(order, catalogue), item?.specimen, item?.container].filter(Boolean).join(' · ')
    return `<tr><td><b>${esc(order.title)}</b><small>${esc(detail)}</small></td><td>${esc(order.priority)}</td><td class="mono">${esc(order.id)}</td></tr>`
  }).join('')
  const first = orders[0]
  const date = new Date(first?.createdAt ?? Date.now()).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(kind)} request · ${esc(patient.name)}</title><style>
  *{box-sizing:border-box}body{font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:0;padding:28px;background:#fff}
  header{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #111;padding-bottom:10px}
  h1{font-size:19px;margin:0}h2{font-size:15px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em}
  .muted{color:#555}.mono{font-family:ui-monospace,monospace}
  dl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 18px;margin:12px 0}dt{font-size:11px;color:#555;text-transform:uppercase}dd{margin:0;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #999;padding:7px 8px;text-align:left;vertical-align:top}th{background:#f1f1f1;font-size:11px;text-transform:uppercase}
  td small{display:block;color:#555;font-weight:400;margin-top:2px}
  .box{border:1px solid #999;min-height:70px;padding:8px;margin-top:6px}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:26px}.sign div{border-top:1px solid #111;padding-top:4px;font-size:11px;color:#555}
  footer{margin-top:22px;font-size:11px;color:#555;border-top:1px dashed #999;padding-top:8px}
  @media print{body{padding:12mm}}
  </style></head><body>
  <header><div><h1>${esc(facility.name)}</h1><div class="muted">${esc([facility.type, facility.city, facility.country].filter(Boolean).join(' · '))}${facility.phone ? ` · ${esc(facility.phone)}` : ''}</div></div>
  <div style="text-align:right"><b>${esc(kind.toUpperCase())} REQUEST</b><div class="muted">${esc(date)}</div></div></header>
  <dl><div><dt>Patient</dt><dd>${esc(patient.name)}</dd></div><div><dt>MRN</dt><dd class="mono">${esc(patient.mrn)}</dd></div><div><dt>Age / sex</dt><dd>${esc(patient.age)} · ${esc(patient.sex)}</dd></div>
  <div><dt>Ward / clinic</dt><dd>${esc(patient.location)}</dd></div><div><dt>Allergies</dt><dd>${esc(patient.allergies.join(', ') || 'None known')}</dd></div><div><dt>Requested by</dt><dd>${esc(first?.createdBy)}</dd></div></dl>
  <h2>Tests requested</h2><table><thead><tr><th>${kind === 'Imaging' ? 'Study' : 'Test'}</th><th>Priority</th><th>Request no.</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Clinical information</h2><div class="box">${esc(clinicalInfo || patient.complaint)}</div>
  <h2>Result / report (to be completed by the performing laboratory or centre)</h2><div class="box" style="min-height:120px"></div>
  <div class="sign"><div>Requesting clinician — signature and stamp</div><div>Performing facility — name, signature and date</div></div>
  <footer>Not available at ${esc(facility.name)}. Please perform at any accredited laboratory or imaging centre and return the result with this form, quoting the request number. Results are added to the patient's record on return.</footer>
  </body></html>`
}

/** Prints the form through a hidden frame; returns false if the browser blocked it. */
export function printHtml(html: string) {
  try {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    if (!doc || !frame.contentWindow) { frame.remove(); return false }
    doc.open(); doc.write(html); doc.close()
    window.setTimeout(() => {
      try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch { /* blocked */ }
      window.setTimeout(() => frame.remove(), 60_000)
    }, 150)
    return true
  } catch {
    return false
  }
}

export function downloadHtml(filename: string, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
