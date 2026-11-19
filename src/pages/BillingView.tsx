import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { Check, ChevronRight, CreditCard, Download, DollarSign, Eye, FileText, Filter, Loader, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHospital } from '../store/HospitalStore'
import { useInvoices } from '../data'
import { Avatar, Badge, Button, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '../components/ui'
import { downloadCsv, formatTime } from '../lib/format'
import type { Invoice } from '../types'

export default function BillingView() {
  const { state, notify } = useHospital()
  const invoices = useInvoices()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [view, setView] = useState<'invoices' | 'items'>('invoices')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const statuses = useMemo(() => [...new Set(invoices.map((i) => i.status))], [invoices])
  const filtered = invoices.filter((i) =>
    (status === 'all' || i.status === status) &&
    (!query || `${i.invoiceNumber} ${i.patientName} ${i.mrn ?? ''} ${i.patientMrn ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  )

  const paidTotal = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + i.totalAmount, 0)
  const pendingTotal = invoices.filter((i) => i.status === 'Pending').reduce((sum, i) => sum + i.totalAmount, 0)
  const overdueTotal = invoices.filter((i) => i.status === 'Overdue').reduce((sum, i) => sum + i.totalAmount, 0)

  const exportInvoices = () => {
    const headers = [
      'Invoice #',
      'Patient',
      'MRN',
      'Date',
      'Due Date',
      'Items',
      'Subtotal',
      'Tax',
      'Insurance Discount',
      'Total',
      'Status',
      'Insurance',
      'Paid',
      'Payment Method'
    ]
    const rows = invoices.map((i) => [
      i.invoiceNumber,
      i.patientName,
      i.mrn ?? i.patientMrn ?? '',
      i.date ?? i.issuedDate ?? '',
      i.dueDate,
      i.items.length,
      i.subtotal ?? '',
      i.tax ?? '',
      i.insuranceDiscount ?? '',
      i.totalAmount,
      i.status,
      i.insuranceProvider ?? '',
      i.paidAmount ?? '',
      i.paymentMethod ?? ''
    ])
    downloadCsv('northstar-invoices.csv', [headers, ...rows])
  }

  return (
    <motion.div className="billing-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        eyebrow="REVENUE CYCLE · BILLING & INSURANCE"
        title="Billing & Invoicing"
        description="Invoice management, insurance claims, payments and revenue tracking."
        actions={
          <Fragment>
            <Button variant="secondary" icon={Download} onClick={exportInvoices}>Export invoices</Button>
            <Button icon={Plus} onClick={() => setSelectedInvoice(null)}>New invoice</Button>
          </Fragment>
        }
      />
      <div className="metrics-grid billing-metrics">
        <div className="metric metric-blue">
          <div className="metric-icon"><DollarSign size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Paid this period</p>
            <p className="metric-value">${(paidTotal / 1000).toFixed(1)}K</p>
            <p className="metric-detail">{invoices.filter((i) => i.status === 'Paid').length} invoices</p>
          </div>
        </div>
        <div className="metric metric-amber">
          <div className="metric-icon"><Loader size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Pending collection</p>
            <p className="metric-value">${(pendingTotal / 1000).toFixed(1)}K</p>
            <p className="metric-detail">{invoices.filter((i) => i.status === 'Pending').length} invoices</p>
          </div>
        </div>
        <div className="metric metric-coral">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Overdue</p>
            <p className="metric-value">${(overdueTotal / 1000).toFixed(1)}K</p>
            <p className="metric-detail">{invoices.filter((i) => i.status === 'Overdue').length} invoices</p>
          </div>
        </div>
        <div className="metric metric-teal">
          <div className="metric-icon"><FileText size={20} /></div>
          <div className="metric-body">
            <p className="metric-label">Total invoices</p>
            <p className="metric-value">{invoices.length}</p>
            <p className="metric-detail">{invoices.filter((i) => i.status === 'Claim Submitted').length} claims submitted</p>
          </div>
        </div>
      </div>

      <Panel className="invoices-panel">
        <div className="invoices-toolbar">
          <label className="invoices-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invoices…"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
          <label>
            <Filter size={15} />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="invoices-table-wrap">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Patient</th>
                <th>Date / Due</th>
                <th>Items</th>
                <th>Total</th>
                <th>Patient Payable</th>
                <th>Status</th>
                <th>Insurance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td><b>{invoice.invoiceNumber}</b></td>
                  <td>
                    <Avatar name={invoice.patientName} size="sm" />
                    <span>
                      <b>{invoice.patientName}</b>
                      <small>{invoice.mrn ?? invoice.patientMrn ?? ''}</small>
                    </span>
                  </td>
                  <td>{invoice.date ?? invoice.issuedDate ?? ''} / {invoice.dueDate}</td>
                  <td>{invoice.items.length}</td>
                  <td><b>${invoice.totalAmount.toFixed(2)}</b></td>
                  <td>${invoice.patientPayable ?? invoice.totalAmount - (invoice.insuranceCovered ?? 0)}</td>
                  <td><StatusBadge status={invoice.status.toLowerCase().replace(' ', '-')} /></td>
                  <td>{invoice.insuranceProvider ?? 'Self-pay'}</td>
                  <td>
                    <Button
                      size="sm"
                      variant={invoice.status === 'Paid' ? 'secondary' : 'outline'}
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      {invoice.status === 'Paid' ? <Eye size={14} /> : <DollarSign size={14} />}
                      {invoice.status === 'Paid' ? ' View' : ' Collect'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState icon={FileText} title="No invoices match" text="Try another search term or clear the status filter." />
        )}
      </Panel>

      {selectedInvoice && (
        <Modal open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="Invoice Details" subtitle={`${selectedInvoice.invoiceNumber} · ${selectedInvoice.patientName}`} size="lg">
          <div className="invoice-detail">
            <div className="invoice-header">
              <b>{selectedInvoice.invoiceNumber}</b>
              <StatusBadge status={selectedInvoice.status.toLowerCase().replace(' ', '-')} />
            </div>
            <div className="invoice-meta">
              <div>
                <p><b>Patient:</b> {selectedInvoice.patientName} ({selectedInvoice.mrn ?? selectedInvoice.patientMrn ?? ''})</p>
                <p><b>Insurance:</b> {selectedInvoice.insuranceProvider ?? 'Self-pay'} · <b>Policy:</b> {selectedInvoice.insuranceProvider ? 'Active' : 'N/A'}</p>
              </div>
              <div>
                <p><b>Issued:</b> {selectedInvoice.date ?? selectedInvoice.issuedDate ?? ''}</p>
                <p><b>Due:</b> {selectedInvoice.dueDate} · <b>Status:</b> {selectedInvoice.status}</p>
              </div>
            </div>
            <div className="invoice-items">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>CPT</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description}</td>
                      <td>{item.cptCode ?? ''}</td>
                      <td>{item.category ?? ''}</td>
                      <td>{item.quantity}</td>
                      <td>${item.unitPrice.toFixed(2)}</td>
                      <td><b>${item.total.toFixed(2)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="invoice-totals">
              <div>
                <span>Subtotal</span>
                <b>${selectedInvoice.subtotal?.toFixed(2) ?? selectedInvoice.items.reduce((s, i) => s + i.total, 0).toFixed(2)}</b>
              </div>
              <div>
                <span>Tax</span>
                <b>${selectedInvoice.tax?.toFixed(2) ?? '0.00'}</b>
              </div>
              <div>
                <span>Insurance Discount</span>
                <b>${selectedInvoice.insuranceDiscount?.toFixed(2) ?? '0.00'}</b>
              </div>
              <div className="total-row">
                <span>Total Amount</span>
                <b>${selectedInvoice.totalAmount.toFixed(2)}</b>
              </div>
              <div>
                <span>Patient Payable</span>
                <b>${selectedInvoice.patientPayable?.toFixed(2) ?? (selectedInvoice.totalAmount - (selectedInvoice.insuranceCovered ?? 0)).toFixed(2)}</b>
              </div>
              <div>
                <span>Insurance Covered</span>
                <b>${selectedInvoice.insuranceCovered?.toFixed(2) ?? '0.00'}</b>
              </div>
            </div>
            {selectedInvoice.status !== 'Paid' && (
              <div className="invoice-actions">
                <Button variant="secondary" onClick={() => notify(`${selectedInvoice.invoiceNumber} payment recorded`, 'success')}>
                  <CreditCard size={14} />
                  Record Payment
                </Button>
                <Button onClick={() => notify(`${selectedInvoice.invoiceNumber} claim submitted`, 'info')}>
                  <FileText size={14} />
                  Submit Claim
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  )
}