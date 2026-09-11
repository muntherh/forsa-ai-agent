/**
 * Conversational resilience for the live interview.
 *
 * Two related problems this solves, both of which make a voice interview feel
 * broken in ways a candidate reads as "the AI gave up on me":
 *
 * 1. **Dead air.** A candidate thinking about a hard question is indistinguishable,
 *    to the pipeline, from a candidate who has walked away. Left alone the agent
 *    either barrels on to the next question or the call eventually times out.
 * 2. **Muting.** Pressing mute is a deliberate signal — "give me a second" — but
 *    the agent has no way to know it happened, so it keeps waiting on a microphone
 *    that is switched off.
 *
 * The logic lives here rather than inside the page component for one reason:
 * every function below is **pure**. State in, state out, no timers, no Vapi
 * handle, no DOM. That makes the behaviour directly testable by the evaluation
 * suite (see evaluation/cases.mts, dimension F) instead of only observable by
 * sitting through a real ten-second silence.
 *
 * Vapi's own `messagePlan.idleMessages` would be the natural home for this, but
 * it is not present in the installed @vapi-ai/web type surface, so the timing is
 * driven client-side and delivered through `vapi.send({ type: "say" })`.
 */

/** How long a candidate may stay quiet before the agent reassures them. */
export const SILENCE_PROMPT_AFTER_MS = 10_000;

/**
 * Reassurance is a kindness once and twice; a third time it is nagging, and a
 * candidate who genuinely needs a long think is being talked over.
 */
export const MAX_SILENCE_PROMPTS_PER_TURN = 2;

/** Minimum gap between two reassurances, so they never stack up. */
export const SILENCE_PROMPT_COOLDOWN_MS = 12_000;

/**
 * Mic level above which we consider the candidate to be genuinely speaking.
 * Vapi reports 0..1; room tone and breath sit well below this.
 */
export const CANDIDATE_AUDIO_THRESHOLD = 0.02;

/** Spoken when the candidate has simply gone quiet. */
export const SILENCE_REASSURANCES = [
  "Take your time, I'm here when you're ready.",
  "No rush at all — think it through, and I'll be right here.",
] as const;

/** Spoken when the candidate has muted, which is a deliberate signal, not a stall. */
export const MUTED_REASSURANCES = [
  "No rush — unmute whenever you're ready to pick it back up.",
  "Still here. Take the time you need, and just unmute when you want to continue.",
] as const;

/**
 * Injected into the conversation history (not spoken) so the agent understands
 * why the microphone went quiet and does not treat it as a non-answer.
 */
export const MUTE_CONTEXT_NOTICE =
  "[System] The candidate has just muted their microphone. They are thinking or handling a brief interruption — this is not a refusal to answer and must never be scored as one. Do not move on to a new question, do not repeat yourself, and do not fill the silence. Wait. When they unmute, let them answer the question already on the table.";

export const UNMUTE_CONTEXT_NOTICE =
  "[System] The candidate has unmuted and is ready to continue. Pick up exactly where you left off — do not re-ask the question unless they ask you to, and do not comment on the pause.";

export interface InterviewFlowState {
  /** Timestamp of the last moment the candidate was audibly speaking. */
  lastCandidateAudioAt: number;
  /** Reassurances already spoken during the current candidate turn. */
  promptsThisTurn: number;
  /** Timestamp of the last reassurance, for the cooldown. */
  lastPromptAt: number;
  /** Whether the candidate's microphone is currently muted. */
  muted: boolean;
  /**
   * True only while it is genuinely the candidate's turn. Silence while the
   * agent is mid-sentence is not dead air, and must never trigger a prompt.
   */
  awaitingCandidate: boolean;
}

export function createInterviewFlowState(now: number): InterviewFlowState {
  return {
    lastCandidateAudioAt: now,
    promptsThisTurn: 0,
    lastPromptAt: 0,
    muted: false,
    awaitingCandidate: false,
  };
}

/** The agent started talking: it is not the candidate's turn, so nothing is overdue. */
export function noteAssistantSpeechStart(state: InterviewFlowState, now: number): InterviewFlowState {
  return { ...state, awaitingCandidate: false, lastCandidateAudioAt: now };
}

/** The agent finished: the candidate's turn begins, and the budget resets. */
export function noteAssistantSpeechEnd(state: InterviewFlowState, now: number): InterviewFlowState {
  return { ...state, awaitingCandidate: true, lastCandidateAudioAt: now, promptsThisTurn: 0 };
}

/**
 * A microphone level sample. Only levels above the threshold count — otherwise
 * room tone would keep resetting the clock and the prompt would never fire.
 */
export function noteCandidateAudio(
  state: InterviewFlowState,
  level: number,
  now: number
): InterviewFlowState {
  if (level < CANDIDATE_AUDIO_THRESHOLD) return state;
  return { ...state, lastCandidateAudioAt: now, promptsThisTurn: 0 };
}

/**
 * Mute toggled. The silence clock restarts from the toggle so a candidate who
 * mutes immediately still gets the full grace period before being prompted.
 */
export function noteMuteChange(
  state: InterviewFlowState,
  muted: boolean,
  now: number
): InterviewFlowState {
  return { ...state, muted, lastCandidateAudioAt: now, promptsThisTurn: 0 };
}

/**
 * The tick. Returns the line the agent should speak, or `null` — which is the
 * overwhelmingly common case, since this is called on a timer.
 *
 * Returns the next state alongside the line so the caller cannot forget to
 * record that a prompt was spent.
 */
export function nextReassurance(
  state: InterviewFlowState,
  now: number
): { state: InterviewFlowState; line: string } | null {
  if (!state.awaitingCandidate) return null;
  if (state.promptsThisTurn >= MAX_SILENCE_PROMPTS_PER_TURN) return null;
  if (now - state.lastCandidateAudioAt < SILENCE_PROMPT_AFTER_MS) return null;
  if (state.lastPromptAt && now - state.lastPromptAt < SILENCE_PROMPT_COOLDOWN_MS) return null;

  const lines = state.muted ? MUTED_REASSURANCES : SILENCE_REASSURANCES;
  const line = lines[Math.min(state.promptsThisTurn, lines.length - 1)];

  return {
    line,
    state: {
      ...state,
      promptsThisTurn: state.promptsThisTurn + 1,
      lastPromptAt: now,
      // Restart the clock so the cooldown is measured from this prompt.
      lastCandidateAudioAt: now,
    },
  };
}
