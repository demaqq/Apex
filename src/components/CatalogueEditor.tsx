import { useState } from 'react'
import { FlaskConical, Lock, Plus, ScanLine, Trash2 } from 'lucide-react'
import { Button, Chip, Panel, SearchField } from './ui'
import { formatCurrency } from '../lib/format'
import { LAB_SECTIONS, MODALITIES } from '../lib/diagnostics'
import { matches } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { InvestigationItem } from '../types'

const blank = (kind: InvestigationItem['kind']) => ({ name: '', section: kind === 'Imaging' ? 'X-ray' : 'Haematology', specimen: '', container: '', refRange: '', prep: '', tat: '', price: '', inHouse: true })

/**
 * The laboratory test or imaging study catalogue. The administrator and the department head
 * (laboratory head / head of imaging) can edit; everyone else sees it read-only.
 */
export function CatalogueEditor({ kind }: { kind: InvestigationItem['kind'] }) {
  const { state, saveInvestigation, removeInvestigation, canEditCatalogue } = useHospital()
  const editable = canEditCatalogue(kind)
  const imaging = kind === 'Imaging'
  const sections: readonly string[] = imaging ? MODALITIES : LAB_SECTIONS
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('All')
  const [form, setForm] = useState(blank(kind))
  const items = state.investigations.filter((item) => item.kind === kind)
  const sectionOf = (item: InvestigationItem) => item.section ?? 'Other'
  const groups = [...sections, ...new Set(items.map(sectionOf).filter((name) => !sections.includes(name)))]
  const shown = items.filter((item) => (section === 'All' || sectionOf(item) === section) && matches(query, item.name, item.section, item.specimen, item.prep))
  const set = (key: keyof ReturnType<typeof blank>, value: string | boolean) => setForm({ ...form, [key]: value })
  const add = () => {
    if (!form.name.trim()) return
    saveInvestigation({
      id: `${imaging ? 'IM' : 'LB'}-${Date.now().toString(36)}`, name: form.name.trim(), kind, section: form.section, inHouse: form.inHouse, price: Number(form.price) || 0, active: true,
      ...(Number(form.tat) ? { tatHours: Number(form.tat) } : {}),
      ...(imaging ? (form.prep.trim() ? { prep: form.prep.trim() } : {}) : { specimen: form.specimen.trim() || undefined, container: form.container.trim() || undefined, refRange: form.refRange.trim() || undefined }),
    })
    setForm({ ...blank(kind), section: form.section })
  }
  const text = (item: InvestigationItem, key: 'specimen' | 'container' | 'refRange' | 'prep', label: string) => editable
    ? <input className="catalogue-input" defaultValue={item[key] ?? ''} aria-label={`${label} for ${item.name}`} placeholder={label} onBlur={(event) => { const value = event.target.value.trim(); if (value !== (item[key] ?? '')) saveInvestigation({ ...item, [key]: value || undefined }) }} />
    : <span>{item[key] || '—'}</span>

  return (
    <Panel className="catalogue-panel" title={imaging ? 'Imaging study catalogue' : 'Laboratory test catalogue'} action={editable ? <Chip tone="success">You can edit</Chip> : <Chip tone="neutral"><Lock size={11} /> Read only</Chip>}>
      <p className="table-footnote admin-note">{imaging
        ? 'Studies clinicians can request, by modality. Studies not done here go out on a printed request the patient takes to an imaging centre. Edited by the administrator or the head of imaging.'
        : 'Tests clinicians can request, by laboratory section, with sample, tube, turnaround and reference range. Tests not done here go out on a printed request. Edited by the administrator or the laboratory head.'}</p>
      <div className="table-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder={`Search ${imaging ? 'studies' : 'tests'}…`} />
        <div className="chip-filter" role="group" aria-label={imaging ? 'Modality' : 'Section'}>
          {['All', ...groups.filter((name) => items.some((item) => sectionOf(item) === name))].map((name) => <button key={name} type="button" className={section === name ? 'on' : ''} onClick={() => setSection(name)}>{name}<small>{name === 'All' ? items.length : items.filter((item) => sectionOf(item) === name).length}</small></button>)}
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table catalogue-table">
          <thead><tr><th>{imaging ? 'Study' : 'Test'}</th><th>{imaging ? 'Modality' : 'Section'}</th>{imaging ? <th>Preparation &amp; safety</th> : <><th>Sample &amp; tube</th><th>Reference range</th></>}<th className="num">Turnaround</th><th className="num">Price</th><th>Where</th><th>Offered</th>{editable && <th aria-label="Actions" />}</tr></thead>
          <tbody>
            {groups.filter((name) => shown.some((item) => sectionOf(item) === name)).flatMap((name) => [
              <tr key={`h-${name}`} className="catalogue-group"><th colSpan={imaging ? (editable ? 8 : 7) : (editable ? 9 : 8)}>{name}</th></tr>,
              ...shown.filter((item) => sectionOf(item) === name).map((item) => (
                <tr key={item.id} className={item.active ? '' : 'muted-row'}>
                  <td><span className="inline-icon">{imaging ? <ScanLine size={14} /> : <FlaskConical size={14} />}<b>{item.name}</b></span></td>
                  <td>{editable ? <select className="catalogue-input" value={sectionOf(item)} aria-label={`${imaging ? 'Modality' : 'Section'} for ${item.name}`} onChange={(event) => saveInvestigation({ ...item, section: event.target.value })}>{groups.map((option) => <option key={option}>{option}</option>)}</select> : sectionOf(item)}</td>
                  {imaging ? <td>{text(item, 'prep', 'Preparation')}</td> : <><td className="catalogue-pair">{text(item, 'specimen', 'Sample')}{text(item, 'container', 'Tube')}</td><td>{text(item, 'refRange', 'Reference range')}</td></>}
                  <td className="num">{editable ? <input className="inline-number" type="number" min={0} step="0.25" defaultValue={item.tatHours ?? ''} aria-label={`Turnaround hours for ${item.name}`} onBlur={(event) => { const value = Number(event.target.value) || undefined; if (value !== item.tatHours) saveInvestigation({ ...item, tatHours: value }) }} /> : null}<small>{item.tatHours ? (item.tatHours < 1 ? `${Math.round(item.tatHours * 60)} min` : item.tatHours >= 48 ? `${Math.round(item.tatHours / 24)} days` : `${item.tatHours} h`) : '—'}</small></td>
                  <td className="num">{editable && <input className="inline-number" type="number" min={0} step="0.01" defaultValue={item.price} onBlur={(event) => Number(event.target.value) !== item.price && saveInvestigation({ ...item, price: Number(event.target.value) || 0 })} aria-label={`Price of ${item.name}`} />}<small>{formatCurrency(item.price)}</small></td>
                  <td>{editable
                    ? <div className="segmented"><button type="button" className={item.inHouse ? 'on' : ''} onClick={() => saveInvestigation({ ...item, inHouse: true })}>In-house</button><button type="button" className={item.inHouse ? '' : 'on'} onClick={() => saveInvestigation({ ...item, inHouse: false })}>Sent out</button></div>
                    : item.inHouse ? <Chip tone="success">In-house</Chip> : <Chip tone="warning">Sent out</Chip>}</td>
                  <td>{editable ? <label className="switch"><input type="checkbox" checked={item.active} onChange={() => saveInvestigation({ ...item, active: !item.active })} aria-label={`Offer ${item.name}`} /><span />{item.active ? 'Yes' : 'No'}</label> : item.active ? 'Yes' : 'No'}</td>
                  {editable && <td className="row-actions"><button type="button" className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => removeInvestigation(item.id)}><Trash2 size={15} /></button></td>}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      {editable && (
        <div className="catalogue-add">
          <span className="detail-heading">Add a {imaging ? 'study' : 'test'}</span>
          <div className="form-grid form-grid-3">
            <label className="form-field"><span>Name <b>*</b></span><input value={form.name} onChange={(event) => set('name', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} placeholder={imaging ? 'e.g. CT angiogram (lower limbs)' : 'e.g. Ferritin'} /></label>
            <label className="form-field"><span>{imaging ? 'Modality' : 'Section'}</span><select value={form.section} onChange={(event) => set('section', event.target.value)}>{sections.map((option) => <option key={option}>{option}</option>)}</select></label>
            {imaging
              ? <label className="form-field"><span>Preparation &amp; safety</span><input value={form.prep} onChange={(event) => set('prep', event.target.value)} placeholder="e.g. Fast 6 hours; IV contrast" /></label>
              : <label className="form-field"><span>Sample</span><input value={form.specimen} onChange={(event) => set('specimen', event.target.value)} placeholder="e.g. Serum" /></label>}
            {!imaging && <label className="form-field"><span>Tube / container</span><input value={form.container} onChange={(event) => set('container', event.target.value)} placeholder="e.g. Plain / SST (gold)" /></label>}
            {!imaging && <label className="form-field"><span>Reference range</span><input value={form.refRange} onChange={(event) => set('refRange', event.target.value)} placeholder="e.g. 30–400 ng/mL" /></label>}
            <label className="form-field"><span>Turnaround (hours)</span><input type="number" min={0} step="0.25" value={form.tat} onChange={(event) => set('tat', event.target.value)} /></label>
            <label className="form-field"><span>Price</span><input type="number" min={0} step="0.01" value={form.price} onChange={(event) => set('price', event.target.value)} /></label>
            <div className="form-field"><span>Where it is done</span><div className="segmented"><button type="button" className={form.inHouse ? 'on' : ''} onClick={() => set('inHouse', true)}>In-house</button><button type="button" className={form.inHouse ? '' : 'on'} onClick={() => set('inHouse', false)}>Sent out</button></div></div>
          </div>
          <div className="panel-actions"><Button icon={Plus} disabled={!form.name.trim()} onClick={add}>Add {imaging ? 'study' : 'test'}</Button></div>
        </div>
      )}
    </Panel>
  )
}
