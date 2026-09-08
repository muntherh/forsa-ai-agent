import Vapi from "@vapi-ai/web";

let vapiInstance: Vapi | null = null;

/**
 * Lazily creates a single shared Vapi client for the whole app session.
 * Vapi's own SDK manages the WebRTC peer connection internally once
 * `.start()` is called elsewhere (see components/CallControls.tsx) — this
 * module only owns constructing the client from the public key.
 */
export function getVapiClient(): Vapi {
  if (vapiInstance) return vapiInstance;

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set. Copy .env.example to .env.local and add your Vapi public key."
    );
  }

  vapiInstance = new Vapi(publicKey);
  return vapiInstance;
}

export function isVapiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
}
