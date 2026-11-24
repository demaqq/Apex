import { useState } from 'react'
import { Building2, FlaskConical, Hospital, Link2, Pill, ScanLine, Send } from 'lucide-react'
import { Button, Chip, Panel } from './ui'
import { LINK_NOTE } from '../lib/network'
import { formatDate } from '../lib/format'
import { useHospital } from '../store/HospitalStore'
import type { ConnectionStatus, NetworkFacility, NetworkService } from '../types'

const SERVICE_ICON: Record<NetworkService, typeof Pill> = { Laboratory: FlaskConical, Imaging: ScanLine, Referrals: Hospital, Pharmacy: Pill }
const TONE: Record<ConnectionStatus, 'success' | 'warning' | 'neutral' | 'danger'> = { Active: 'success', Requested: 'warning', Paused: 'neutral', Declined: 'danger' }
const SERVICE_TEXT: Record<NetworkService, string> = { Laboratory: 'Laboratory tests', Imaging: 'Imaging studies', Referrals: 'Patient referrals', Pharmacy: 'e-Prescriptions from video visits' }

export function ServiceChips({ services }: { services: NetworkService[] }) {
  return <span className="service-chips">{services.map((service) => { const Icon = SERVICE_ICON[service]; return <Chip key={service} tone="neutral"><Icon size={11} /> {service}</Chip> })}</span>
}

/** The client administrator's connections to other hospitals, diagnostic centres and laboratories. */
export function NetworkPanel() {
  const { state, requestConnection, setConnectionStatus } = useHospital()
  const [asking, setAsking] = useState<NetworkFacility | null>(null)
  const [services, setServices] = useState<NetworkService[]>([])
  const [note, setNote] = useState('')
  const linked = state.connections.filter((connection) => connection.status !== 'Declined')
  const directory = state.network.filter((facility) => !linked.some((connection) => connection.facilityId === facility.id))
  const facility = (id: string) => state.network.find((item) => item.id === id)

  return <>
    <Panel title="Your connections" action={<Link2 size={17} className="muted-icon" />}>
      <p className="table-footnote admin-note">Connected facilities receive your laboratory and imaging requests electronically and return results straight into the patient record. Connected hospitals can receive patient referrals. New connections are approved by the Northstar Cloud team.</p>
      {linked.length === 0 ? <p className="table-footnote admin-note">No connections yet. Pick a facility from the directory below.</p> : (
        <div className="card-grid admin-cards">
          {linked.map((connection) => {
            const item = facility(connection.facilityId)
            if (!item) return null
            return (
              <article key={connection.id} className={`work-card ${connection.status === 'Paused' ? 'muted-row' : ''}`}>
                <header><b>{item.name}</b><Chip tone={TONE[connection.status]}>{connection.status === 'Requested' ? 'Awaiting approval' : connection.status}</Chip></header>
                <p className="work-card-reason"><Chip tone="neutral">{item.kind}</Chip> {item.city}</p>
                <ServiceChips services={connection.services} />
                <p className="record-hint">{LINK_NOTE[item.link]} {connection.status === 'Active' && connection.decidedAt ? `Connected since ${formatDate(connection.decidedAt)}.` : connection.status === 'Requested' ? `Requested ${formatDate(connection.requestedAt)} by ${connection.requestedBy}.` : ''}</p>
                <footer>
                  <small>{state.orders.filter((order) => order.externalProviderId === `net:${item.id}`).length} requests · {state.externalReferrals.filter((referral) => referral.facilityId === item.id).length} referrals</small>
                  <div>
                    {connection.status === 'Active' && <Button size="sm" variant="secondary" onClick={() => setConnectionStatus(connection.id, 'Paused')}>Pause</Button>}
                    {connection.status === 'Paused' && <Button size="sm" onClick={() => setConnectionStatus(connection.id, 'Active')}>Resume</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setConnectionStatus(connection.id, 'Removed')}>{connection.status === 'Requested' ? 'Cancel request' : 'Disconnect'}</Button>
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </Panel>

    <Panel title="Care network directory" action={<Building2 size={17} className="muted-icon" />}>
      <p className="table-footnote admin-note">Hospitals, diagnostic centres, laboratories and imaging centres on the Northstar care network.</p>
      <div className="card-grid admin-cards">
        {directory.map((item) => (
          <article key={item.id} className="work-card">
            <header><b>{item.name}</b><Chip tone={item.link === 'Platform' ? 'success' : 'neutral'}>{item.link}</Chip></header>
            <p className="work-card-reason"><Chip tone="neutral">{item.kind}</Chip> {item.city} · {item.capabilities}</p>
            <ServiceChips services={item.services} />
            {asking?.id === item.id ? (
              <div className="connect-form">
                <span>Connect for</span>
                <div className="segmented">{item.services.map((service) => <button key={service} type="button" className={services.includes(service) ? 'on' : ''} onClick={() => setServices(services.includes(service) ? services.filter((value) => value !== service) : [...services, service])}>{SERVICE_TEXT[service]}</button>)}</div>
                <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note for the platform team (optional)" aria-label="Note" />
                <div className="panel-actions"><Button size="sm" variant="ghost" onClick={() => setAsking(null)}>Cancel</Button><Button size="sm" icon={Send} disabled={!services.length} onClick={() => { requestConnection(item.id, services, note); setAsking(null) }}>Request connection</Button></div>
              </div>
            ) : <footer><small>{LINK_NOTE[item.link]}</small><Button size="sm" onClick={() => { setAsking(item); setServices(item.services); setNote('') }}>Connect</Button></footer>}
          </article>
        ))}
        {directory.length === 0 && <p className="table-footnote">You are connected to every facility on the network.</p>}
      </div>
    </Panel>
  </>
}
