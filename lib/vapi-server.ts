import type { TranscriptTurn } from "./types";

/**
 * Server-side fallback for retrieving a finished call's transcript directly
 * from Vapi's REST API, using the private key (VAPI_PRIVATE_KEY — never
 * exposed to the browser, unlike the public key in lib/vapi-client.ts).
 *
 * The PRIMARY transcript source is still the one accumulated client-side
 * from the Web SDK's own `message` events (see app/interview/page.tsx) —
 * it's already proven to work and needs no extra network round trip. This
 * function exists as a safety net for app/api/evaluate/route.ts: a
 * backgrounded tab, a dropped event, or any other client-side gap could
 * leave that accumulated transcript thinner than what Vapi's own server
 * actually recorded. When VAPI_PRIVATE_KEY is configured, the evaluate
 * route calls this and prefers whichever transcript is longer.
 *
 * Returns null (never throws) on any failure — missing key, network error,
 * an empty call record — so a caller can always fall back to the
 * client-submitted transcript without special-casing this function's
 * errors.
 */
export async function fetchVapiCallTranscript(callId: string): Promise<TranscriptTurn[] | null> {
  const privateKey = process.env.VAPI_PRIVATE_KEY;
  if (!privateKey) return null;

  let response: Response;
  try {
    response = await fetch(`https://api.vapi.ai/call/${encodeURIComponent(callId)}`, {
      headers: { Authorization: `Bearer ${privateKey}` },
    });
  } catch (err) {
    console.error("[vapi-server] Failed to reach Vapi's REST API:", err);
    return null;
  }

  if (!response.ok) {
    console.error("[vapi-server] Vapi REST API returned an error fetching call:", callId, response.status);
    return null;
  }

  let call: { artifact?: { messages?: Array<{ role?: string; message?: string }> } };
  try {
    call = await response.json();
  } catch (err) {
    console.error("[vapi-server] Failed to parse Vapi call response:", err);
    return null;
  }

  const messages = call.artifact?.messages ?? [];
  const turns: TranscriptTurn[] = [];
  for (const m of messages) {
    if (typeof m.message !== "string" || !m.message.trim()) continue;
    if (m.role === "user") turns.push({ role: "user", text: m.message });
    else if (m.role === "bot") turns.push({ role: "assistant", text: m.message });
  }

  return turns.length > 0 ? turns : null;
}
