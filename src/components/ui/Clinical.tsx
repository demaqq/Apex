import type { ReactNode } from 'react'
import { ORDER_STAGES, newsTone, orderStage, patientNews2 } from '../../lib/clinical'
import type { ClinicalOrder, Patient } from '../../types'

export function Chip({ tone = 'accent', children }: { tone?: 'accent' | 'danger' | 'warning' | 'success' | 'neutral'; children: ReactNode }) {
  return <span className={`chip ${tone === 'accent' ? '' : tone}`}>{children}</span>
}

/** Order pipeline: completed steps in green, the current step filled. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <span className="stepper-row" aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      {steps.map((step, index) => <i key={step} className={index < current ? 'done' : index === current ? 'current' : ''}>{step}</i>)}
    </span>
  )
}

export function OrderStepper({ order }: { order: ClinicalOrder }) {
  return <Stepper steps={ORDER_STAGES[order.kind]} current={orderStage(order)} />
}

export function NewsChip({ patient }: { patient: Patient }) {
  const score = patientNews2(patient)
  if (!score || !patient.vitals.hr) return null
  return <Chip tone={newsTone(score.score)}>NEWS2 {score.score}</Chip>
}
