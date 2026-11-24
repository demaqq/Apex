/**
 * SMS gateways. Only fixed templates can be sent (no free text), to numbers in allowed country prefixes, with rate
 * limits, so the endpoint cannot be used to spam.
 *
 * - AfroMessage (Ethiopia): https://afromessage.com/developers — POST https://api.afromessage.com/api/send
 * - Africa's Talking: POST https://api.africastalking.com/version1/messaging
 * - Twilio: POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
 * - log: prints to the server log (development).
 */
import type { ServerConfig } from './config'
import { clean, HttpError } from './http'

export const TEMPLATES = {
  booked: '{facility}: your video visit with {doctor} is booked for {when}. Visit code {code}. Join: {link}',
  queued: '{facility}: you are in the queue to see a doctor by video. Visit code {code}. Keep this page open: {link}',
  reminder: '{facility}: reminder - video visit {when} with {doctor}. Code {code}. Join 5 min early: {link}',
  ready: '{facility}: {doctor} is ready for your video visit now. Join: {link} (code {code})',
  reply: '{facility}: a clinician replied to your message "{subject}". Read it in the patient portal: {link}',
  cancelled: '{facility}: your video visit {code} was cancelled. {refund}',
  summary: '{facility}: your visit summary from {doctor} is ready in the patient portal: {link}',
  test: '{facility}: test message from the patient portal SMS set-up.',
} as const

export type TemplateId = keyof typeof TEMPLATES

/** E.164 with Ethiopian local forms accepted (09…, 07…, 2519…). */
export function normalisePhone(raw: string) {
  const compact = raw.replace(/[\s().-]/g, '')
  const digits = compact.replace(/^\+/, '')
  if (/^0[79]\d{8}$/.test(digits)) return `+251${digits.slice(1)}`
  if (/^[79]\d{8}$/.test(digits)) return `+251${digits}`
  if (/^251[79]\d{8}$/.test(digits)) return `+${digits}`
  if (/^\+\d{9,15}$/.test(compact)) return compact
  return null
}

const mask = (phone: string) => `${phone.slice(0, 5)}•••${phone.slice(-3)}`

export function render(cfg: ServerConfig, template: TemplateId, params: Record<string, unknown>) {
  const values: Record<string, string> = { facility: cfg.facility }
  for (const [key, value] of Object.entries(params ?? {})) values[key] = clean(value, key === 'link' ? 200 : 80)
  if (values.link && !/^https?:\/\//.test(values.link)) values.link = ''
  return TEMPLATES[template].replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '').replace(/\s+/g, ' ').trim().slice(0, 459)
}

export interface SmsResult { ok: boolean; provider: string; id?: string; to: string; error?: string }

export async function sendSms(cfg: ServerConfig, rawTo: string, template: TemplateId, params: Record<string, unknown>): Promise<SmsResult> {
  if (!cfg.sms) throw new HttpError(503, 'SMS is not set up', 'sms_off')
  if (!(template in TEMPLATES)) throw new HttpError(400, 'Unknown message template', 'unknown_template')
  const to = normalisePhone(rawTo)
  if (!to) throw new HttpError(400, 'Invalid phone number', 'invalid_phone')
  if (!cfg.smsPrefixes.some((prefix) => to.startsWith(prefix))) throw new HttpError(400, 'Phone numbers in this country are not enabled', 'prefix_blocked')
  const message = render(cfg, template, params)

  if (cfg.sms === 'log') {
    console.info(`[sms:log] to ${mask(to)}: ${message}`)
    return { ok: true, provider: 'log', id: `log-${Date.now()}`, to: mask(to) }
  }

  if (cfg.sms === 'afromessage') {
    const response = await fetch('https://api.afromessage.com/api/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.afro.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ to, message, ...(cfg.afro.identifierId ? { from: cfg.afro.identifierId } : {}), ...(cfg.afro.sender ? { sender: cfg.afro.sender } : {}) }),
    })
    const data = await response.json().catch(() => ({})) as { acknowledge?: string; response?: { message_id?: string; errors?: unknown } }
    const ok = response.ok && data.acknowledge === 'success'
    return { ok, provider: 'afromessage', id: data.response?.message_id, to: mask(to), ...(ok ? {} : { error: `AfroMessage refused the message (${response.status})` }) }
  }

  if (cfg.sms === 'africastalking') {
    const host = cfg.at.username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com'
    const response = await fetch(`${host}/version1/messaging`, {
      method: 'POST',
      headers: { apiKey: cfg.at.apiKey, accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: cfg.at.username, to, message, ...(cfg.at.from ? { from: cfg.at.from } : {}) }),
    })
    const data = await response.json().catch(() => ({})) as { SMSMessageData?: { Recipients?: Array<{ status?: string; messageId?: string }> } }
    const recipient = data.SMSMessageData?.Recipients?.[0]
    const ok = response.ok && recipient?.status === 'Success'
    return { ok, provider: 'africastalking', id: recipient?.messageId, to: mask(to), ...(ok ? {} : { error: `Africa's Talking: ${recipient?.status ?? response.status}` }) }
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.twilio.sid)}/Messages.json`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${cfg.twilio.sid}:${cfg.twilio.token}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, Body: message, ...(cfg.twilio.service ? { MessagingServiceSid: cfg.twilio.service } : { From: cfg.twilio.from }) }),
  })
  const data = await response.json().catch(() => ({})) as { sid?: string; message?: string }
  return { ok: response.ok && Boolean(data.sid), provider: 'twilio', id: data.sid, to: mask(to), ...(response.ok ? {} : { error: `Twilio: ${data.message ?? response.status}` }) }
}
