import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Building2, Check, CircleDollarSign, Link2, Plus, Save, Settings2, UsersRound, X } from 'lucide-react'
import { Button, Chip, Metric, Modal, PageHeader, Panel, Tabs } from '../components/ui'
import { ServiceChips } from '../components/NetworkPanel'
import { lockedOn, MODULE_GROUPS, MODULES, money, moduleById, tenantBill, withRequirements } from '../lib/modules'
import { LINK_NOTE } from '../lib/network'
import { formatDate } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ModuleId, NetworkFacility, NetworkService, PriceList, SubscriptionStatus, Tenant } from '../types'

type View = 'overview' | 'approvals' | 'clients' | 'pricing' | 'network'
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
const STATUS_TONE: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = { Active: 'success', Trial: 'warning', Suspended: 'danger', Setup: 'neutral', 'Pending approval': 'warning', 'Awaiting payment': 'warning', 'Payment review': 'warning' }

/** Super admin console: every subscribed client, the price list and the care network. */
export default function Platform() {
  const { state, can } = useHospital()
  const [view, setView] = useState<View>('overview')
  if (!can('pricing')) return <Panel><p className="table-footnote">Only the super admin can open this console.</p></Panel>
  const pending = state.connections.filter((item) => item.status === 'Requested').length
  const approvals = (state.settings.subscription === 'Pending approval' ? 1 : 0) + state.services.filter((item) => item.status === 'Pending approval').length + state.platformInvoices.filter((item) => item.status === 'Payment review').length
  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Northstar Cloud · Super admin" title="Platform console" description="Every subscribed client, what they have switched on, what they use and what they pay — calculated automatically from your price list. Approve network connections between facilities." />
      <Tabs<View> label="Console" value={view} onChange={setView} options={[
        { value: 'overview', label: 'Overview' },
        { value: 'approvals', label: 'Approvals', count: approvals || undefined },
        { value: 'clients', label: 'Clients', count: state.tenants.length },
        { value: 'pricing', label: 'Pricing' },
        { value: 'network', label: 'Network', count: pending || undefined },
      ]} />
      {view === 'overview' && <Overview onOpen={setView} />}
      {view === 'clients' && <Clients />}
      {view === 'pricing' && <Pricing />}
      {view === 'network' && <NetworkAdmin />}
      {view === 'approvals' && <Approvals />}
    </motion.div>
  )
}

const nameOf = (tenant: Tenant, facilityName: string) => tenant.live ? facilityName : tenant.name
const offOf = (tenant: Tenant, liveOff: ModuleId[]) => tenant.live ? liveOff : tenant.offModules

function useClients() {
  const { state } = useHospital()
  const liveOff = state.settings.offModules ?? []
  return state.tenants.map((tenant) => {
    const status = tenant.live ? state.settings.subscription ?? tenant.status : tenant.status
    const bill = tenantBill({ ...tenant, offModules: offOf(tenant, liveOff) }, state, state.pricing)
    return { tenant, name: nameOf(tenant, state.settings.name), status, off: offOf(tenant, liveOff), bill, billable: status === 'Active' ? bill.total : 0 }
  })
}

function Overview({ onOpen }: { onOpen: (view: View) => void }) {
  const { state } = useHospital()
  const clients = useClients()
  const mrr = clients.reduce((sum, client) => sum + client.billable, 0)
  const trialValue = clients.filter((client) => client.status === 'Trial').reduce((sum, client) => sum + client.bill.total, 0)
  const pending = state.connections.filter((item) => item.status === 'Requested')
  const max = Math.max(...clients.map((client) => client.bill.total), 1)
  const cur = state.pricing.currency
  return <>
    <div className="metrics-grid">
      <Metric label="Clients" value={clients.length} detail={`${clients.filter((c) => c.status === 'Active').length} active · ${clients.filter((c) => c.status === 'Trial').length} trial · ${clients.filter((c) => c.status === 'Suspended').length} suspended`} icon={Building2} tone="blue" />
      <Metric label="Monthly revenue" value={money(mrr, cur)} detail={`Active clients · ${money(trialValue, cur)} more when trials convert`} icon={CircleDollarSign} tone="teal" />
      <Metric label="Staff on the platform" value={clients.reduce((sum, client) => sum + client.bill.usage.users, 0)} detail={`${clients.reduce((sum, client) => sum + client.bill.usage.visits, 0).toLocaleString()} patient visits in 30 days`} icon={UsersRound} tone="amber" />
      <Metric label="Connection requests" value={pending.length} detail={`${state.connections.filter((item) => item.status === 'Active').length} active connections`} icon={Link2} tone="coral" />
    </div>
    <div className="plan-layout">
      <Panel title="Monthly bill by client" action={<Button size="sm" variant="secondary" onClick={() => onOpen('clients')}>Manage clients</Button>}>
        <div className="panel-pad revenue-bars">
          {[...clients].sort((a, b) => b.bill.total - a.bill.total).map((client) => (
            <div key={client.tenant.id} className="revenue-row">
              <span><b>{client.name}</b><small>{client.tenant.type} · {client.bill.usage.modules} modules</small></span>
              <div className="revenue-track"><i style={{ width: `${(client.bill.total / max) * 100}%` }} className={client.status.toLowerCase()} /></div>
              <strong>{money(client.bill.total, cur)}</strong>
              <Chip tone={STATUS_TONE[client.status]}>{client.status}</Chip>
            </div>
          ))}
        </div>
      </Panel>
      <div className="plan-bill">
        <Panel title="Needs attention" action={<AlertTriangle size={17} className="muted-icon" />}>
          <div className="panel-pad attention-list">
            {state.settings.subscription === 'Pending approval' && <button type="button" onClick={() => onOpen('approvals')}><b>New client application</b><span>{state.settings.name} · {MODULES.length - (state.settings.offModules ?? []).length} services</span></button>}
            {state.platformInvoices.filter((item) => item.status === 'Payment review').map((item) => <button key={item.id} type="button" onClick={() => onOpen('approvals')}><b>Payment to confirm</b><span>{item.id} · {money(item.amount, state.pricing.currency)} by {item.method}</span></button>)}
            {state.services.filter((item) => item.status === 'Pending approval').map((item) => <button key={item.id} type="button" onClick={() => onOpen('approvals')}><b>New service request</b><span>{state.settings.name} · {item.name}</span></button>)}
            {pending.map((item) => <button key={item.id} type="button" onClick={() => onOpen('network')}><b>Connection request</b><span>{state.settings.name} → {state.network.find((f) => f.id === item.facilityId)?.name}</span></button>)}
            {clients.filter((c) => c.status === 'Trial').map((c) => <button key={c.tenant.id} type="button" onClick={() => onOpen('clients')}><b>Trial</b><span>{c.name} · since {formatDate(c.tenant.since)} · would pay {money(c.bill.total, cur)}</span></button>)}
            {clients.filter((c) => c.status === 'Suspended').map((c) => <button key={c.tenant.id} type="button" onClick={() => onOpen('clients')}><b>Suspended</b><span>{c.name} · staff cannot sign in</span></button>)}
            {!pending.length && !clients.some((c) => c.status !== 'Active') && <p className="record-hint">Nothing waiting.</p>}
          </div>
        </Panel>
        <Panel title="Module adoption">
          <div className="panel-pad adoption">
            {MODULES.map((item) => { const n = clients.filter((c) => !c.off.includes(item.id)).length; return <div key={item.id}><span>{item.name}</span><div className="revenue-track"><i style={{ width: `${(n / clients.length) * 100}%` }} /></div><small>{n}/{clients.length}</small></div> })}
          </div>
        </Panel>
      </div>
    </div>
  </>
}

function Clients() {
  const { state } = useHospital()
  const clients = useClients()
  const [editing, setEditing] = useState<string | null>(null)
  const cur = state.pricing.currency
  return <>
    <Panel title="Subscribed clients" action={<Building2 size={17} className="muted-icon" />}>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Client</th><th>Status</th><th>Modules</th><th>Usage (30 days)</th><th className="num">Monthly bill</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {clients.map(({ tenant, name, status, off, bill }) => (
              <tr key={tenant.id}>
                <td className="wrap"><b>{name}</b>{tenant.live && <Chip tone="accent">This demo</Chip>}<small>{tenant.type} · {tenant.city} · {tenant.contact}</small></td>
                <td><Chip tone={STATUS_TONE[status]}>{status}</Chip><small>since {formatDate(tenant.since)}</small></td>
                <td className="wrap client-modules">{MODULES.length - off.length}/{MODULES.length}<small>{off.length ? `Off: ${off.slice(0, 3).map((id) => moduleById(id).name).join(', ')}${off.length > 3 ? ` +${off.length - 3}` : ''}` : 'Everything'}</small></td>
                <td className="wrap">{bill.usage.users} staff · {bill.usage.beds} beds<small>{bill.usage.visits.toLocaleString()} visits · {bill.usage.labTests.toLocaleString()} tests · {bill.usage.imagingStudies.toLocaleString()} studies</small></td>
                <td className="num"><b>{money(bill.total, cur)}</b>{tenant.discount > 0 && <small>{tenant.discount}% discount</small>}{status !== 'Active' && <small>{status === 'Trial' ? 'not billed during trial' : status === 'Suspended' ? 'not billed while suspended' : `not live yet · ${status.toLowerCase()}`}</small>}</td>
                <td className="row-actions"><Button size="sm" variant="secondary" icon={Settings2} onClick={() => setEditing(tenant.id)}>Manage</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-footnote">Each bill is calculated automatically from the client’s switched-on modules, departments and usage with your price list. Usage for this demo facility is counted live from its records.</p>
    </Panel>
    {editing && <ClientModal id={editing} onClose={() => setEditing(null)} />}
  </>
}

function ClientModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, updateTenant } = useHospital()
  const tenant = state.tenants.find((item) => item.id === id)!
  const liveOff = state.settings.offModules ?? []
  const [status, setStatus] = useState<SubscriptionStatus>(tenant.live ? state.settings.subscription ?? tenant.status : tenant.status)
  const [off, setOff] = useState<ModuleId[]>(offOf(tenant, liveOff))
  const [discount, setDiscount] = useState(tenant.discount)
  const locks = lockedOn({ offModules: off })
  const bill = tenantBill({ ...tenant, offModules: off, discount }, { ...state, settings: { ...state.settings, offModules: off }, tenants: state.tenants.map((item) => item.id === id ? { ...item, discount } : item) }, state.pricing)
  const toggle = (module: ModuleId) => setOff(off.includes(module) ? withRequirements(off, module) : locks[module] ? off : [...off, module])
  return (
    <Modal open onClose={onClose} title={nameOf(tenant, state.settings.name)} subtitle={`${tenant.type} · ${tenant.city} · ${tenant.contact}`} size="lg">
      <div className="form-grid form-grid-3">
        <div className="form-field"><span>Subscription</span><div className="segmented">{(['Setup', 'Active', 'Trial', 'Suspended'] as SubscriptionStatus[]).map((value) => <button key={value} type="button" className={status === value ? 'on' : ''} onClick={() => setStatus(value)}>{value}</button>)}</div>{status === 'Suspended' && <small className="muted-text">Staff cannot sign in while suspended. Data is kept.</small>}{status === 'Setup' && tenant.live && <small className="muted-text">The administrator chooses services again and re-applies.</small>}</div>
        <label className="form-field"><span>Discount %</span><input type="number" min={0} max={100} value={discount} onChange={(event) => setDiscount(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></label>
        <div className="form-field"><span>Monthly bill</span><strong className="client-bill">{money(bill.total, state.pricing.currency)}</strong></div>
      </div>
      {MODULE_GROUPS.map((group) => (
        <div key={group} className="module-group">
          <span className="detail-heading">{group}</span>
          <div className="mini-modules">{MODULES.filter((item) => item.group === group).map((item) => { const on = !off.includes(item.id); return <label key={item.id} className={`mini-module ${on ? 'on' : ''}`} title={on ? locks[item.id] : undefined}><input type="checkbox" checked={on} disabled={on && Boolean(locks[item.id])} onChange={() => toggle(item.id)} /><span>{item.name}</span></label> })}</div>
        </div>
      ))}
      <div className="modal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={Save} onClick={() => { updateTenant(id, { status, offModules: off, discount }, 'updated the subscription'); onClose() }}>Save</Button></div>
    </Modal>
  )
}

function Pricing() {
  const { state, savePricing } = useHospital()
  const [form, setForm] = useState<PriceList>(state.pricing)
  const clients = useClients()
  const dirty = JSON.stringify(form) !== JSON.stringify(state.pricing)
  const setRate = (key: Rate, value: string) => setForm({ ...form, [key]: Math.max(0, Number(value) || 0) })
  const setModule = (id: ModuleId, value: string) => setForm({ ...form, modules: { ...form.modules, [id]: Math.max(0, Number(value) || 0) } })
  const mrrNow = clients.reduce((sum, client) => sum + client.billable, 0)
  const mrrNew = clients.reduce((sum, client) => sum + (client.status === 'Active' ? tenantBill({ ...client.tenant, offModules: client.off }, state, form).total : 0), 0)
  return (
    <Panel title="Price list" action={<Button size="sm" icon={Save} disabled={!dirty} onClick={() => savePricing(form)}>Save price list</Button>}>
      <p className="table-footnote admin-note">Clients never type a price: their bill is calculated from these rates and what they switch on. Changes apply to every client from the next bill.</p>
      <div className="form-grid form-grid-3 admin-form">
        <label className="form-field"><span>VAT included (%) <small className="muted-text">all prices are VAT inclusive</small></span><input type="number" min={0} max={50} value={form.vatRate} onChange={(event) => setForm({ ...form, vatRate: Math.max(0, Math.min(50, Number(event.target.value) || 0)) })} /></label>
        <label className="form-field"><span>Currency</span><select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as PriceList['currency'] })}>{['USD', 'ETB', 'EUR'].map((value) => <option key={value}>{value}</option>)}</select></label>
        {RATES.map(([key, label, hint]) => <label key={key} className="form-field"><span>{label} <small className="muted-text">{hint}</small></span><input type="number" min={0} step={key.startsWith('included') ? 1 : 0.05} value={form[key]} onChange={(event) => setRate(key, event.target.value)} /></label>)}
      </div>
      {MODULE_GROUPS.map((group) => (
        <div key={group} className="module-group">
          <span className="detail-heading">{group}</span>
          <div className="price-grid">
            {MODULES.filter((item) => item.group === group).map((item) => (
              <label key={item.id} className="price-row">
                <span><b>{item.name}</b><small>{clients.filter((c) => !c.off.includes(item.id)).length} clients</small></span>
                <input type="number" min={0} step={5} value={form.modules[item.id]} onChange={(event) => setModule(item.id, event.target.value)} aria-label={`${item.name} monthly price`} />
                <small>/month</small>
              </label>
            ))}
          </div>
        </div>
      ))}
      <p className="table-footnote">Monthly revenue from active clients: {money(mrrNow, state.pricing.currency)}{dirty ? ` → ${money(mrrNew, form.currency)} with these changes` : ''}.</p>
    </Panel>
  )
}

const KINDS: NetworkFacility['kind'][] = ['Hospital', 'Diagnostic centre', 'Laboratory', 'Imaging centre']
const LINKS: NetworkFacility['link'][] = ['Platform', 'HL7 FHIR', 'Partner API']
const SERVICES: NetworkService[] = ['Laboratory', 'Imaging', 'Referrals']

function NetworkAdmin() {
  const { state, setConnectionStatus, saveNetworkFacility } = useHospital()
  const [form, setForm] = useState<NetworkFacility | null>(null)
  const facility = (id: string) => state.network.find((item) => item.id === id)
  return <>
    <Panel title="Connections between facilities" action={<Link2 size={17} className="muted-icon" />}>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>From</th><th>To</th><th>Services</th><th>Status</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {state.connections.map((connection) => {
              const to = facility(connection.facilityId)
              return (
                <tr key={connection.id}>
                  <td><b>{state.settings.name}</b><small>requested by {connection.requestedBy} · {formatDate(connection.requestedAt)}</small></td>
                  <td><b>{to?.name}</b><small>{to?.kind} · {to?.link}</small></td>
                  <td><ServiceChips services={connection.services} />{connection.note && <small>{connection.note}</small>}</td>
                  <td><Chip tone={connection.status === 'Active' ? 'success' : connection.status === 'Requested' ? 'warning' : connection.status === 'Declined' ? 'danger' : 'neutral'}>{connection.status}</Chip></td>
                  <td className="row-actions">
                    {connection.status === 'Requested' && <><Button size="sm" icon={Check} onClick={() => setConnectionStatus(connection.id, 'Active')}>Approve</Button><Button size="sm" variant="ghost" icon={X} onClick={() => setConnectionStatus(connection.id, 'Declined')}>Decline</Button></>}
                    {connection.status === 'Active' && <Button size="sm" variant="secondary" onClick={() => setConnectionStatus(connection.id, 'Paused')}>Pause</Button>}
                    {connection.status === 'Paused' && <Button size="sm" onClick={() => setConnectionStatus(connection.id, 'Active')}>Resume</Button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
    <Panel title="Care network directory" action={<Button size="sm" icon={Plus} onClick={() => setForm({ id: '', name: '', kind: 'Diagnostic centre', city: '', services: ['Laboratory'], link: 'Platform', capabilities: '' })}>Add facility</Button>}>
      <div className="card-grid admin-cards">
        {state.network.map((item) => (
          <article key={item.id} className="work-card">
            <header><b>{item.name}</b><Chip tone={item.link === 'Platform' ? 'success' : 'neutral'}>{item.link}</Chip></header>
            <p className="work-card-reason"><Chip tone="neutral">{item.kind}</Chip> {item.city} · {item.capabilities}</p>
            <ServiceChips services={item.services} />
            <footer><small>{LINK_NOTE[item.link]}</small><Button size="sm" variant="secondary" onClick={() => setForm(item)}>Edit</Button></footer>
          </article>
        ))}
      </div>
    </Panel>
    {form && (
      <Modal open onClose={() => setForm(null)} title={form.id ? `Edit ${form.name}` : 'Add a facility to the network'} subtitle="Hospitals, diagnostic centres, laboratories and imaging centres clients can connect to" size="md">
        <div className="form-grid form-grid-2">
          <label className="form-field span-2"><span>Name <b>*</b></span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field"><span>Type</span><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as NetworkFacility['kind'] })}>{KINDS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="form-field"><span>City</span><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <div className="form-field span-2"><span>Services</span><div className="segmented">{SERVICES.map((service) => <button key={service} type="button" className={form.services.includes(service) ? 'on' : ''} onClick={() => setForm({ ...form, services: form.services.includes(service) ? form.services.filter((value) => value !== service) : [...form.services, service] })}>{service}</button>)}</div></div>
          <label className="form-field"><span>Connection</span><select value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value as NetworkFacility['link'] })}>{LINKS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="form-field"><span>Capabilities</span><input value={form.capabilities} onChange={(event) => setForm({ ...form, capabilities: event.target.value })} placeholder="e.g. MRI 3T, PET-CT" /></label>
        </div>
        <div className="modal-footer"><Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button icon={Save} disabled={form.name.trim().length < 3 || !form.services.length} onClick={() => { saveNetworkFacility({ ...form, id: form.id || `net-${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, name: form.name.trim() }); setForm(null) }}>Save</Button></div>
      </Modal>
    )}
  </>
}

/** Applications, new service requests and payments waiting for the super admin. */
function Approvals() {
  const { state, reviewApplication, decideService, confirmPlatformPayment } = useHospital()
  const [note, setNote] = useState('')
  const [fees, setFees] = useState<Record<string, { setup: string; monthly: string; note: string }>>({})
  const cur = state.pricing.currency
  const application = state.settings.subscription === 'Pending approval'
  const bill = tenantBill(state.tenants.find((item) => item.live)!, state, state.pricing)
  const requests = state.services.filter((item) => item.status === 'Pending approval')
  const payments = state.platformInvoices.filter((item) => item.status === 'Payment review')
  const fee = (id: string) => fees[id] ?? { setup: '50', monthly: '15', note: '' }
  const setFee = (id: string, key: 'setup' | 'monthly' | 'note', value: string) => setFees({ ...fees, [id]: { ...fee(id), [key]: value } })
  return <>
    <Panel title="New client applications" action={<Building2 size={17} className="muted-icon" />}>
      <div className="panel-pad">
        {!application ? <p className="record-hint">No applications waiting.</p> : (
          <article className="invoice-card open">
            <header><b>{state.settings.name}</b><Chip tone="warning">Pending approval</Chip></header>
            <p className="record-hint">{state.settings.type} · {state.settings.city} · {MODULES.length - (state.settings.offModules ?? []).length} services: {MODULES.filter((item) => !(state.settings.offModules ?? []).includes(item.id)).map((item) => item.name).join(', ')}.</p>
            <p><b>First month: {money(bill.total, cur)}</b> <small className="muted-text">incl. VAT {bill.vatRate}% ({money(bill.vat, cur)})</small></p>
            <label className="form-field"><span>Note to the client (optional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Welcome aboard / please add Emergency & triage" /></label>
            <div className="panel-actions"><Button variant="ghost" onClick={() => { reviewApplication(false, note); setNote('') }}>Return for changes</Button><Button icon={Check} onClick={() => { reviewApplication(true, note); setNote('') }}>Approve and send invoice</Button></div>
          </article>
        )}
      </div>
    </Panel>
    <Panel title="New service requests" action={<Plus size={17} className="muted-icon" />}>
      <div className="panel-pad invoice-list">
        {requests.length === 0 && <p className="record-hint">No service requests waiting.</p>}
        {requests.map((item) => (
          <article key={item.id} className="invoice-card open">
            <header><b>{item.name}</b><Chip tone="warning">{state.settings.name}</Chip></header>
            <p className="record-hint">{item.category} · {item.department ? state.departments.find((d) => d.id === item.department)?.name : 'All departments'} · patients pay {money(item.price, cur)} {item.unit}. {item.description}</p>
            <div className="form-grid form-grid-3">
              <label className="form-field"><span>Set-up fee incl. VAT</span><input type="number" min={0} value={fee(item.id).setup} onChange={(event) => setFee(item.id, 'setup', event.target.value)} /></label>
              <label className="form-field"><span>Monthly fee incl. VAT</span><input type="number" min={0} value={fee(item.id).monthly} onChange={(event) => setFee(item.id, 'monthly', event.target.value)} /></label>
              <label className="form-field"><span>Note</span><input value={fee(item.id).note} onChange={(event) => setFee(item.id, 'note', event.target.value)} /></label>
            </div>
            <div className="panel-actions"><Button variant="ghost" icon={X} onClick={() => decideService(item.id, false, 0, 0, fee(item.id).note)}>Decline</Button><Button icon={Check} onClick={() => decideService(item.id, true, Number(fee(item.id).setup) || 0, Number(fee(item.id).monthly) || 0, fee(item.id).note)}>Approve and invoice</Button></div>
          </article>
        ))}
      </div>
    </Panel>
    <Panel title="Payments to confirm" action={<CircleDollarSign size={17} className="muted-icon" />}>
      <div className="panel-pad invoice-list">
        {payments.length === 0 && <p className="record-hint">No payments waiting.</p>}
        {payments.map((item) => (
          <article key={item.id} className="invoice-card open">
            <header><b>{item.id} · {item.description}</b><strong>{money(item.amount, cur)}</strong></header>
            <p className="record-hint">{state.settings.name} paid by {item.method}, reference {item.reference}. Includes VAT {item.vatRate}%.</p>
            <div className="panel-actions"><Button variant="ghost" onClick={() => confirmPlatformPayment(item.id, false)}>Not received</Button><Button icon={Check} onClick={() => confirmPlatformPayment(item.id, true)}>Confirm payment</Button></div>
          </article>
        ))}
      </div>
    </Panel>
    <Panel title="Invoice history">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Invoice</th><th>Client</th><th>For</th><th className="num">Amount incl. VAT</th><th>Status</th></tr></thead>
          <tbody>{state.platformInvoices.map((item) => <tr key={item.id}><td className="mono">{item.id}<small>{formatDate(item.issuedAt)}</small></td><td>{state.settings.name}</td><td className="wrap">{item.description}</td><td className="num">{money(item.amount, cur)}<small>VAT {money(Math.round(item.amount * item.vatRate / (100 + item.vatRate) * 100) / 100, cur)}</small></td><td><Chip tone={item.status === 'Paid' ? 'success' : item.status === 'Issued' ? 'warning' : 'neutral'}>{item.status}</Chip></td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  </>
}

