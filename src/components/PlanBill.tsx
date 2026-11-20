import { Receipt } from 'lucide-react'
import { Panel } from './ui'
import { estimateBill, money } from '../lib/modules'
import { useHospital } from '../store/HospitalStore'
import type { PriceList } from '../types'

/** The client's estimated monthly invoice: platform, modules, departments and usage. */
export function BillSummary({ title = 'Your monthly price', collapsed = false, state: override }: { title?: string; collapsed?: boolean; state?: Parameters<typeof estimateBill>[0] & { pricing: PriceList } }) {
  const { state: live } = useHospital()
  const state = override ?? live
  const prices = state.pricing
  const { lines, total, usage, vat, vatRate } = estimateBill(state, prices)
  const group = (kind: string) => lines.filter((line) => line.kind === kind)
  const section = (label: string, kind: string) => group(kind).length > 0 && (
    <div className="bill-group">
      <span>{label}</span>
      {group(kind).map((line) => <div key={line.label} className="bill-line"><div><b>{line.label}</b>{line.kind !== 'module' && <small>{line.detail}</small>}</div><strong>{money(line.amount, prices.currency)}</strong></div>)}
    </div>
  )
  return (
    <Panel className="bill-panel" title={title} action={<Receipt size={17} className="muted-icon" />}>
      <div className="panel-pad">
      <div className="bill-total"><span>Per month</span><strong>{money(total, prices.currency)}</strong><small className="bill-vat">incl. VAT {vatRate}% · {money(vat, prices.currency)}</small><small>{usage.modules} modules · {usage.departments} departments · {usage.users} staff</small></div>
      {collapsed && <p className="bill-note">Calculated automatically by Northstar Cloud from the modules you switch on and your usage over the last 30 days. It updates as you change your plan.</p>}
      <details className="bill-details" open={!collapsed}>
        <summary>{collapsed ? 'How this is calculated' : 'Breakdown'}</summary>
        {section('Platform', 'platform')}
        {section(`Modules (${group('module').length})`, 'module')}
        {section('Departments', 'departments')}
        {section('Usage', 'usage')}
      </details>
      {!collapsed && <p className="bill-note">Usage is counted over the last 30 days and billed monthly.</p>}
      </div>
    </Panel>
  )
}
