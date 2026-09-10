import type { Scorecard, TranscriptTurn } from "./types";

/**
 * State handoff between the five pages of the interview flow, without a
 * backend or a global provider:
 *
 *   /setup       writes  setup   ─┐
 *   /interview   reads   setup    │  runs the call, then writes…
 *   /evaluating  reads   pending ─┘  calls /api/evaluate, then writes…
 *   /results     reads   scorecard
 *
 * sessionStorage (not localStorage, not URL params) throughout: every one of
 * these payloads belongs to a single interview run, so it shouldn't outlive
 * the tab, leak across tabs, or be bookmarkable. Each stage clears what it
 * consumes, so a refresh or a back-navigation can't silently replay stale
 * data from a previous run — the page guards below turn a missing payload
 * into a redirect home rather than an infinite spinner.
 */

const SETUP_KEY = "forsa_interview_setup_v1";
const PENDING_KEY = "forsa_interview_pending_v1";
const SCORECARD_KEY = "forsa_scorecard_v1";

export interface InterviewSetup {
  role: string;
  experienceLevel: string;
  cvText?: string;
  cvFileName?: string;
}

/** Everything /evaluating needs to run the evaluation on its own. */
export interface PendingEvaluation extends InterviewSetup {
  transcript: TranscriptTurn[];
  callId?: string;
}

export interface StoredScorecard {
  scorecard: Scorecard;
  role: string;
  experienceLevel: string;
  cvFileName?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, isValid: (value: unknown) => boolean): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : null;
  } catch (err) {
    console.warn(`Failed to read ${key} from sessionStorage:`, err);
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key} to sessionStorage:`, err);
  }
}

function remove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed to clear ${key} from sessionStorage:`, err);
  }
}

export function saveInterviewSetup(setup: InterviewSetup): void {
  write(SETUP_KEY, setup);
}

export function loadInterviewSetup(): InterviewSetup | null {
  return read<InterviewSetup>(
    SETUP_KEY,
    (v) =>
      typeof (v as InterviewSetup)?.role === "string" &&
      typeof (v as InterviewSetup)?.experienceLevel === "string"
  );
}

export function clearInterviewSetup(): void {
  remove(SETUP_KEY);
}

export function savePendingEvaluation(pending: PendingEvaluation): void {
  write(PENDING_KEY, pending);
}

export function loadPendingEvaluation(): PendingEvaluation | null {
  return read<PendingEvaluation>(
    PENDING_KEY,
    (v) => Array.isArray((v as PendingEvaluation)?.transcript) && typeof (v as PendingEvaluation)?.role === "string"
  );
}

export function clearPendingEvaluation(): void {
  remove(PENDING_KEY);
}

export function saveScorecard(stored: StoredScorecard): void {
  write(SCORECARD_KEY, stored);
}

export function loadScorecard(): StoredScorecard | null {
  return read<StoredScorecard>(
    SCORECARD_KEY,
    (v) => !!(v as StoredScorecard)?.scorecard && typeof (v as StoredScorecard)?.role === "string"
  );
}

export function clearScorecard(): void {
  remove(SCORECARD_KEY);
}
