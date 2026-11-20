import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button, Modal } from './ui'
import { downloadHtml, printHtml, requestFormHtml } from '../lib/diagnostics'
import { useHospital } from '../store/HospitalStore'

/** Preview of the printed request for tests not done in this facility, with print and download. */
export function RequestFormModal({ orderIds, onClose }: { orderIds: string[]; onClose: () => void }) {
  const { state, notify } = useHospital()
  const [clinicalInfo, setClinicalInfo] = useState('')
  const orders = state.orders.filter((order) => orderIds.includes(order.id))
  const patient = state.patients.find((item) => item.id === orders[0]?.patientId)
  const html = useMemo(() => patient && orders.length ? requestFormHtml({ facility: state.settings, patient, orders, catalogue: state.investigations, clinicalInfo: clinicalInfo.trim() || undefined }) : '', [patient, orders, state.settings, state.investigations, clinicalInfo])
  if (!patient || !orders.length) return null
  const file = `request-${patient.mrn}-${orders.map((order) => order.id).join('-')}.html`
  return (
    <Modal open onClose={onClose} title="Printed request" subtitle={`${patient.name} · ${orders.length === 1 ? orders[0].title : `${orders.length} tests`} · for an outside laboratory or imaging centre`} size="lg">
      <label className="form-field"><span>Clinical information on the form</span><input value={clinicalInfo} onChange={(event) => setClinicalInfo(event.target.value)} placeholder={patient.complaint} /></label>
      <iframe className="request-preview" title="Request form preview" srcDoc={html} sandbox="" />
      <p className="record-hint">The patient takes this form to any laboratory or imaging centre. When the result comes back, open the request under “Sent out” and enter it so it joins the patient’s record. Sending requests electronically to partner hospitals and diagnostic centres is planned.</p>
      <div className="modal-footer">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="secondary" icon={Download} onClick={() => downloadHtml(file, html)}>Download</Button>
        <Button icon={Printer} onClick={() => { if (!printHtml(html)) { downloadHtml(file, html); notify('Printing is blocked here, so the form was downloaded instead', 'warning') } }}>Print</Button>
      </div>
    </Modal>
  )
}
