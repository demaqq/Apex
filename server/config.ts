/**
 * Server configuration, read from environment variables only. Secret keys never reach the browser.
 * See server/README.md for every variable.
 */
import { TELE_PRICES } from '../src/lib/telePrices'

declare const process: { env: Record<string, string | undefined> }

const env = (name: string) => (typeof process !== 'undefined' ? process.env[name] ?? '' : '').trim()

export type PaymentProvider = 'chapa' | 'stripe' | 'sandbox'
export type SmsProvider = 'afromessage' | 'africastalking' | 'twilio' | 'log'

export function config() {
  const chapaKey = env('CHAPA_SECRET_KEY')
  const stripeKey = env('STRIPE_SECRET_KEY')
  const chosenPayment = env('PAYMENT_PROVIDER').toLowerCase()
  const payment: PaymentProvider | null =
    chosenPayment === 'chapa' && chapaKey ? 'chapa'
      : chosenPayment === 'stripe' && stripeKey ? 'stripe'
        : chosenPayment === 'sandbox' ? 'sandbox'
          : !chosenPayment && chapaKey ? 'chapa'
            : !chosenPayment && stripeKey ? 'stripe'
              : null

  const afro = { token: env('AFROMESSAGE_TOKEN'), identifierId: env('AFROMESSAGE_IDENTIFIER_ID'), sender: env('AFROMESSAGE_SENDER') }
  const at = { username: env('AFRICASTALKING_USERNAME'), apiKey: env('AFRICASTALKING_API_KEY'), from: env('AFRICASTALKING_SENDER_ID') }
  const twilio = { sid: env('TWILIO_ACCOUNT_SID'), token: env('TWILIO_AUTH_TOKEN'), from: env('TWILIO_FROM'), service: env('TWILIO_MESSAGING_SERVICE_SID') }
  const chosenSms = env('SMS_PROVIDER').toLowerCase()
  const has = { afromessage: Boolean(afro.token), africastalking: Boolean(at.username && at.apiKey), twilio: Boolean(twilio.sid && twilio.token && (twilio.from || twilio.service)) }
  const sms: SmsProvider | null =
    chosenSms === 'log' ? 'log'
      : (chosenSms === 'afromessage' || chosenSms === 'africastalking' || chosenSms === 'twilio') && has[chosenSms] ? chosenSms
        : !chosenSms ? (has.afromessage ? 'afromessage' : has.africastalking ? 'africastalking' : has.twilio ? 'twilio' : null)
          : null

  let prices = TELE_PRICES
  try { if (env('TELEHEALTH_PRICES')) prices = { ...TELE_PRICES, ...JSON.parse(env('TELEHEALTH_PRICES')) as typeof TELE_PRICES } } catch { /* keep defaults */ }

  return {
    payment, sms, prices,
    chapaKey, stripeKey,
    currency: (env('PAYMENT_CURRENCY') || 'ETB').toUpperCase(),
    afro, at, twilio,
    facility: env('FACILITY_NAME') || 'Northstar General',
    allowedOrigins: env('ALLOWED_ORIGINS').split(',').map((item) => item.trim().replace(/\/$/, '')).filter(Boolean),
    /** SMS per phone number and per IP address per hour. */
    smsPerNumber: Number(env('SMS_LIMIT_PER_NUMBER')) || 6,
    smsPerIp: Number(env('SMS_LIMIT_PER_IP')) || 40,
    smsPrefixes: (env('SMS_ALLOWED_PREFIXES') || '+251').split(',').map((item) => item.trim()).filter(Boolean),
    testMode: payment === 'sandbox' || chapaKey.startsWith('CHASECK_TEST') || stripeKey.startsWith('sk_test_'),
  }
}

export type ServerConfig = ReturnType<typeof config>
