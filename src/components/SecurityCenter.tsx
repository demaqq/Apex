import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Link2, LockKeyhole, Save, ShieldCheck, XCircle } from 'lucide-react'
import { Button, Chip, Metric, Panel, SearchField } from './ui'
import { encryptionActive } from '../lib/secureStore'
import { DEFAULT_SECURITY, IDLE_CHOICES, idleMinutesOf, SECURITY_LABEL, verifyChain } from '../lib/security'
import { downloadCsv, formatDateTime, today } from '../lib/format'
import { matches } from '../lib/hooks'
import { useStepUp } from './SecurityGuard'
import { useHospital } from '../store/HospitalStore'
import type { SecurityEvent, SecuritySettings } from '../types'

const DAY = 86_400_000
const ALERT: SecurityEvent['type'][] = ['sign-in-failed', 'locked-out', 'unlock-failed', 'step-up-failed', 'break-glass']

/** The administrator's view of the facility's security: protections in force, policy, and the tamper-evident log. */
export function SecurityCenter() {
  const { state, saveSecurity } = useHospital()
  const stepUp = useStepUp()
  const saved = state.settings.security ?? DEFAULT_SECURITY
  const policy = { ...saved, idleMinutes: idleMinutesOf(saved) }
  const [form, setForm] = useState<SecuritySettings>(policy)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'alerts' | SecurityEvent['type']>('all')
  const [checked, setChecked] = useState<ReturnType<typeof verifyChain> | null>(null)
  const log = state.securityEvents
  const accounts = state.staff.filter((member) => member.roleId && member.status !== 'Pending approval' && !member.suspended)
  const withUnlock = accounts.filter((member) => member.unlock).length
  const chain = useMemo(() => verifyChain(log), [log])
  const recent = log.filter((event) => Date.now() - new Date(event.at).getTime() <= DAY)
  const count = (t: SecurityEvent['type']) => recent.filter((event) => event.type === t).length
  const csp = Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]'))
  const secureContext = window.isSecureContext
  const shown = log.filter((event) => (type === 'all' || (type === 'alerts' ? ALERT.includes(event.type) : event.type === type)) && matches(query, event.actor, event.detail, SECURITY_LABEL[event.type], event.role)).slice(0, 200)
  const dirty = JSON.stringify(form) !== JSON.stringify(policy)

  const checks: Array<[boolean, string, string]> = [
    [encryptionActive, 'Data encrypted on this device', encryptionActive ? 'AES-GCM 256-bit with a non-extractable device key' : 'This browser cannot encrypt; data is stored unencrypted'],
    [chain.ok, 'Security log intact', chain.ok ? `${chain.checked} entries, hash chain verified` : `Chain broken at ${chain.brokenAt}: the log was edited`],
    [csp || import.meta.env.DEV, 'Content Security Policy', csp ? 'Scripts only from this app; no inline or third-party code, no plugins' : import.meta.env.DEV ? 'Applied to production builds (not this development server)' : 'Not detected'],
    [secureContext, 'Secure connection', secureContext ? 'Encrypted (HTTPS) or local' : 'Not secure: use HTTPS'],
    [true, 'Role-based access', 'Each role sees only its pages; clinicians only their departments’ patients'],
    [true, 'Administrators cannot open patient records', 'Facility management is separated from clinical data'],
    [policy.idleMinutes <= 60, 'Idle screen lock', `After ${policy.idleMinutes} minutes without activity; unlock with PIN or sign out`],
    [withUnlock >= accounts.length / 2, 'Personal quick unlock', `${withUnlock} of ${accounts.length} accounts have a PIN, phone digits or passphrase (salted PBKDF2 hash); 3 wrong tries sign out`],
    [policy.maxAttempts <= 5, 'Sign-in lockout', `After ${policy.maxAttempts} failed attempts, 1 minute and doubling (max 30)`],
    [policy.stepUpExports && policy.stepUpBreakGlass, 'Re-authentication for sensitive actions', `Exports ${policy.stepUpExports ? 'on' : 'off'} · emergency access ${policy.stepUpBreakGlass ? 'on' : 'off'}`],
  ]
  const score = checks.filter(([ok]) => ok).length

  const exportLog = async () => {
    if (!(await stepUp('Export the security log'))) return
    downloadCsv(`security-log-${today()}.csv`, [['Event', 'Time', 'Type', 'User', 'Role', 'Detail', 'Hash', 'Previous hash'], ...log.map((event) => [event.id, event.at, SECURITY_LABEL[event.type], event.actor, event.role, event.detail, event.hash, event.prev])])
  }

  return <>
    <div className="metrics-grid">
      <Metric label="Protection" value={`${score}/${checks.length}`} detail="Checks passing" icon={ShieldCheck} tone={score === checks.length ? 'teal' : 'amber'} />
      <Metric label="Sign-ins (24 h)" value={count('sign-in')} detail={`${count('sign-in-failed')} failed · ${count('locked-out')} lockouts`} icon={LockKeyhole} tone="blue" />
      <Metric label="Exports (24 h)" value={count('export')} detail="Every file is logged and watermarked" icon={Download} tone="amber" />
      <Metric label="Emergency access (24 h)" value={count('break-glass')} detail="Break-glass openings of records" icon={AlertTriangle} tone="coral" />
    </div>

    <div className="plan-layout">
      <Panel title="Protections in force" action={<ShieldCheck size={17} className="muted-icon" />}>
        <ul className="security-checks">{checks.map(([ok, title, detail]) => <li key={title} className={ok ? 'ok' : 'warn'}>{ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}<div><b>{title}</b><span>{detail}</span></div></li>)}</ul>
      </Panel>
      <div className="plan-bill">
        <Panel title="Security policy" action={<Button size="sm" icon={Save} disabled={!dirty} onClick={() => saveSecurity(form)}>Save</Button>}>
          <div className="panel-pad form-grid">
            <label className="form-field"><span>Lock the screen after</span><select value={form.idleMinutes} onChange={(event) => setForm({ ...form, idleMinutes: Number(event.target.value) })}>{IDLE_CHOICES.map((value) => <option key={value} value={value}>{value === 60 ? '1 hour' : `${value} minutes`} without activity</option>)}</select></label>
            <label className="form-field"><span>End sessions after</span><select value={form.sessionHours} onChange={(event) => setForm({ ...form, sessionHours: Number(event.target.value) })}>{[4, 8, 12, 24].map((value) => <option key={value} value={value}>{value} hours</option>)}</select></label>
            <label className="form-field"><span>Lock an account after</span><select value={form.maxAttempts} onChange={(event) => setForm({ ...form, maxAttempts: Number(event.target.value) })}>{[3, 5, 10].map((value) => <option key={value} value={value}>{value} failed sign-ins</option>)}</select></label>
            <label className="remember-row"><input type="checkbox" checked={form.stepUpExports} onChange={(event) => setForm({ ...form, stepUpExports: event.target.checked })} />Ask for the access key again before exports</label>
            <label className="remember-row"><input type="checkbox" checked={form.stepUpBreakGlass} onChange={(event) => setForm({ ...form, stepUpBreakGlass: event.target.checked })} />Ask for the access key again before emergency access</label>
          </div>
        </Panel>
      </div>
    </div>

    <Panel title="Security log" action={<div className="panel-heading-actions"><Button size="sm" variant="secondary" icon={Link2} onClick={() => setChecked(verifyChain(log))}>Verify integrity</Button><Button size="sm" variant="secondary" icon={Download} onClick={exportLog}>Export</Button></div>}>
      <div className="panel-pad">
        <p className="table-footnote admin-note">Every sign-in, failed attempt, lockout, screen lock, re-authentication, export and emergency access. Each entry carries a SHA-256 hash of the one before, so any edit or deletion is detected. Restoring demo data never clears it.</p>
        {checked && <div className={`integration-note ${checked.ok ? '' : 'planned'}`}>{checked.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}<div><b>{checked.ok ? 'Log verified' : 'Log has been altered'}</b><span>{checked.ok ? `All ${checked.checked} entries link correctly.` : `The chain breaks at ${checked.brokenAt}.`}</span></div></div>}
        <div className="table-toolbar">
          <SearchField value={query} onChange={setQuery} placeholder="Search user or detail…" />
          <select className="filter-select" value={type} onChange={(event) => setType(event.target.value as typeof type)} aria-label="Event type"><option value="all">All events</option><option value="alerts">Alerts only</option>{(Object.keys(SECURITY_LABEL) as SecurityEvent['type'][]).map((key) => <option key={key} value={key}>{SECURITY_LABEL[key]}</option>)}</select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Time</th><th>Event</th><th>User</th><th>Detail</th><th>Hash</th></tr></thead>
          <tbody>{shown.map((event) => <tr key={event.id} className={ALERT.includes(event.type) ? 'security-alert' : ''}><td>{formatDateTime(event.at)}<small className="mono">{event.id}</small></td><td>{ALERT.includes(event.type) ? <Chip tone="danger">{SECURITY_LABEL[event.type]}</Chip> : <Chip tone="neutral">{SECURITY_LABEL[event.type]}</Chip>}</td><td>{event.actor}<small>{event.role}</small></td><td className="wrap">{event.detail}</td><td className="mono"><small>{event.hash.slice(0, 12)}…</small></td></tr>)}</tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="table-footnote">No events match.</p>}
    </Panel>

    <Panel title="Before going live with real patients">
      <div className="panel-pad">
        <p className="table-footnote admin-note">This demo runs entirely in the browser. These protections reduce risk on the device, but no system is unbreakable. A production deployment also needs, on the server side:</p>
        <ul className="production-list">
          <li><b>Real identities:</b> a personal account for every user with strong passwords or single sign-on, multi-factor authentication, and hashed credentials on the server — not a shared access key.</li>
          <li><b>Server-side authorization:</b> every read and write checked on the server against role, department and break-glass rules; the browser is never trusted.</li>
          <li><b>Encryption everywhere:</b> HTTPS with HSTS, an encrypted database and backups, keys in a managed key service, separate data per client.</li>
          <li><b>Monitoring and response:</b> central audit logs, alerts on unusual access, an incident plan, regular backups tested by restoring them.</li>
          <li><b>Assurance:</b> independent penetration testing, dependency and vulnerability scanning, staff training, and compliance with Ethiopia’s personal data protection law and international health-data standards.</li>
        </ul>
      </div>
    </Panel>
  </>
}
