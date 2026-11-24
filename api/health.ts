// Vercel function: forwards to the shared router (see server/router.ts).
import { handle } from '../server/router'

export const GET = handle
export const POST = handle
export const OPTIONS = handle
