import { useState } from 'react'
import { Plus, Sparkles, Tags } from 'lucide-react'
import { Button, Chip, Panel } from './ui'
import { vatIn } from '../data'
import { formatCurrency } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { DepartmentId, HospitalService, ServiceCategory } from '../types'

export const CATEGORIES: ServiceCategory[] = ['Consultation', 'Emergency', 'Bed & nursing', 'Procedure', 'Laboratory', 'Imaging', 'Pharmacy', 'Therapy', 'Other']
const STATUS_TONE: Record<HospitalService['status'], 'success' | 'warning' | 'neutral' | 'danger'> = { Live: 'success', 'Pending approval': 'warning', 'Awaiting payment': 'warning', 'Payment review': 'neutral', Declined: 'danger' }
const STATUS_TEXT: Record<HospitalService['status'], string> = { Live: 'Live', 'Pending approval': 'Waiting for Northstar Cloud', 'Awaiting payment': 'Approved — pay to launch', 'Payment review': 'Payment being confirmed', Declined: 'Declined' }

/** The facility's own services and VAT-inclusive prices, set by the administrator. New services go to the super admin. */
export function ServicesEditor() {
  const { state, saveService, requestService, updateSettings } = useHospital()
  const vat = state.settings.vatRate ?? 15
  const [form, setForm] = useState({ name: '', category: 'Consultation' as ServiceCategory, department: '' as DepartmentId | '', unit: 'each', price: '', description: '' })
  const [vatInput, setVatInput] = useState(String(vat))
  const live = state.services.filter((item) => item.status === 'Live')
  const pending = state.services.filter((item) => item.status !== 'Live')
  const featured = live.filter((item) => item.featured)
  const submit = () => {
    if (form.name.trim().length < 3 || !(Number(form.price) > 0)) return
    requestService({ name: form.name.trim(), category: form.category, ...(form.department ? { department: form.department } : {}), unit: form.unit.trim() || 'each', price: Number(form.price), ...(form.description.trim() ? { description: form.description.trim() } : {}) })
    setForm({ ...form, name: '', price: '', description: '' })
  }
  const dept = (id?: DepartmentId) => id ? state.departments.find((item) => item.id === id)?.shortName : 'All departments'

  return <>
    {featured.length > 0 && <div className="featured-strip"><Sparkles size={16} /><span>Featured</span>{featured.map((item) => <Chip key={item.id} tone="accent">{item.name}</Chip>)}</div>}
    <Panel title="Services & prices" action={<Tags size={17} className="muted-icon" />}>
      <div className="panel-pad">
        <p className="table-footnote admin-note">Your own price for each service. Every price includes VAT; bills show the VAT inside the total. Prices for laboratory tests and imaging studies are set in their catalogues under Investigations.</p>
        <div className="vat-setting">
          <label className="form-field"><span>VAT included in prices (%)</span><input type="number" min={0} max={50} value={vatInput} onChange={(event) => setVatInput(event.target.value)} /></label>
          <Button size="sm" variant="secondary" disabled={Number(vatInput) === vat} onClick={() => updateSettings({ vatRate: Math.max(0, Math.min(50, Number(vatInput) || 0)) })}>Save VAT rate</Button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Service</th><th>Department</th><th>Unit</th><th className="num">Price incl. VAT</th><th>Offered</th></tr></thead>
          <tbody>
            {CATEGORIES.filter((category) => live.some((item) => item.category === category)).flatMap((category) => [
              <tr key={`h-${category}`} className="catalogue-group"><th colSpan={5}>{category}</th></tr>,
              ...live.filter((item) => item.category === category).map((item) => (
                <tr key={item.id} className={item.active ? '' : 'muted-row'}>
                  <td className="wrap"><b>{item.name}</b>{item.featured && <Chip tone="accent">Featured</Chip>}{item.custom && <Chip tone="neutral">Custom</Chip>}{item.description && <small>{item.description}</small>}</td>
                  <td>{dept(item.department)}</td>
                  <td>{item.unit}</td>
                  <td className="num"><input className="inline-number" type="number" min={0} step="0.5" defaultValue={item.price} aria-label={`Price of ${item.name}`} onBlur={(event) => { const price = Number(event.target.value) || 0; if (price !== item.price) saveService({ ...item, price }) }} /><small>VAT {formatCurrency(vatIn(item.price, vat))}</small></td>
                  <td><label className="switch"><input type="checkbox" checked={item.active} onChange={() => saveService({ ...item, active: !item.active })} aria-label={`Offer ${item.name}`} /><span />{item.active ? 'Yes' : 'No'}</label></td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel title="Add a new service" action={<Plus size={17} className="muted-icon" />}>
      <div className="panel-pad">
        <p className="table-footnote admin-note">For something you don’t offer yet — a new clinic, procedure or programme. Northstar Cloud confirms it and sends an invoice for any set-up fee; once paid it goes live and is featured.</p>
        <div className="form-grid form-grid-3">
          <label className="form-field"><span>Service name <b>*</b></span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Sleep apnoea clinic" /></label>
          <label className="form-field"><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ServiceCategory })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="form-field"><span>Department</span><select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value as DepartmentId | '' })}><option value="">All departments</option>{state.departments.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Charged</span><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="each, per visit, per day" /></label>
          <label className="form-field"><span>Price incl. VAT <b>*</b></span><input type="number" min={0} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
          <label className="form-field"><span>Description</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What patients get" /></label>
        </div>
        <div className="panel-actions"><Button icon={Plus} disabled={form.name.trim().length < 3 || !(Number(form.price) > 0)} onClick={submit}>Send for approval</Button></div>
        {pending.length > 0 && <div className="pending-services">
          <span className="detail-heading">Requested services</span>
          {pending.map((item) => (
            <article key={item.id} className="invoice-card">
              <header><b>{item.name}</b><Chip tone={STATUS_TONE[item.status]}>{STATUS_TEXT[item.status]}</Chip></header>
              <small className="muted-text">{item.category} · {dept(item.department)} · {formatCurrency(item.price)} {item.unit} to patients{item.setupFee !== undefined ? ` · set-up ${formatCurrency(item.setupFee)}, ${formatCurrency(item.monthlyFee ?? 0)}/month on your plan` : ''}</small>
              {item.decisionNote && <p className="record-hint">Northstar Cloud: {item.decisionNote}</p>}
              {item.status === 'Awaiting payment' && <p className="record-hint">Pay the invoice under Plan &amp; modules to launch it.</p>}
            </article>
          ))}
        </div>}
      </div>
    </Panel>
  </>
}
