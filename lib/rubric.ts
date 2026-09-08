import { z } from "zod";
import type { InterviewConfig, TranscriptTurn } from "./types";

/**
 * The evaluation rubric, expressed twice:
 *
 * 1. `SCORECARD_JSON_SCHEMA` — passed as OpenAI's `response_format.json_schema`
 *    on the evaluation call in app/api/evaluate/route.ts (Structured Outputs,
 *    "strict" mode — every field is required and `additionalProperties` is
 *    false at every object level, which is what strict mode requires).
 * 2. `scorecardSchema` (zod) — used again on this app's own side once the
 *    response comes back, before it's trusted and rendered. Belt and
 *    suspenders: strict mode makes a malformed shape unlikely, not
 *    impossible (a timeout, a proxy, or a future API change could still
 *    hand back something unexpected).
 *
 * Keep the two in sync.
 */

export const SCORECARD_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: {
      type: "number",
      description: "Overall interview performance, 0-100.",
    },
    recommendation: {
      type: "string",
      enum: ["Strong Hire", "Hire", "No Hire", "Strong No Hire"],
      description: "A hiring recommendation consistent with the overall score and category scores.",
    },
    categoryScores: {
      type: "object",
      additionalProperties: false,
      properties: {
        technicalKnowledge: { type: "number", description: "0-100. Depth and accuracy of technical answers." },
        problemSolving: { type: "number", description: "0-100. Structured thinking and approach to problems." },
        communication: { type: "number", description: "0-100. Clarity, organization, and articulation of answers." },
        confidence: { type: "number", description: "0-100. Composure and conviction in responses." },
      },
      required: ["technicalKnowledge", "problemSolving", "communication", "confidence"],
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Up to 3 concrete strengths, each grounded in a specific moment from the interview.",
    },
    areasForImprovement: {
      type: "array",
      items: { type: "string" },
      description: "Up to 3 concrete areas to improve, each grounded in a specific moment from the interview.",
    },
    summary: {
      type: "string",
      description: "A 2-3 sentence narrative summary of the candidate's overall performance.",
    },
  },
  required: ["overallScore", "recommendation", "categoryScores", "strengths", "areasForImprovement", "summary"],
} as const;

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
});

const EVALUATOR_SYSTEM_PROMPT = `You are an expert interview evaluator. You will be given the full transcript of
a mock interview between an AI interviewer ("assistant") and a candidate ("user"), along with the
role and experience level the candidate was interviewing for.

Evaluate the candidate's performance in two steps, thinking silently before you answer:
1. Read through the transcript and identify concrete, specific moments — a strong technical
   explanation, a vague or evasive answer, a well-structured response to a behavioral question,
   a moment of hesitation or contradiction.
2. Derive the category scores and overall score FROM those specific moments, not from a generic
   impression. Every strength and area for improvement you list must be traceable to something
   the candidate actually said.

Be fair and realistic: a candidate who never got fully-formed technical questions (e.g. the call
ended early) should not be scored as if they failed a technical deep-dive — score what evidence
actually exists in the transcript, and note thin evidence in the summary rather than inventing a
harsh score.

Never reference or evaluate the candidate's age, gender, ethnicity, accent, disability, or any
other protected characteristic — evaluate only the substance of what they said.`;

export function buildEvaluationMessages(transcript: TranscriptTurn[], config: InterviewConfig) {
  const transcriptText = transcript.map((turn) => `${turn.role === "assistant" ? "Interviewer" : "Candidate"}: ${turn.text}`).join("\n");

  return [
    { role: "system" as const, content: EVALUATOR_SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Role: ${config.role}\nExperience level: ${config.experienceLevel}\n\nTranscript:\n${transcriptText}`,
    },
  ];
}
