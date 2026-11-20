import { Receipt } from 'lucide-react'
import { Panel } from './ui'
import { estimateBill, money } from '../lib/modules'
import { useHospital } from '../store/HospitalStore'

/** The client's estimated monthly invoice: platform, modules, departments and usage. */
export function BillSummary({ title = 'Estimated monthly bill' }: { title?: string }) {
  const { state } = useHospital()
  const prices = state.pricing
  const { lines, total, usage } = estimateBill(state, prices)
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
      <div className="bill-total"><span>Per month</span><strong>{money(total, prices.currency)}</strong><small>{usage.modules} modules · {usage.departments} departments · {usage.users} staff</small></div>
      {section('Platform', 'platform')}
      {section(`Modules (${group('module').length})`, 'module')}
      {section('Departments', 'departments')}
      {section('Usage', 'usage')}
      <p className="bill-note">Prices are set by your platform provider. Usage is counted over the last 30 days and billed monthly. Switching a module off stops its charge from the next bill; your data is kept.</p>
      </div>
    </Panel>
  )
}
