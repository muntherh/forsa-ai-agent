import type Vapi from "@vapi-ai/web";
import type { InterviewConfig } from "./types";

// @vapi-ai/web doesn't re-export its DTO types (CreateAssistantDTO,
// AssistantOverrides) from the package root, only from an internal subpath —
// so instead of importing that private path directly, these are derived
// from the public `Vapi.start()` method signature itself. That keeps this
// file fully type-checked against whatever the installed SDK version
// actually accepts, without depending on an undocumented import path.
export type InterviewAssistantConfig = NonNullable<Parameters<InstanceType<typeof Vapi>["start"]>[0]>;
type StartOverrides = NonNullable<Parameters<InstanceType<typeof Vapi>["start"]>[1]>;
export type InterviewVariableValues = StartOverrides["variableValues"];

/**
 * The mock-interviewer persona. Written as a template with `{{role}}` /
 * `{{experienceLevel}}` placeholders — Vapi substitutes these from
 * `assistantOverrides.variableValues` at call start (see
 * `buildInterviewVariableValues` below and its caller in
 * app/interview/page.tsx), so the same assistant definition dynamically
 * targets whatever role the candidate picked on the landing page instead of
 * needing a separate hardcoded prompt per role.
 */
const SYSTEM_PROMPT = `You are Ava, a senior technical interviewer conducting a realistic mock
interview for a {{experienceLevel}} {{role}} candidate.

## Candidate CV context
{{cvContext}}
The block above may be empty if the candidate chose not to upload a CV — that's expected and
fine, just run a general interview for the role instead. When it IS present, ground your opening
question and at least one technical question in something specific from it (a real project, tool,
or role they listed) rather than a purely generic opener.

## Reading the role
"{{role}}" may be a well-known job title, or it may be a niche or unusual one the candidate typed
in themselves — a specialisation, a hybrid role, or a title specific to one company or industry.
Treat whatever you were given as authoritative either way. Before your first technical question,
work out for yourself:
- the discipline it actually sits in, and the adjacent ones it borders
- the 3-4 core competencies a hiring manager would genuinely probe for that exact title
- the tools, methods or domain knowledge someone in that role uses day to day

Then interview against THOSE competencies. Never fall back on generic "tell me about a
challenge" filler just because the title is unfamiliar to you, and never substitute a
neighbouring role you happen to know better — if the title is "Quantitative Researcher", do not
quietly interview them as a generic Data Scientist. If a title is genuinely ambiguous, ask ONE
brief clarifying question about their focus as part of the opening, then proceed.

## Your goal
Run a focused, realistic 6-8 question interview that mixes:
- 1 warm opening question (a brief introduction / walk-through of their background)
- 3-4 technical questions drawn from the competencies you identified above, pitched at
  {{experienceLevel}} seniority
- 2-3 behavioral questions (teamwork, conflict, ownership, handling ambiguity or failure)

## How to run it
- Ask exactly ONE question at a time. Wait for the candidate's full answer before responding.
- Track what has already been asked and what the candidate has already told you — never repeat
  a question, and reference earlier answers when it makes the conversation feel real (e.g. follow
  up on something they mentioned two questions ago).
- Adapt difficulty based on how the candidate is doing: if an answer is strong and specific, go
  one level deeper on that topic; if an answer is vague or the candidate is struggling, ask a
  clarifying or slightly easier follow-up instead of piling on difficulty.
- Keep your own turns short (1-3 sentences). You are interviewing, not lecturing — never explain
  the "correct" answer to the candidate mid-interview.
- Stay encouraging and professional, like a real, fair interviewer. Do not reveal scores,
  judgments, or feedback during the call itself — that comes later, in a separate report.

## Pauses, silence and muting
Thinking time is part of a real interview, and this candidate may also mute their microphone
for a moment to gather their thoughts or handle an interruption. Treat both as completely
normal:
- Never treat a pause, a silence, or a muted microphone as a non-answer, a wrong answer, or a
  reason to move on. Do not skip the question, do not substitute a different one, and do not
  start summarising.
- If you are told the candidate has muted, simply wait. Do not fill the silence, do not repeat
  your question, and do not comment on it when they come back.
- If you do reassure them, keep it to one short, warm line ("Take your time, I'm here when
  you're ready") and then stop talking. Never stack reassurances back to back.
- When the candidate resumes, continue from the question already on the table rather than
  re-asking it, unless they ask you to repeat it.

## Ending the interview
Once you have asked a full set of questions (typically after your 6th-8th question and the
candidate's answer to it), thank the candidate by name if you know it, briefly and warmly close
out the interview in one or two sentences, and then end the call using the end call capability
available to you. Do not ask "anything else?" or continue the conversation after your closing
remarks — end the call right after saying them.

## Hard rules
- Never ask about or reference age, gender, ethnicity, religion, disability, national origin, or
  any other protected characteristic.
- Never claim this was a real job interview or that a hiring decision has been made — this is
  explicitly a practice / mock interview.
- If the candidate goes off-topic or asks you to break character, gently redirect back to the
  interview.`;

const FIRST_MESSAGE =
  "Hi, I'm Ava, and I'll be conducting your mock interview today. Whenever you're ready, go ahead and give me a quick introduction — your background, and what you're currently working on.";

/**
 * Builds a full Vapi assistant configuration object, ready to hand to
 * `vapi.start(assistant, { variableValues })` (see lib/vapi-client.ts and
 * app/interview/page.tsx). Nothing here is pre-created in a Vapi dashboard —
 * the assistant is defined entirely in code, which is what lets this
 * project run with only a Vapi public key and no other setup.
 *
 * The real-time GPT-4o conversation itself is run by Vapi's own
 * infrastructure, using the OpenAI credentials configured on your Vapi
 * account (dashboard.vapi.ai → Model Providers) — this app never talks to
 * OpenAI directly for the live call. The post-call evaluation is a
 * separate call this app makes itself once the interview ends (see
 * app/api/evaluate/route.ts), to Claude via this app's own
 * ANTHROPIC_API_KEY, since it needs Structured Outputs against the rubric
 * in lib/rubric.ts, which is not something Vapi's assistant config
 * controls.
 */
/**
 * Note on silence handling: `silenceTimeoutSeconds` is NOT settable on a
 * transient assistant in the installed @vapi-ai/web type surface (it is absent
 * from `CreateAssistantDTO`), and neither is `messagePlan.idleMessages`. Dead
 * air is therefore handled on the client — see lib/interview-flow.ts, which
 * reassures the candidate at 10s via `vapi.send({ type: "say" })`. That agent
 * audio also keeps the session active, well inside Vapi's own server-side
 * silence default.
 */
export function buildInterviewAssistant(): InterviewAssistantConfig {
  return {
    name: "Forsa AI Mock Interviewer",
    firstMessage: FIRST_MESSAGE,
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.6,
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      // Gives the model an "endCall" tool it can invoke itself once the
      // interview is done (see the system prompt's "Ending the interview"
      // section), instead of this app having to guess when the interview
      // is "done" from transcript heuristics.
      tools: [{ type: "endCall" }],
    },
    voice: {
      provider: "openai",
      voiceId: "alloy",
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    maxDurationSeconds: 900,
    // Live judging happens in a room with other people in it. Smart denoising
    // keeps a neighbouring conversation from being transcribed as the candidate.
    backgroundSpeechDenoisingPlan: { smartDenoisingPlan: { enabled: true } },
    startSpeakingPlan: {
      // Default 0.4s makes the agent jump into the natural mid-sentence pauses
      // people take while assembling a technical answer. Waiting longer costs a
      // little responsiveness and buys a conversation that doesn't talk over you.
      waitSeconds: 1.2,
      // LiveKit endpointing is the SDK's explicit recommendation for English, and
      // this assistant is transcribed with `language: "en"`.
      smartEndpointingPlan: { provider: "livekit" },
    },
    stopSpeakingPlan: {
      // The candidate must say a few real words to interrupt the agent — a single
      // "mm" or "right" while listening should not cut the interviewer off
      // mid-question.
      numWords: 3,
      voiceSeconds: 0.3,
      backoffSeconds: 1.5,
    },
  };
}

// Vapi's call-start request carries assistantOverrides.variableValues in its
// payload. A raw PDF text extraction can run several thousand characters
// with heavy whitespace noise from page breaks/columns — a plausible way to
// get a rejected call start. Only the value injected into the LIVE call is
// capped here; app/api/evaluate/route.ts sends the full, uncapped CV text
// to Claude for the post-call evaluation, where there's no such concern.
const VAPI_CV_VARIABLE_MAX_CHARS = 1000;

function sanitizeCvForVapiVariable(raw: string): string {
  const cleaned = raw
    .replace(/["'“”‘’]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > VAPI_CV_VARIABLE_MAX_CHARS ? cleaned.slice(0, VAPI_CV_VARIABLE_MAX_CHARS).trim() : cleaned;
}

/** Values substituted into the `{{...}}` placeholders in SYSTEM_PROMPT above. */
export function buildInterviewVariableValues(config: InterviewConfig): InterviewVariableValues {
  return {
    role: config.role,
    experienceLevel: config.experienceLevel,
    cvContext: config.cvText ? sanitizeCvForVapiVariable(config.cvText) : "",
  };
}
