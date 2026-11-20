import type { Connection, NetworkFacility, NetworkService } from '../types'

/** Orders sent electronically to a connected facility store `net:<facilityId>` as their provider. */
export const NET = 'net:'
export const isElectronic = (providerId?: string) => Boolean(providerId?.startsWith(NET))
export const facilityOf = (providerId: string | undefined, network: NetworkFacility[]) => providerId?.startsWith(NET) ? network.find((item) => item.id === providerId.slice(NET.length)) : undefined

export const ELECTRONIC_STAGES = ['Sent electronically', 'Received by partner', 'Result returned']

/** Active connections offering a service, with their facility. */
export function connectedFor(service: NetworkService, connections: Connection[], network: NetworkFacility[]) {
  return connections
    .filter((connection) => connection.status === 'Active' && connection.services.includes(service))
    .map((connection) => network.find((item) => item.id === connection.facilityId))
    .filter((item): item is NetworkFacility => Boolean(item) && item!.services.includes(service))
}

export const LINK_NOTE: Record<NetworkFacility['link'], string> = {
  Platform: 'On Northstar Cloud: requests, results and referrals flow directly.',
  'HL7 FHIR': 'Connected through a standard HL7 FHIR interface.',
  'Partner API': 'Connected through the partner’s own interface.',
}
