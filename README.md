# Forsa AI — English Edition

An autonomous, real-time **voice-first mock interviewer**. Talk through a technical + behavioral
interview out loud with an AI interviewer over a live WebRTC call, then get an instant, structured
performance scorecard the moment the call ends.

Built for the **Decoding Data Science × JetBrains 8-Day Agentic AI Application Challenge**.

## 1. Project Overview & Real-World Value

Practicing for interviews out loud — not by typing answers into a chat box — is what actually
builds the muscle memory candidates need: thinking on your feet, structuring an answer in real
time, and recovering gracefully from a hard follow-up question. Most practice tools are still
text-based chatbots, which miss all of that.

Forsa AI (English Edition) is a focused, standalone MVP that does one thing well:

- **Real-time voice**, not turn-based chat — the candidate speaks, the AI interviewer listens,
  thinks, and responds, over a live audio call.
- **An adaptive interviewer persona** ("Ava") that asks a genuine mix of opening, technical, and
  behavioral questions tailored to the candidate's chosen role and seniority, and adjusts follow-up
  difficulty based on how the conversation is going.
- **An instant, structured scorecard** — overall score, category breakdown (technical knowledge,
  problem solving, communication, confidence), concrete strengths/areas for improvement, and a
  hiring-style recommendation — generated automatically the moment the call ends.

No sign-up, no database, no dashboard to configure — clone it, add one API key pair, and run a
full mock interview.

## 2. Architecture

```
 Candidate's mic/speaker
        │  WebRTC audio
        ▼
   Vapi.ai (real-time voice orchestration)
        │  - Speech-to-text: Deepgram
        │  - Reasoning: OpenAI GPT-4o (assistant defined entirely in code, lib/assistant.ts)
        │  - Text-to-speech: OpenAI TTS
        ▼
 Live transcript, streamed back over Vapi's Web SDK
        │  (accumulated client-side as the call progresses)
        ▼
   Call ends  ──────────────────────────────────────────────►  POST /api/evaluate
                                                                       │
                                                     Separate Claude call
                                                     (this app's own Anthropic key),
                                                     Structured Outputs against the
                                                     rubric in lib/rubric.ts
                                                                       │
                                                                       ▼
                                                        Structured JSON scorecard
                                                                       │
                                                                       ▼
                                                        <Scorecard /> component
```

Two separate model calls, deliberately, on two different providers:

1. **The live interview** — run entirely by Vapi's own real-time voice pipeline against OpenAI
   GPT-4o. `lib/assistant.ts` defines the assistant (model, voice, transcriber, system prompt) as a
   plain config object handed to `vapi.start()` at call time — nothing is pre-created in a Vapi
   dashboard, which is what lets this project run with just a Vapi **public** key.
2. **The evaluation** — once the call ends, this app POSTs the transcript it accumulated
   client-side to its own `/api/evaluate` route, which makes a call to **Claude** (`claude-sonnet-5`,
   via the official [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk)) using
   [Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
   (`output_config.format`, built from the same Zod schema in `lib/rubric.ts` via
   `client.messages.parse()`) so the response is guaranteed to match the `Scorecard` shape the UI
   renders — no prompt-engineered "please return JSON" guessing.

## 3. Quickstart

**Prerequisites:** Node.js 18.18+, a [Vapi.ai](https://vapi.ai) account with GPT-4o enabled as a
model provider (Vapi dashboard → Model Providers → OpenAI — either your own OpenAI key or Vapi's
built-in credits) for the live interview, and your own
[Anthropic API key](https://console.anthropic.com/settings/keys) for the evaluation step.

```bash
npm install
cp .env.example .env.local
# then edit .env.local and fill in both keys — see .env.example for where to get each one
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick a role and experience level, click
**Start Mock Interview**, allow microphone access, and talk to Ava.

### Building for production

```bash
npm run build
npm run start
```

## 4. Environment Variables

See `.env.example`:

| Variable | Where it's used | Exposed to the browser? |
|---|---|---|
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Starts the WebRTC call client-side (`lib/vapi-client.ts`) | Yes — by design, Vapi's public key is scoped to call-starting only |
| `ANTHROPIC_API_KEY` | The post-call evaluation request (`app/api/evaluate/route.ts`) | **No** — server-side only, never sent to the browser |

No database, no auth, no user accounts, and no production credentials of any kind are included in
this repository.

## 5. What's Adapted From Forsa's Production Stack

This is a clean, standalone project — not a copy of Forsa's production codebase — but it deliberately
carries Forsa's actual visual identity and a few proven implementation patterns, so it reads as the
same product family rather than a generic AI-demo skin:

- **Brand palette & typography** (`tailwind.config.ts`, `app/layout.tsx`) — the exact color tokens
  (`navy` #0B2E4A, `blue` #2470B3 / `blue-dark` #1B5A8C, `teal` #1FA98A, `amber` #F2A93B, plus the
  `bg`/`line`/`muted` neutrals) and font pairing (Almarai display + IBM Plex body/mono) from
  `forsa-frontend/tailwind.config.ts`, loaded on the Latin subset since this app is English-only
  where forsa-frontend's is Arabic-first.
- **The Forsa logo and wordmark** (`public/logo.png`, copied from forsa-frontend) appear in the
  header on every screen — landing page and the in-call header — using the same circular
  bordered-image + bold-wordmark treatment as forsa-frontend's `Navbar`/`MinimalHeader`.
- **Card, button, and chat-bubble styling** — white `rounded-card`/`rounded-2xl` surfaces on
  `bg-bg`, the `blue`→`teal` gradient progress bars and hero-card shadow from forsa-frontend's
  `ReportCard`, the primary-button treatment (`bg-blue`, hover lift, tinted shadow) from its
  `Button` component, and the two-tone chat bubbles (navy for the candidate, tinted blue for the
  interviewer) from its `ChatInterview`.
- **The voice waveform visualizer** (`components/VoiceWaveform.tsx`) reuses the seeded-random,
  hydration-safe animation technique — and the same blue/teal palette — from Forsa's own live
  voice-interview UI, so the waveform renders identically on the server and client and reacts to
  the assistant's real audio volume via a smoothed Framer Motion spring rather than raw, jittery
  ticks.
- **The Vapi assistant shape** (`lib/assistant.ts`) — model/voice/transcriber config plus a
  built-in `endCall` tool the model invokes itself once the interview is over — follows the same
  pattern Forsa's own Vapi-based interview feature uses in production.
- **The evaluation rubric** (`lib/rubric.ts`) follows the same philosophy as Forsa's own interview
  evaluator: score categories, ground every strength/improvement in something concrete from the
  transcript, and validate the AI's structured response against a schema before trusting it —
  rather than a single unstructured "how did they do?" prompt.

## 6. Known Limitations

- The end-to-end voice flow (Vapi WebRTC call → live transcript → evaluation call → rendered
  scorecard) has been built and typechecked/built cleanly, but has **not been verified against a
  live Vapi + OpenAI + Anthropic account** in this environment (no credentials available here). The
  error states in `app/interview/page.tsx` (connection errors, an evaluation that fails or times
  out) are designed to fail honestly rather than silently, but the happy path should be confirmed
  with real accounts before a live demo.
- The evaluation call targets `claude-sonnet-5`. Claude 3.5 Sonnet (the model originally specified
  for this call) was retired by Anthropic on 2025-10-28 and now returns a 404 from the API;
  `claude-sonnet-5` is Anthropic's documented drop-in replacement for every retired Sonnet 3.x
  snapshot, so it's used instead — see the comment at the top of `app/api/evaluate/route.ts`.
- `npm audit` reports one high-severity advisory for a PostCSS version bundled *inside* Next.js's
  own build tooling (`node_modules/next/node_modules/postcss`), only fixed by upgrading to a
  Next.js major version. It affects build-time CSS/source-map processing, not this app's runtime
  behavior, and was judged an acceptable trade-off against a breaking major-version jump for this
  MVP.
- No automated test suite (unit or E2E) is included yet — out of scope for the 8-day challenge
  timeline.

## 7. Challenge Attribution

Built for the **Decoding Data Science × JetBrains 8-Day Agentic AI Application Challenge**. See
`LICENSE` for the terms this submission is shared under.
