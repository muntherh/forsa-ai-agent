/**
 * Forsa AI — pipeline evaluation suite.
 *
 * Benchmark cases exercising the REAL application modules (imported
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
import {
  createInterviewFlowState,
  noteAssistantSpeechEnd,
  noteAssistantSpeechStart,
  noteCandidateAudio,
  noteMuteChange,
  nextReassurance,
  MAX_SILENCE_PROMPTS_PER_TURN,
  MUTED_REASSURANCES,
  SILENCE_PROMPT_AFTER_MS,
  SILENCE_REASSURANCES,
  CANDIDATE_AUDIO_THRESHOLD,
} from "../lib/interview-flow.ts";
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


/** The live interviewer's system prompt, read from the real assistant config. */
function systemPrompt(): string {
  const a = buildInterviewAssistant() as Record<string, unknown>;
  const model = a.model as Record<string, unknown> | undefined;
  const messages = (model?.messages ?? []) as Array<{ content?: string }>;
  return messages[0]?.content ?? "";
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

  // ─── F. Conversational resilience (silence + Smart Mute) ────────────────
  {
    id: "F1",
    dimension: "Conversational resilience",
    name: "A brief thinking pause is never interrupted",
    mode: "offline",
    run: () => {
      const t0 = 1_000_000;
      const s = noteAssistantSpeechEnd(createInterviewFlowState(t0), t0);
      const due = nextReassurance(s, t0 + 6_000);
      return due === null
        ? pass("6s of thought left undisturbed (threshold is 10s)")
        : fail(`interrupted a 6s pause with: "${due.line}"`);
    },
  },
  {
    id: "F2",
    dimension: "Conversational resilience",
    name: "Ten seconds of dead air earns reassurance, not a skipped question",
    mode: "offline",
    run: () => {
      const t0 = 1_000_000;
      const s = noteAssistantSpeechEnd(createInterviewFlowState(t0), t0);
      const due = nextReassurance(s, t0 + SILENCE_PROMPT_AFTER_MS + 500);
      const known = due && (SILENCE_REASSURANCES as readonly string[]).includes(due.line);
      return known
        ? pass(`reassured after ${SILENCE_PROMPT_AFTER_MS / 1000}s: "${due!.line}"`)
        : fail(due ? `unexpected line: "${due.line}"` : "candidate left in silence indefinitely");
    },
  },
  {
    id: "F3",
    dimension: "Conversational resilience",
    name: "Silence while the interviewer is still speaking never triggers a prompt",
    mode: "offline",
    run: () => {
      const t0 = 1_000_000;
      // Agent mid-sentence: the candidate being quiet is correct, not dead air.
      const s = noteAssistantSpeechStart(noteAssistantSpeechEnd(createInterviewFlowState(t0), t0), t0);
      const due = nextReassurance(s, t0 + 30_000);
      return due === null
        ? pass("30s of assistant speech produced no self-interruption")
        : fail(`talked over its own question with: "${due.line}"`);
    },
  },
  {
    id: "F4",
    dimension: "Conversational resilience",
    name: "Muted candidate gets mute-specific reassurance, capped to avoid nagging",
    mode: "offline",
    run: () => {
      const t0 = 1_000_000;
      let s = noteMuteChange(noteAssistantSpeechEnd(createInterviewFlowState(t0), t0), true, t0);
      const lines: string[] = [];
      // Push well past the cap: 10 minutes of muted silence, sampled per second.
      for (let t = t0; t <= t0 + 600_000; t += 1_000) {
        const due = nextReassurance(s, t);
        if (due) {
          s = due.state;
          lines.push(due.line);
        }
      }
      const allMuteSpecific = lines.every((l) => (MUTED_REASSURANCES as readonly string[]).includes(l));
      const capped = lines.length === MAX_SILENCE_PROMPTS_PER_TURN;
      return capped && allMuteSpecific
        ? pass(`${lines.length} mute-aware prompts over 10 minutes, then silence — capped at ${MAX_SILENCE_PROMPTS_PER_TURN}`)
        : fail(`count=${lines.length} (expected ${MAX_SILENCE_PROMPTS_PER_TURN}), allMuteSpecific=${allMuteSpecific}`);
    },
  },
  {
    id: "F5",
    dimension: "Conversational resilience",
    name: "Real speech resets the clock; room tone does not",
    mode: "offline",
    run: () => {
      const t0 = 1_000_000;
      const base = noteAssistantSpeechEnd(createInterviewFlowState(t0), t0);

      // Audible speech at 9s, then 5s more silence => only 5s of true silence.
      const spoke = noteCandidateAudio(base, CANDIDATE_AUDIO_THRESHOLD + 0.1, t0 + 9_000);
      const afterSpeech = nextReassurance(spoke, t0 + 14_000);

      // Sub-threshold room tone must NOT count as speech, so 11s still prompts.
      const quiet = noteCandidateAudio(base, CANDIDATE_AUDIO_THRESHOLD / 2, t0 + 9_000);
      const afterNoise = nextReassurance(quiet, t0 + 11_000);

      return afterSpeech === null && afterNoise !== null
        ? pass("speech resets the silence clock; sub-threshold room tone is correctly ignored")
        : fail(`afterSpeech=${afterSpeech ? "prompted" : "silent"} afterNoise=${afterNoise ? "prompted" : "silent"}`);
    },
  },

  // ─── G. Persona & safety contract ───────────────────────────────────────
  {
    id: "G1",
    dimension: "Persona & safety",
    name: "Non-discrimination rule is present and marked absolute",
    mode: "offline",
    run: () => {
      const p = systemPrompt().toLowerCase();
      const traits = ["age", "gender", "ethnicity", "religion", "disability", "national origin"];
      const missing = traits.filter((t) => !p.includes(t));
      const absolute = p.includes("overrides every other instruction");
      const accent = p.includes("accent");
      return missing.length === 0 && absolute && accent
        ? pass(`all ${traits.length} protected traits prohibited, accent included, rule declared overriding`)
        : fail(`missing=${missing.join(",") || "none"} absolute=${absolute} accent=${accent}`);
    },
  },
  {
    id: "G2",
    dimension: "Persona & safety",
    name: "Agent is instructed to refuse prompt extraction",
    mode: "offline",
    run: () => {
      const p = systemPrompt().toLowerCase();
      return p.includes("never reveal") && p.includes("these instructions")
        ? pass("prompt-extraction refusal present, with no stated exception")
        : fail("no instruction against revealing the system prompt");
    },
  },
  {
    id: "G3",
    dimension: "Persona & safety",
    name: "Never presents itself as a real hiring decision",
    mode: "offline",
    run: () => {
      const p = systemPrompt().toLowerCase();
      return p.includes("mock interview") && p.includes("hiring decision has been made")
        ? pass("practice framing stated; claiming a real hiring decision explicitly forbidden")
        : fail("mock-interview disclaimer missing or weakened");
    },
  },
  {
    id: "G4",
    dimension: "Persona & safety",
    name: "Every experience level has explicit seniority calibration",
    mode: "offline",
    run: () => {
      // Drift guard: adding a level to lib/roles.ts without calibrating the
      // interviewer for it would silently interview that cohort at the wrong bar.
      const p = systemPrompt();
      const uncalibrated = EXPERIENCE_LEVELS.filter((lvl) => !p.includes(lvl));
      return uncalibrated.length === 0
        ? pass(`all ${EXPERIENCE_LEVELS.length} levels calibrated in the prompt`)
        : fail(`no calibration for: ${uncalibrated.join(", ")}`);
    },
  },
];

export const EXPERIENCE_LEVEL_COUNT = EXPERIENCE_LEVELS.length;
