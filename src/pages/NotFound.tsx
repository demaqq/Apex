import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, Panel } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Panel className="not-found">
      <EmptyState icon={Compass} title="This page doesn't exist" text="The link may be out of date. Head back to your overview to keep working." action={<Button onClick={() => navigate('/dashboard')}>Back to overview</Button>} />
    </Panel>
  )
}
