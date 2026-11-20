import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Cloud, Save, Tags } from 'lucide-react'
import { Button, Chip, PageHeader, Panel } from '../components/ui'
import { BillSummary } from '../components/PlanBill'
import { estimateBill, MODULE_GROUPS, MODULES, money } from '../lib/modules'
import { useHospital } from '../store/HospitalStore'
import type { ModuleId, PriceList } from '../types'

type Rate = Exclude<keyof PriceList, 'modules' | 'currency'>
const RATES: Array<[Rate, string, string]> = [
  ['platform', 'Platform fee', 'per month: records, staff, roles, audit, administration'],
  ['perDepartment', 'Per clinical department', 'per month, after the included ones'],
  ['includedDepartments', 'Departments included', 'count'],
  ['perUser', 'Per staff account', 'per month, after the included ones'],
  ['includedUsers', 'Staff accounts included', 'count'],
  ['perBed', 'Per bed', 'per month (with Inpatient wards)'],
  ['perVisit', 'Per patient visit', 'each visit in the month'],
  ['perLabTest', 'Per laboratory test', 'done in-house'],
  ['perImagingStudy', 'Per imaging study', 'done in-house'],
]

/** The SaaS provider's console: the price list and this client's plan and invoice. */
export default function Platform() {
  const { state, can, savePricing } = useHospital()
  const [form, setForm] = useState<PriceList>(state.pricing)
  if (!can('pricing')) return <Panel><p className="table-footnote">Only the platform provider can open this console.</p></Panel>
  const dirty = JSON.stringify(form) !== JSON.stringify(state.pricing)
  const setRate = (key: Rate, value: string) => setForm({ ...form, [key]: Math.max(0, Number(value) || 0) })
  const setModule = (id: ModuleId, value: string) => setForm({ ...form, modules: { ...form.modules, [id]: Math.max(0, Number(value) || 0) } })
  const off = state.settings.offModules ?? []
  const preview = estimateBill(state, form)
  const everything = estimateBill({ ...state, settings: { ...state.settings, offModules: [] } }, form)

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Northstar Cloud · Platform console" title="Prices and plans" description="Set what each module and each unit of usage costs. Clients choose their modules; their bill follows what they switch on and how much they use."
        actions={<Button icon={Save} disabled={!dirty} onClick={() => savePricing(form)}>Save price list</Button>} />
      <div className="plan-layout">
        <div className="plan-modules">
          <Panel title="Price list" action={<Tags size={17} className="muted-icon" />}>
            <div className="form-grid form-grid-3 admin-form">
              <label className="form-field"><span>Currency</span><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as PriceList['currency'] })}>{['USD', 'ETB', 'EUR'].map((value) => <option key={value}>{value}</option>)}</select></label>
              {RATES.map(([key, label, hint]) => <label key={key} className="form-field"><span>{label} <small className="muted-text">{hint}</small></span><input type="number" min={0} step={key.startsWith('included') ? 1 : 0.05} value={form[key]} onChange={(event) => setRate(key, event.target.value)} /></label>)}
            </div>
            {MODULE_GROUPS.map((group) => (
              <div key={group} className="module-group">
                <span className="detail-heading">{group}</span>
                <div className="price-grid">
                  {MODULES.filter((item) => item.group === group).map((item) => (
                    <label key={item.id} className="price-row">
                      <span><b>{item.name}</b>{off.includes(item.id) ? <Chip tone="neutral">Off for client</Chip> : <Chip tone="success">On</Chip>}</span>
                      <input type="number" min={0} step={5} value={form.modules[item.id]} onChange={(event) => setModule(item.id, event.target.value)} aria-label={`${item.name} monthly price`} />
                      <small>/month</small>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {dirty && <p className="table-footnote">Unsaved: this client’s bill would be {money(preview.total, form.currency)} a month (now {money(estimateBill(state, state.pricing).total, state.pricing.currency)}).</p>}
          </Panel>
        </div>
        <div className="plan-bill">
          <Panel title="Client" action={<Building2 size={17} className="muted-icon" />}>
            <div className="panel-pad">
            <div className="client-card"><span className="client-mark"><Cloud size={18} /></span><div><b>{state.settings.name}</b><small>{state.settings.type} · {[state.settings.city, state.settings.country].filter(Boolean).join(', ')}</small></div></div>
            <p className="record-hint">{MODULES.length - off.length} of {MODULES.length} modules on · with everything on: {money(everything.total, form.currency)} a month.</p>
            </div>
          </Panel>
          <BillSummary title="Invoice preview" />
        </div>
      </div>
    </motion.div>
  )
}
