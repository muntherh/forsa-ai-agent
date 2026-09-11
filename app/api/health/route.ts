import { NextResponse } from "next/server";
import { getVapiKeySource, getVapiPublicKey, hasUnusedAssistantId } from "@/lib/vapi-env";

/**
 * Deployment smoke check.
 *
 * The two ways this app fails in production while working perfectly in
 * development are both invisible from the outside: a missing (or
 * differently-named) env var, and a stale deployment serving older code.
 * Both are awkward to diagnose through the UI — a missing ANTHROPIC_API_KEY
 * just looks like "the analysis failed", and a Vapi key under the wrong name
 * looks identical to no key at all.
 *
 * So this reports, in one request: which commit is live, whether each
 * required variable is PRESENT, and — for the Vapi key, which has two
 * accepted names — which one it was actually read from. It returns only
 * booleans and variable NAMES; never a value, prefix or length.
 */

// Must be evaluated per request: a statically prerendered response would
// freeze the answer at build time and report on the build environment
// rather than the running one.
export const dynamic = "force-dynamic";

export function GET() {
  const vapiKeySource = getVapiKeySource();
  const hasVapiKey = Boolean(getVapiPublicKey());
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  const notes: string[] = [];
  if (!hasVapiKey) {
    notes.push(
      "No Vapi browser key. Set NEXT_PUBLIC_VAPI_PUBLIC_KEY (or NEXT_PUBLIC_VAPI_KEY) — without it /interview shows 'Vapi is not configured' and no call can start."
    );
  }
  if (!hasAnthropicKey) {
    notes.push(
      "ANTHROPIC_API_KEY is missing — the interview will run, but /evaluating will fail and no scorecard is ever produced."
    );
  }
  if (hasUnusedAssistantId()) {
    notes.push(
      "NEXT_PUBLIC_VAPI_ASSISTANT_ID is set but UNUSED: this app builds its assistant in code (lib/assistant.ts) rather than referencing a dashboard assistant. Harmless to leave, safe to delete."
    );
  }
  if (!process.env.VAPI_PRIVATE_KEY) {
    notes.push(
      "VAPI_PRIVATE_KEY is not set. Optional — it only enables the server-side transcript fallback; the client-side transcript is used otherwise."
    );
  }

  return NextResponse.json({
    // False when anything REQUIRED for the end-to-end flow is missing.
    ready: hasVapiKey && hasAnthropicKey,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    required: {
      // Starts the WebRTC interview client-side. Two accepted names — see
      // lib/vapi-env.ts for why.
      vapiPublicKey: { present: hasVapiKey, readFrom: vapiKeySource },
      // Scores the interview via Claude in /api/evaluate.
      anthropicApiKey: { present: hasAnthropicKey, readFrom: hasAnthropicKey ? "ANTHROPIC_API_KEY" : null },
    },
    optional: {
      vapiPrivateKey: Boolean(process.env.VAPI_PRIVATE_KEY),
    },
    notes,
  });
}
