/**
 * Default telehealth prices (VAT inclusive), shared by the app and the payment server.
 * The server charges these unless TELEHEALTH_PRICES overrides them, so a browser can never set its own price.
 */
export const TELE_PRICES: Record<string, { name: string; price: number }> = {
  'SV-02': { name: 'Specialist video consultation', price: 35 },
  'SV-14': { name: 'Video consultation', price: 25 },
  'SV-15': { name: 'On-demand video visit', price: 30 },
  'SV-16': { name: 'Mental health video session', price: 40 },
  'SV-17': { name: 'Secure message to a clinician', price: 8 },
}
