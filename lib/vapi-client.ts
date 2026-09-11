import Vapi from "@vapi-ai/web";
import { getVapiPublicKey } from "./vapi-env";

let vapiInstance: Vapi | null = null;

/**
 * Lazily creates a single shared Vapi client for the whole app session.
 * Vapi's own SDK manages the WebRTC peer connection internally once
 * `.start()` is called elsewhere (see components/CallControls.tsx) — this
 * module only owns constructing the client from the public key.
 */
export function getVapiClient(): Vapi {
  if (vapiInstance) return vapiInstance;

  const publicKey = getVapiPublicKey();
  if (!publicKey) {
    throw new Error(
      "No Vapi browser key found. Set NEXT_PUBLIC_VAPI_PUBLIC_KEY (or NEXT_PUBLIC_VAPI_KEY) — copy .env.example to .env.local and add your Vapi public key."
    );
  }

  vapiInstance = new Vapi(publicKey);
  return vapiInstance;
}

export function isVapiConfigured(): boolean {
  return Boolean(getVapiPublicKey());
}
