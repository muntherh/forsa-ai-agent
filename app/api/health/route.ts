import { NextResponse } from "next/server";

/**
 * Deployment smoke check.
 *
 * The two ways this app fails in production while working perfectly in
 * development are both invisible from the outside: a missing server-side
 * env var (the whole interview → evaluation → scorecard chain dies at
 * /api/evaluate), and a stale deployment serving older code. Both are
 * awkward to diagnose through the UI — a missing ANTHROPIC_API_KEY just
 * looks like "the analysis failed".
 *
 * So this reports, in one request: which commit is actually live, and
 * whether each required variable is PRESENT. It deliberately returns only
 * booleans — never the values, never any prefix or length of them.
 */

// Must be evaluated per request: a statically prerendered response would
// freeze the answer at build time and report on the build environment
// rather than the running one.
export const dynamic = "force-dynamic";

export function GET() {
  const vapiPublicKey = Boolean(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
  const anthropicApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return NextResponse.json({
    // False when anything REQUIRED for the end-to-end flow is missing.
    ready: vapiPublicKey && anthropicApiKey,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: {
      // Starts the WebRTC interview client-side.
      NEXT_PUBLIC_VAPI_PUBLIC_KEY: vapiPublicKey,
      // Required — scores the interview via Claude in /api/evaluate.
      ANTHROPIC_API_KEY: anthropicApiKey,
      // Optional — server-side transcript fallback only.
      VAPI_PRIVATE_KEY: Boolean(process.env.VAPI_PRIVATE_KEY),
    },
  });
}
