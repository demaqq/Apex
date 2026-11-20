import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Clock3, CreditCard, Hourglass, Rocket, Send } from 'lucide-react'
import { Button, Chip, Modal, PageHeader, Panel } from './ui'
import { BillSummary } from './PlanBill'
import { lockedOn, MODULE_GROUPS, MODULES, moduleById, money, PACKAGES, withRequirements } from '../lib/modules'
import { formatDateTime } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ModuleId, PaymentMethod, PlatformInvoice, SubscriptionStatus } from '../types'

const STEPS: Array<[string, SubscriptionStatus[]]> = [['Choose services', ['Setup']], ['Approval', ['Pending approval']], ['Payment', ['Awaiting payment', 'Payment review']], ['Live', ['Active', 'Trial']]]
export const METHODS: PaymentMethod[] = ['telebirr', 'CBE Birr', 'Bank transfer', 'Card']

/** Pay a platform invoice: method and transaction reference, then the super admin confirms. */
export function PayInvoice({ invoice, compact }: { invoice: PlatformInvoice; compact?: boolean }) {
  const { payPlatformInvoice } = useHospital()
  const [method, setMethod] = useState<PaymentMethod>('telebirr')
  const [reference, setReference] = useState('')
  const vat = Math.round(invoice.amount * invoice.vatRate / (100 + invoice.vatRate) * 100) / 100
  return (
    <div className={`pay-invoice ${compact ? 'compact' : ''}`}>
      <div className="pay-amount"><span>{invoice.id} · {invoice.description}</span><strong>{money(invoice.amount)}</strong><small>incl. VAT {invoice.vatRate}% ({money(vat)})</small>{invoice.note && <em>{invoice.note}</em>}</div>
      {invoice.status === 'Issued' ? (
        <div className="pay-form">
          <label className="form-field"><span>Pay with</span><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>{METHODS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="form-field"><span>Transaction reference <b>*</b></span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. TB8812734" /></label>
          <Button icon={CreditCard} disabled={reference.trim().length < 4} onClick={() => payPlatformInvoice(invoice.id, method, reference)}>Pay {money(invoice.amount)}</Button>
        </div>
      ) : <p className="record-hint">{invoice.status === 'Payment review' ? `Paid by ${invoice.method} (${invoice.reference}) — waiting for Northstar Cloud to confirm.` : invoice.status === 'Paid' ? `Paid ${invoice.confirmedAt ? formatDateTime(invoice.confirmedAt) : ''}` : invoice.status}</p>}
    </div>
  )
}

/** Invoices from the platform, newest first, with payment for open ones. */
export function PlatformInvoices() {
  const { state } = useHospital()
  const list = state.platformInvoices
  return (
    <Panel title="Invoices from Northstar Cloud" action={<CreditCard size={17} className="muted-icon" />}>
      <div className="panel-pad invoice-list">
        {list.length === 0 && <p className="record-hint">No invoices yet.</p>}
        {list.map((invoice) => (
          <article key={invoice.id} className={`invoice-card ${invoice.status === 'Issued' ? 'open' : ''}`}>
            <header><b>{invoice.description}</b><Chip tone={invoice.status === 'Paid' ? 'success' : invoice.status === 'Issued' ? 'warning' : 'neutral'}>{invoice.status === 'Issued' ? 'To pay' : invoice.status}</Chip></header>
            <PayInvoice invoice={invoice} compact />
          </article>
        ))}
      </div>
    </Panel>
  )
}

/** First sign-in for a new client: choose services, apply, pay, go live. */
export default function Onboarding() {
  const { state, submitApplication, updateSettings } = useHospital()
  const status = state.settings.subscription ?? 'Active'
  const [off, setOff] = useState<ModuleId[]>(state.settings.offModules ?? [])
  const [name, setName] = useState(state.settings.name)
  const [type, setType] = useState(state.settings.type)
  const [confirm, setConfirm] = useState(false)
  const locks = lockedOn({ offModules: off })
  const toggle = (id: ModuleId) => setOff(off.includes(id) ? withRequirements(off, id) : locks[id] ? off : [...off, id])
  const step = STEPS.findIndex(([, states]) => states.includes(status))
  const invoice = state.platformInvoices.find((item) => item.purpose === 'Subscription' && item.status !== 'Paid' && item.status !== 'Rejected')
  const preview = { ...state, settings: { ...state.settings, offModules: off } }

  return (
    <motion.div className="ops-page onboarding" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Welcome to Northstar Cloud" title={`Set up ${state.settings.name}`} description="Choose what your hospital, clinic or diagnostic centre is made of. Northstar Cloud approves your set-up, you pay the first month, and your staff can start." />
      <ol className="onboarding-steps">{STEPS.map(([label], index) => <li key={label} className={index < step ? 'done' : index === step ? 'current' : ''}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol>

      {status === 'Setup' && <>
        {state.settings.applicationNote && <div className="integration-note"><Hourglass size={18} /><div><b>Returned by Northstar Cloud</b><span>{state.settings.applicationNote}</span></div></div>}
        <div className="plan-layout">
          <Panel title="Your facility and services">
            <div className="panel-pad">
              <div className="form-grid form-grid-2">
                <label className="form-field"><span>Facility name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
                <label className="form-field"><span>Type</span><select value={type} onChange={(event) => setType(event.target.value as typeof type)}>{['Hospital', 'Clinic', 'Health centre'].map((value) => <option key={value}>{value}</option>)}</select></label>
              </div>
              <span className="detail-heading">Start from a package</span>
              <div className="package-row">{PACKAGES.map((item) => <button key={item.id} type="button" className="package-card" onClick={() => setOff(MODULES.filter((module) => !item.on.includes(module.id)).map((module) => module.id))}><b>{item.name}</b><span>{item.description}</span></button>)}</div>
              {MODULE_GROUPS.map((group) => (
                <div key={group} className="module-group">
                  <span className="detail-heading">{group}</span>
                  <div className="mini-modules">{MODULES.filter((item) => item.group === group).map((item) => { const on = !off.includes(item.id); return <label key={item.id} className={`mini-module ${on ? 'on' : ''}`} title={on ? locks[item.id] ?? item.description : item.description}><input type="checkbox" checked={on} disabled={on && Boolean(locks[item.id])} onChange={() => toggle(item.id)} /><span>{item.name}</span></label> })}</div>
                </div>
              ))}
              <div className="panel-actions"><Button icon={Send} onClick={() => setConfirm(true)}>Submit for approval</Button></div>
            </div>
          </Panel>
          <div className="plan-bill"><BillPreview state={preview} /></div>
        </div>
      </>}

      {status === 'Pending approval' && <Panel title="Waiting for approval"><div className="panel-pad waiting"><Clock3 size={28} /><p>Northstar Cloud is reviewing your set-up: {MODULES.length - (state.settings.offModules ?? []).length} services. You will be asked to pay the first month once it is approved.</p><p className="record-hint">{MODULES.filter((item) => !(state.settings.offModules ?? []).includes(item.id)).map((item) => item.name).join(' · ')}</p></div></Panel>}

      {(status === 'Awaiting payment' || status === 'Payment review') && invoice && <Panel title="Pay to go live"><div className="panel-pad"><PayInvoice invoice={invoice} /></div></Panel>}

      {confirm && (
        <Modal open onClose={() => setConfirm(false)} title="Submit your set-up?" subtitle="Northstar Cloud will review it and send the first invoice." size="sm">
          <p className="record-hint">{MODULES.length - off.length} services: {MODULES.filter((item) => !off.includes(item.id)).map((item) => moduleById(item.id).name).join(', ')}.</p>
          <div className="modal-footer"><Button variant="ghost" onClick={() => setConfirm(false)}>Back</Button><Button icon={Rocket} onClick={() => { if (name.trim() !== state.settings.name || type !== state.settings.type) updateSettings({ name: name.trim() || state.settings.name, type }); submitApplication(off); setConfirm(false) }}>Submit</Button></div>
        </Modal>
      )}
    </motion.div>
  )
}

function BillPreview({ state }: { state: Parameters<typeof BillSummary>[0]['state'] }) {
  return <BillSummary collapsed state={state} title="Your monthly price" />
}
