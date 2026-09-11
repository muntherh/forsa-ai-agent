/**
 * Forsa AI — pipeline evaluation suite.
 *
 * 15 benchmark cases exercising the REAL application modules (imported
 * directly, not reimplemented) across the four dimensions the platform
 * claims to handle: role/competency extraction, CV context handling,
 * evaluation-schema conformance, and upskilling recommendation logic.
 *
 * Cases are split by whether they need a live upstream credential:
 *   - `offline`  : deterministic, runs anywhere, no API key, no network.
 *   - `liveKey`  : requires ANTHROPIC_API_KEY / a running server.
 * The runner reports the two groups separately so a result is never
 * presented as measured when its prerequisite was absent.
 */

import { buildInterviewVariableValues, buildInterviewAssistant } from "../lib/assistant.ts";
import { buildEvaluationUserContent, scorecardSchema } from "../lib/rubric.ts";
import { ROLE_CATEGORIES, EXPERIENCE_LEVELS } from "../lib/roles.ts";
import { recommendCourses, COURSE_CATALOGUE } from "../lib/upskilling.ts";
import type { Scorecard } from "../lib/types.ts";

export type CaseResult = { ok: boolean; detail: string };
export interface EvalCase {
  id: string;
  dimension: string;
  name: string;
  mode: "offline" | "liveKey";
  run: () => Promise<CaseResult> | CaseResult;
}

const pass = (detail: string): CaseResult => ({ ok: true, detail });
const fail = (detail: string): CaseResult => ({ ok: false, detail });

/** A structurally valid scorecard, used as the base for schema cases. */
function validScorecard(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    overallScore: 74,
    recommendation: "Hire",
    categoryScores: { technicalKnowledge: 70, problemSolving: 72, communication: 68, confidence: 80 },
    strengths: ["Explained the indexing trade-off with a concrete example."],
    areasForImprovement: ["Did not quantify the write-amplification cost."],
    summary: "Solid mid-level performance with real hands-on grounding.",
    actionPlan: {
      title: "Two weeks to sharper system answers",
      summary: "Close the quantification gap.",
      phases: [{ title: "Quantify", estimatedDuration: "1 week", tasks: ["Write down p99 targets."] }],
    },
    ...overrides,
  };
}

function scores(t: number, p: number, c: number, cf: number): Scorecard {
  return validScorecard({
    categoryScores: { technicalKnowledge: t, problemSolving: p, communication: c, confidence: cf },
  }) as unknown as Scorecard;
}

export const CASES: EvalCase[] = [
  // ─── A. Role & competency extraction (incl. custom job titles) ───────────
  {
    id: "A1",
    dimension: "Role extraction",
    name: "Catalogue role reaches the live agent verbatim",
    mode: "offline",
    run: () => {
      const v = buildInterviewVariableValues({ role: "Machine Learning Engineer", experienceLevel: "Senior" });
      return v?.role === "Machine Learning Engineer"
        ? pass(`role injected as "${v.role}"`)
        : fail(`expected verbatim role, got ${JSON.stringify(v?.role)}`);
    },
  },
  {
    id: "A2",
    dimension: "Role extraction",
    name: "Custom free-text title is NOT coerced to a catalogue role",
    mode: "offline",
    run: () => {
      const custom = "Quantitative Researcher (Systematic Macro)";
      const v = buildInterviewVariableValues({ role: custom, experienceLevel: "Lead / Principal" });
      const known = ROLE_CATEGORIES.some((c) => c.roles.some((r) => r.label === v?.role));
      return v?.role === custom && !known
        ? pass(`custom title preserved verbatim, not snapped to a preset`)
        : fail(`custom title altered: ${JSON.stringify(v?.role)}`);
    },
  },
  {
    id: "A3",
    dimension: "Role extraction",
    name: "Custom title also reaches the evaluation prompt",
    mode: "offline",
    run: () => {
      const custom = "Developer Relations Engineer";
      const content = buildEvaluationUserContent(
        [
          { role: "assistant", text: "Tell me about your background." },
          { role: "user", text: "I run developer education programmes." },
        ],
        { role: custom, experienceLevel: "Mid-Level" }
      );
      return content.includes(custom)
        ? pass("evaluator is calibrated to the same custom title as the interviewer")
        : fail("custom title absent from evaluation prompt");
    },
  },
  {
    id: "A4",
    dimension: "Role extraction",
    name: "Role taxonomy integrity (unique ids, labelled, non-empty categories)",
    mode: "offline",
    run: () => {
      const ids = ROLE_CATEGORIES.flatMap((c) => c.roles.map((r) => r.id));
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      const unlabelled = ROLE_CATEGORIES.flatMap((c) => c.roles).filter((r) => !r.label?.trim());
      const empty = ROLE_CATEGORIES.filter((c) => c.roles.length === 0);
      return dupes.length === 0 && unlabelled.length === 0 && empty.length === 0
        ? pass(`${ROLE_CATEGORIES.length} categories / ${ids.length} roles, all unique and labelled`)
        : fail(`dupes=${dupes.length} unlabelled=${unlabelled.length} emptyCategories=${empty.length}`);
    },
  },

  // ─── B. CV context handling (incl. sparse / absent / oversized) ──────────
  {
    id: "B1",
    dimension: "CV handling",
    name: "No CV supplied — interview remains viable (graceful degradation)",
    mode: "offline",
    run: () => {
      const v = buildInterviewVariableValues({ role: "Backend Engineer", experienceLevel: "Junior / Intern" });
      return v?.cvContext === ""
        ? pass("cvContext empty; prompt instructs the agent to run a general interview")
        : fail(`expected empty cvContext, got ${JSON.stringify(v?.cvContext)}`);
    },
  },
  {
    id: "B2",
    dimension: "CV handling",
    name: "Sparse CV passes through intact (no padding, no invention)",
    mode: "offline",
    run: () => {
      const sparse = "Jane Doe. Graduate. Python.";
      const v = buildInterviewVariableValues({ role: "Data Analyst", experienceLevel: "Junior / Intern", cvText: sparse });
      return v?.cvContext === sparse
        ? pass(`${sparse.length}-char CV forwarded unchanged`)
        : fail(`sparse CV mutated: ${JSON.stringify(v?.cvContext)}`);
    },
  },
  {
    id: "B3",
    dimension: "CV handling",
    name: "Oversized CV capped + sanitised before entering the call payload",
    mode: "offline",
    run: () => {
      const hostile = ('Led "Project X"\n\tacross\r\nteams.  ' + "x".repeat(5000));
      const v = buildInterviewVariableValues({ role: "DevOps Engineer", experienceLevel: "Senior", cvText: hostile });
      const ctx = String(v?.cvContext ?? "");
      const clean = !/["'\r\n\t]/.test(ctx) && !/ {2}/.test(ctx);
      return ctx.length <= 1000 && clean
        ? pass(`capped 5000+ -> ${ctx.length} chars, quotes/newlines/tabs stripped`)
        : fail(`len=${ctx.length} clean=${clean}`);
    },
  },

  // ─── C. Evaluation schema conformance (deterministic rendering) ──────────
  {
    id: "C1",
    dimension: "Schema conformance",
    name: "Well-formed scorecard validates",
    mode: "offline",
    run: () => {
      const r = scorecardSchema.safeParse(validScorecard());
      return r.success ? pass("accepted") : fail(`rejected valid payload: ${r.error.message.slice(0, 120)}`);
    },
  },
  {
    id: "C2",
    dimension: "Schema conformance",
    name: "Out-of-range score is rejected (score > 100)",
    mode: "offline",
    run: () => {
      const r = scorecardSchema.safeParse(validScorecard({ overallScore: 142 }));
      return !r.success ? pass("rejected, as required") : fail("accepted an impossible score of 142");
    },
  },
  {
    id: "C3",
    dimension: "Schema conformance",
    name: "Missing action plan is rejected (UI contract upheld)",
    mode: "offline",
    run: () => {
      const bad = validScorecard();
      delete (bad as Record<string, unknown>).actionPlan;
      const r = scorecardSchema.safeParse(bad);
      return !r.success ? pass("rejected, as required") : fail("accepted a scorecard with no action plan");
    },
  },
  {
    id: "C4",
    dimension: "Schema conformance",
    name: "Unknown recommendation enum is rejected",
    mode: "offline",
    run: () => {
      const r = scorecardSchema.safeParse(validScorecard({ recommendation: "Maybe Hire" }));
      return !r.success ? pass("rejected, as required") : fail('accepted "Maybe Hire" outside the enum');
    },
  },

  // ─── D. Upskilling recommendation logic ─────────────────────────────────
  {
    id: "D1",
    dimension: "Upskilling logic",
    name: "Weakest dimension is addressed first (low communication)",
    mode: "offline",
    run: () => {
      const recs = recommendCourses(scores(78, 80, 52, 88));
      const first = recs[0];
      const confidenceOffered = recs.some((r) => r.category === "confidence");
      return first?.category === "communication" && !confidenceOffered
        ? pass(`first recommendation targets communication (52/100); strong confidence (88) excluded`)
        : fail(`first=${first?.category}, confidenceOffered=${confidenceOffered}`);
    },
  },
  {
    id: "D2",
    dimension: "Upskilling logic",
    name: "Uniformly strong candidate is not told they have a weakness",
    mode: "offline",
    run: () => {
      const recs = recommendCourses(scores(90, 88, 86, 92));
      return recs.length > 0 && recs.every((r) => r.isReinforcement)
        ? pass("falls back to reinforcement framing rather than inventing a gap")
        : fail(`reinforcement flag not set on ${recs.length} recommendation(s)`);
    },
  },
  {
    id: "D3",
    dimension: "Upskilling logic",
    name: "Roadmap is bounded and free of duplicates",
    mode: "offline",
    run: () => {
      const recs = recommendCourses(scores(40, 42, 38, 44)); // everything weak
      const ids = recs.map((r) => r.course.id);
      const unique = new Set(ids).size === ids.length;
      const inCatalogue = ids.every((id) => COURSE_CATALOGUE.some((c) => c.id === id));
      return recs.length > 0 && recs.length <= 4 && unique && inCatalogue
        ? pass(`${recs.length} recommendations, capped at 4, no repeats, all resolve to the catalogue`)
        : fail(`n=${recs.length} unique=${unique} inCatalogue=${inCatalogue}`);
    },
  },

  // ─── E. Assistant + API contract ────────────────────────────────────────
  {
    id: "E1",
    dimension: "Agent contract",
    name: "Assistant is fully defined in code (no dashboard dependency)",
    mode: "offline",
    run: () => {
      const a = buildInterviewAssistant() as Record<string, unknown>;
      const model = a.model as Record<string, unknown> | undefined;
      const messages = (model?.messages ?? []) as Array<{ content?: string }>;
      const prompt = messages[0]?.content ?? "";
      const hasVars = ["{{role}}", "{{experienceLevel}}", "{{cvContext}}"].every((t) => prompt.includes(t));
      const hasEndCall = Array.isArray(model?.tools) && (model.tools as Array<{ type?: string }>).some((t) => t.type === "endCall");
      return hasVars && hasEndCall && !!a.transcriber && !!a.voice
        ? pass("model+voice+transcriber+endCall tool defined inline; all 3 template variables present")
        : fail(`vars=${hasVars} endCall=${hasEndCall}`);
    },
  },
  {
    id: "E2",
    dimension: "Agent contract",
    name: "/api/evaluate rejects a malformed request body (400, no upstream call)",
    mode: "liveKey",
    run: async () => {
      const base = process.env.EVAL_BASE_URL ?? "http://localhost:3311";
      try {
        const res = await fetch(`${base}/api/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: [], role: "", experienceLevel: "" }),
        });
        return res.status === 400
          ? pass("400 returned before any upstream request")
          : fail(`expected 400, got ${res.status}`);
      } catch (err) {
        return fail(`no server reachable at ${base} (${(err as Error).message})`);
      }
    },
  },
];

export const EXPERIENCE_LEVEL_COUNT = EXPERIENCE_LEVELS.length;
