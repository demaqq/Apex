import type { Grade, RoleId, RoundKind } from '../types'

export interface GradeDef {
  id: Grade
  /** Sign-in workspace the grade uses (permissions, home page). */
  role: RoleId
  /** Seniority: a note can only be co-signed by a higher rank. */
  rank: number
  short: string
  description: string
  /** Round note types offered, the first is the default. */
  rounds: RoundKind[]
  /** Notes and rounds need co-signing by someone more senior. */
  supervised: boolean
}

/** The medical career ladder, most junior first. */
export const GRADES: GradeDef[] = [
  { id: 'Intern', role: 'intern', rank: 1, short: 'Intern', description: 'Medical intern in rotation. Every note is co-signed.', rounds: ['Intern assessment', 'Resident round'], supervised: true },
  { id: 'GP', role: 'physician', rank: 2, short: 'GP', description: 'General practitioner (medical officer). Practises independently.', rounds: ['GP assessment', 'Ward round'], supervised: false },
  { id: 'Resident', role: 'physician', rank: 3, short: 'Resident', description: 'Specialty trainee, years R1–R5. Rounds are co-signed by a chief resident or a specialist.', rounds: ['Resident round', 'Ward round'], supervised: true },
  { id: 'Chief resident', role: 'physician', rank: 4, short: 'Chief resident', description: 'Senior trainee leading the residents. Co-signs interns’ and residents’ notes.', rounds: ['Chief resident round', 'Ward round'], supervised: false },
  { id: 'Senior specialist', role: 'physician', rank: 5, short: 'Specialist', description: 'Board-certified specialist (senior physician).', rounds: ['Ward round', 'Senior specialist review'], supervised: false },
  { id: 'Consultant', role: 'consultant', rank: 6, short: 'Consultant', description: 'Consultant specialist responsible for the team’s patients.', rounds: ['Consultant review', 'Ward round'], supervised: false },
  { id: 'Subspecialist', role: 'consultant', rank: 7, short: 'Subspecialist', description: 'Fellowship-trained subspecialist (e.g. cardiologist, nephrologist).', rounds: ['Subspecialty consult', 'Consultant review'], supervised: false },
  { id: 'Super-specialist', role: 'consultant', rank: 8, short: 'Super-specialist', description: 'Super-specialist (e.g. interventional cardiologist, paediatric neurosurgeon).', rounds: ['Subspecialty consult', 'Consultant review'], supervised: false },
  { id: 'Professor', role: 'consultant', rank: 9, short: 'Professor', description: 'Professor and academic consultant: leads teaching rounds.', rounds: ['Professor round', 'Consultant review'], supervised: false },
]

export const gradeById = (id?: Grade) => GRADES.find((item) => item.id === id)
export const gradesFor = (role: RoleId) => GRADES.filter((item) => item.role === role)
/** The grade a workspace starts with when none is chosen. */
export const DEFAULT_GRADE: Partial<Record<RoleId, Grade>> = { intern: 'Intern', physician: 'Senior specialist', consultant: 'Consultant' }
export const RESIDENT_YEARS = [1, 2, 3, 4, 5]

export const gradeLabel = (grade?: Grade, year?: number) => grade === 'Resident' && year ? `Resident (R${year})` : grade ?? ''
export const rankOf = (grade?: Grade) => gradeById(grade)?.rank ?? 0
