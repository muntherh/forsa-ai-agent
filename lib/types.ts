export type CallStatus = "idle" | "connecting" | "speaking" | "listening" | "ended" | "error";

export type InterviewRole =
  | "Software Engineer"
  | "Data Scientist"
  | "Product Manager"
  | "DevOps Engineer"
  | "UX Designer";

export type ExperienceLevel = "Entry-level" | "Mid-level" | "Senior";

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
