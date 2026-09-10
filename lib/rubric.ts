import { z } from "zod/v4";
import type { InterviewConfig, TranscriptTurn } from "./types";

/**
 * The evaluation rubric. `scorecardSchema` is the single source of truth,
 * used two ways:
 *
 * 1. Handed to `@anthropic-ai/sdk`'s `zodOutputFormat()` in
 *    app/api/evaluate/route.ts, which derives a JSON Schema from it for
 *    Claude's Structured Outputs (`output_config.format`) and parses the
 *    response against it automatically via `client.messages.parse()`.
 * 2. Re-validated with `.safeParse()` in app/interview/page.tsx before the
 *    scorecard is trusted and rendered — belt and suspenders, since a
 *    timeout, a refusal, or a future API change could still hand back
 *    something unexpected even under Structured Outputs.
 *
 * Built against the `zod/v4` entry point (not the top-level `zod` v3-style
 * export) — `zodOutputFormat` calls `z.toJSONSchema()` internally, which
 * only exists on `zod/v4` schema instances; a schema built from the classic
 * `zod` import fails at runtime when passed to it. Every fluent method used
 * below (`.object`, `.enum`, `.array`, `.min`/`.max`) exists on both, so
 * this is purely an import-path change, not a schema rewrite.
 */

const actionPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  phases: z
    .array(
      z.object({
        title: z.string(),
        estimatedDuration: z.string(),
        tasks: z.array(z.string()).max(6),
      })
    )
    .min(1)
    .max(4),
});

export const scorecardSchema = z.object({
  overallScore: z.number().min(0).max(100),
  recommendation: z.enum(["Strong Hire", "Hire", "No Hire", "Strong No Hire"]),
  categoryScores: z.object({
    technicalKnowledge: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()).max(5),
  areasForImprovement: z.array(z.string()).max(5),
  summary: z.string(),
  actionPlan: actionPlanSchema,
});

const EVALUATOR_SYSTEM_PROMPT = `You are an expert interview evaluator and career coach. You will be given the full
transcript of a mock interview between an AI interviewer ("assistant") and a candidate ("user"),
the role and experience level the candidate was interviewing for, and optionally the text of the
candidate's own CV.

The role you are given may be a standard job title or a niche one the candidate wrote themselves.
Calibrate to the title you were actually given: judge the answers against the competencies that
specific role demands at that seniority, not against a more familiar neighbouring role. An answer
that would be thin for a generalist may be exactly right for a specialist, and vice versa.

Do this in three steps, thinking silently before you answer:

1. Read through the transcript and identify concrete, specific moments — a strong technical
   explanation, a vague or evasive answer, a well-structured response to a behavioral question,
   a moment of hesitation or contradiction.
2. Derive the category scores and overall score FROM those specific moments, not from a generic
   impression. Every strength and area for improvement you list must be traceable to something
   the candidate actually said.
3. Build a short, practical action plan (1-4 phases, each with an estimated duration like "1 week"
   or "2-3 weeks" and 2-6 concrete tasks) that a candidate could actually follow to close the
   specific gaps you identified in step 2 — never generic advice like "practice more". When the
   candidate's CV is provided, ground at least one task in it explicitly (e.g. a technology or
   project listed on the CV that the interview revealed a shallow understanding of, or a genuine
   strength from the CV worth leaning into further).

Be fair and realistic: a candidate who never got fully-formed technical questions (e.g. the call
ended early) should not be scored as if they failed a technical deep-dive — score what evidence
actually exists in the transcript, and note thin evidence in the summary rather than inventing a
harsh score. If overall performance was already strong, the action plan should focus on
sharpening and polishing rather than inventing weaknesses that weren't there.

Never reference or evaluate the candidate's age, gender, ethnicity, accent, disability, or any
other protected characteristic — evaluate only the substance of what they said.`;

/** The system prompt for the evaluation call — see app/api/evaluate/route.ts. */
export function buildEvaluationSystemPrompt(): string {
  return EVALUATOR_SYSTEM_PROMPT;
}

/**
 * The user-turn content for the evaluation call: role/level, the full
 * transcript, and — when the candidate uploaded one — their full, uncapped
 * CV text. Unlike the live Vapi call's variableValues (see
 * lib/assistant.ts's VAPI_CV_VARIABLE_MAX_CHARS), there's no payload-size
 * concern here, so the whole CV is passed through.
 */
export function buildEvaluationUserContent(
  transcript: TranscriptTurn[],
  config: InterviewConfig
): string {
  const transcriptText = transcript
    .map((turn) => `${turn.role === "assistant" ? "Interviewer" : "Candidate"}: ${turn.text}`)
    .join("\n");

  const cvBlock = config.cvText ? `\n\nCandidate's CV:\n${config.cvText}` : "";

  return `Role: ${config.role}\nExperience level: ${config.experienceLevel}${cvBlock}\n\nTranscript:\n${transcriptText}`;
}
