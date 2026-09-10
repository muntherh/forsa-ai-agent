export type CallStatus = "idle" | "connecting" | "speaking" | "listening" | "ended" | "error";

// Free text, not a fixed union: both are only ever substituted as plain
// strings into the Vapi system prompt (lib/assistant.ts) and the Claude
// evaluation prompt (lib/rubric.ts) — nothing downstream branches on a
// specific value. lib/roles.ts defines the curated categories/labels and
// EXPERIENCE_LEVELS shown in the UI, plus the free-text "custom role" path,
// but any string is a valid InterviewRole.
export type InterviewRole = string;
export type ExperienceLevel = string;

export interface InterviewConfig {
  role: InterviewRole;
  experienceLevel: ExperienceLevel;
  /** Full extracted CV text, if the candidate uploaded one. Optional — the interview works fine without it. */
  cvText?: string;
}

export interface TranscriptTurn {
  role: "assistant" | "user";
  text: string;
}

export interface CategoryScores {
  technicalKnowledge: number;
  problemSolving: number;
  communication: number;
  confidence: number;
}

export type Recommendation = "Strong Hire" | "Hire" | "No Hire" | "Strong No Hire";

export interface ActionPlanPhase {
  title: string;
  estimatedDuration: string;
  tasks: string[];
}

export interface ActionPlan {
  title: string;
  summary: string;
  phases: ActionPlanPhase[];
}

export interface Scorecard {
  overallScore: number;
  recommendation: Recommendation;
  categoryScores: CategoryScores;
  strengths: string[];
  areasForImprovement: string[];
  summary: string;
  actionPlan: ActionPlan;
}
