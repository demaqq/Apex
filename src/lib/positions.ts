import type { Permission, PositionId, StaffMember } from '../types'

/** Sensitive privileges: granted only by the administrator, never part of a standard role by default (except where noted). */
export const SENSITIVE: Permission[] = ['stock-receive', 'stock-adjust', 'formulary-edit', 'controlled-drugs', 'records-export', 'lab-catalogue', 'imaging-catalogue']

export interface PositionDef { id: PositionId; title: string; description: string; privileges: Permission[] }

/** Named posts the administrator assigns to people. Each carries a bundle of privileges. */
export const POSITIONS: PositionDef[] = [
  { id: 'pharmacy-manager', title: 'Pharmacy manager', description: 'Runs the pharmacy: dispensing, stock, prices and controlled medicines.', privileges: ['dispense', 'stock-receive', 'stock-adjust', 'formulary-edit', 'controlled-drugs'] },
  { id: 'inventory-manager', title: 'Inventory / store manager', description: 'Receives deliveries, writes off expired or damaged stock and keeps the formulary up to date. Cannot dispense.', privileges: ['stock-receive', 'stock-adjust', 'formulary-edit'] },
  { id: 'store-keeper', title: 'Store keeper', description: 'Receives deliveries into stock only.', privileges: ['stock-receive'] },
  { id: 'controlled-drugs-officer', title: 'Controlled drugs officer', description: 'May dispense and hand over controlled medicines (e.g. morphine, diazepam).', privileges: ['dispense', 'controlled-drugs'] },
  { id: 'records-officer', title: 'Medical records officer', description: 'May export patient lists and the hospital census.', privileges: ['records-export'] },
  { id: 'lab-head', title: 'Laboratory head', description: 'Runs the laboratory: adds, prices and switches tests on or off in the laboratory catalogue, and verifies results.', privileges: ['results', 'lab-catalogue'] },
  { id: 'imaging-head', title: 'Head of imaging', description: 'Runs radiology: adds, prices and switches studies on or off in the imaging catalogue, and reports studies.', privileges: ['results', 'imaging-catalogue'] },
]

export const positionById = (id: PositionId) => POSITIONS.find((p) => p.id === id)

export const activePositions = (member?: StaffMember | null) =>
  (member?.positions ?? []).filter((p) => !p.until || new Date(p.until).getTime() >= Date.now())

export function positionPrivileges(member?: StaffMember | null): Permission[] {
  return activePositions(member).flatMap((p) => positionById(p.id)?.privileges ?? [])
}

/** Combinations that let one person both move stock in or out and hand it over — worth a second checker. */
export function dutyWarnings(perms: Permission[]) {
  const set = new Set(perms)
  const warnings: string[] = []
  if (set.has('stock-receive') && set.has('stock-adjust') && set.has('dispense')) warnings.push('One person can receive, write off and dispense stock. Consider monthly stock counts by a second person.')
  if (set.has('controlled-drugs') && set.has('stock-adjust')) warnings.push('One person can both dispense controlled medicines and write off stock. Controlled-drug registers should be counter-signed.')
  return warnings
}
