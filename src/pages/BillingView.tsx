import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CircleDollarSign, CreditCard, Download, FileText, Send, Wallet } from 'lucide-react'
import { Button, DetailGrid, EmptyState, FilterSelect, Metric, Modal, PageHeader, Panel, PersonCell, SearchField, StatusBadge } from '../components/ui'
import { invoiceTotals } from '../data'
import { downloadCsv, formatCurrency, formatDate, today } from '../lib/format'
import { matches, usePatients } from '../lib/hooks'
import { useHospital } from '../store/HospitalStore'
import type { Invoice, InvoiceStatus } from '../types'

const STATUSES: InvoiceStatus[] = ['Pending', 'Claim submitted', 'Overdue', 'Paid']

export default function BillingView() {
  const { state, setInvoiceStatus } = useHospital()
  const patients = usePatients()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = state.invoices.find((invoice) => invoice.id === selectedId) ?? null

  const sumPayable = (list: Invoice[]) => list.reduce((sum, invoice) => sum + invoiceTotals(invoice).patientPayable, 0)
  const byStatus = (value: InvoiceStatus) => state.invoices.filter((invoice) => invoice.status === value)
  const outstanding = state.invoices.filter((invoice) => invoice.status !== 'Paid')
  const filtered = state.invoices
    .filter((invoice) => {
      const patient = patients.get(invoice.patientId)
      return (status === 'all' || invoice.status === status) && matches(query, invoice.id, patient?.name, patient?.mrn, invoice.insuranceProvider)
    })
    .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.issuedAt.localeCompare(a.issuedAt))

  const exportInvoices = () => downloadCsv(`invoices-${today()}.csv`, [
    ['Invoice', 'Patient', 'MRN', 'Issued', 'Due', 'Subtotal', 'Tax', 'Discount', 'Total', 'Insurance covered', 'Patient payable', 'Insurer', 'Claim', 'Status'],
    ...state.invoices.map((invoice) => {
      const totals = invoiceTotals(invoice)
      const patient = patients.get(invoice.patientId)
      return [invoice.id, patient?.name, patient?.mrn, formatDate(invoice.issuedAt), formatDate(invoice.dueAt), totals.subtotal.toFixed(2), invoice.tax.toFixed(2), invoice.discount.toFixed(2), totals.total.toFixed(2), invoice.insuranceCovered.toFixed(2), totals.patientPayable.toFixed(2), invoice.insuranceProvider ?? 'Self-pay', invoice.claimId, invoice.status]
    }),
  ])

  return (
    <motion.div className="ops-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="Revenue cycle · Billing"
        title="Billing & invoicing"
        description="Track patient balances, insurance claims and payments."
        actions={<Button variant="secondary" icon={Download} onClick={exportInvoices}>Export invoices</Button>}
      />

      <div className="metrics-grid">
        <Metric label="Outstanding balance" value={formatCurrency(sumPayable(outstanding))} detail={`${outstanding.length} open invoices`} icon={Wallet} tone="blue" />
        <Metric label="Awaiting insurer" value={byStatus('Claim submitted').length} detail={formatCurrency(sumPayable(byStatus('Claim submitted')))} icon={Send} tone="amber" />
        <Metric label="Overdue" value={byStatus('Overdue').length} detail={formatCurrency(sumPayable(byStatus('Overdue')))} icon={AlertTriangle} tone="coral" />
        <Metric label="Collected" value={formatCurrency(sumPayable(byStatus('Paid')))} detail={`${byStatus('Paid').length} paid invoices`} icon={CircleDollarSign} tone="teal" />
      </div>

      <Panel>
        <div className="table-toolbar">
          <SearchField value={query} onChange={setQuery} placeholder="Search invoice, patient or insurer…" />
          <FilterSelect label="All statuses" value={status} onChange={setStatus} options={STATUSES} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Invoice</th><th>Patient</th><th>Insurer</th><th>Due</th><th className="num">Total</th><th className="num">Patient owes</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {filtered.map((invoice) => {
                const patient = patients.get(invoice.patientId)
                const totals = invoiceTotals(invoice)
                return (
                  <tr key={invoice.id} className="clickable-row" onClick={() => setSelectedId(invoice.id)}>
                    <td><b>{invoice.id}</b><small>Issued {formatDate(invoice.issuedAt)}</small></td>
                    <td>{patient && <PersonCell name={patient.name} detail={patient.mrn} />}</td>
                    <td>{invoice.insuranceProvider ?? 'Self-pay'}</td>
                    <td className={invoice.status === 'Overdue' ? 'danger-text' : ''}>{formatDate(invoice.dueAt)}</td>
                    <td className="num">{formatCurrency(totals.total)}</td>
                    <td className="num"><b>{formatCurrency(totals.patientPayable)}</b></td>
                    <td><StatusBadge status={invoice.status} /></td>
                    <td className="row-actions"><Button size="sm" variant="secondary" icon={FileText} onClick={(event) => { event.stopPropagation(); setSelectedId(invoice.id) }}>Open</Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon={FileText} title="No invoices match" text="Try another search term or clear the status filter." />}
      </Panel>

      {selected && <InvoiceModal invoice={selected} onClose={() => setSelectedId(null)} onStatus={(value) => setInvoiceStatus(selected.id, value)} />}
    </motion.div>
  )
}

function InvoiceModal({ invoice, onClose, onStatus }: { invoice: Invoice; onClose: () => void; onStatus: (status: InvoiceStatus) => void }) {
  const patients = usePatients()
  const patient = patients.get(invoice.patientId)
  const totals = invoiceTotals(invoice)
  return (
    <Modal open onClose={onClose} title={`Invoice ${invoice.id}`} subtitle={patient ? `${patient.name} · ${patient.mrn}` : undefined} size="lg">
      <div className="detail-head"><StatusBadge status={invoice.status} />{invoice.paidAt && <span>Paid {formatDate(invoice.paidAt)}</span>}</div>
      <DetailGrid items={[['Issued', formatDate(invoice.issuedAt)], ['Due', formatDate(invoice.dueAt)], ['Insurer', invoice.insuranceProvider ?? 'Self-pay'], ['Claim reference', invoice.claimId]]} />
      <div className="table-wrap line-items">
        <table className="data-table compact">
          <thead><tr><th>Item</th><th>Code</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}><td className="wrap"><b>{item.description}</b><small>{item.category}</small></td><td>{item.code}</td><td className="num">{item.quantity}</td><td className="num">{formatCurrency(item.unitPrice)}</td><td className="num">{formatCurrency(item.quantity * item.unitPrice)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="totals">
        <div><dt>Subtotal</dt><dd>{formatCurrency(totals.subtotal)}</dd></div>
        <div><dt>Tax</dt><dd>{formatCurrency(invoice.tax)}</dd></div>
        <div><dt>Contracted discount</dt><dd>−{formatCurrency(invoice.discount)}</dd></div>
        <div><dt>Invoice total</dt><dd>{formatCurrency(totals.total)}</dd></div>
        <div><dt>Insurance covers</dt><dd>−{formatCurrency(invoice.insuranceCovered)}</dd></div>
        <div className="grand"><dt>Patient owes</dt><dd>{formatCurrency(totals.patientPayable)}</dd></div>
      </dl>
      <div className="modal-footer">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {invoice.status !== 'Paid' && <div className="footer-actions">
          {invoice.status !== 'Claim submitted' && invoice.insuranceProvider && <Button variant="secondary" icon={Send} onClick={() => onStatus('Claim submitted')}>Submit claim</Button>}
          <Button icon={CreditCard} onClick={() => onStatus('Paid')}>Record payment</Button>
        </div>}
      </div>
    </Modal>
  )
}
