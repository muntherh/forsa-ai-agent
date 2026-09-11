/**
 * Resolves the Vapi browser key, tolerating both names it is deployed under.
 *
 * This app documents `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, but its sibling project
 * (forsa-frontend, whose Vapi sandbox this feature grew out of) deploys the
 * same secret as `NEXT_PUBLIC_VAPI_KEY`. Copying the variable list between
 * the two Vercel projects therefore produces a silent, total failure: the
 * key is present, but under a name this app never reads, so the interview
 * screen renders "Vapi is not configured" and the call can never start.
 * Accepting either name removes that whole class of outage; the documented
 * name wins when both are set.
 *
 * Both names are written out as separate literal `process.env.X` expressions
 * on purpose. Next.js inlines `NEXT_PUBLIC_*` into the browser bundle by
 * TEXTUAL substitution at build time — a computed lookup like
 * `process.env[name]` is never substituted and would be `undefined` in the
 * browser, which is precisely the bug this file exists to prevent.
 */

export type VapiKeySource = "NEXT_PUBLIC_VAPI_PUBLIC_KEY" | "NEXT_PUBLIC_VAPI_KEY";

export function getVapiPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_KEY || undefined;
}

/** Which variable the key was actually found in — reported by /api/health. */
export function getVapiKeySource(): VapiKeySource | null {
  if (process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) return "NEXT_PUBLIC_VAPI_PUBLIC_KEY";
  if (process.env.NEXT_PUBLIC_VAPI_KEY) return "NEXT_PUBLIC_VAPI_KEY";
  return null;
}

/**
 * True when an assistant ID is configured. This app does NOT use one — the
 * assistant is built in code (lib/assistant.ts) and handed to `vapi.start()`,
 * which is what lets it run with only a public key and inject the candidate's
 * CV as call variables. Detected solely so /api/health can say the variable
 * is inert rather than leaving someone to assume it is wired up.
 */
export function hasUnusedAssistantId(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
}
