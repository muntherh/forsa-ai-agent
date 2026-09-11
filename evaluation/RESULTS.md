# Forsa AI — Evaluation Dataset and Results

**Technical Report · Decoding Data Science / Tamkeen AI Agent Challenge 2026**

| | |
|---|---|
| **Project** | Forsa AI — Real-Time Voice Interviewer & Performance Evaluator |
| **Builder** | Al-Munther Hilal Al-Harrasi (Individual Builder) |
| **Track** | LLM/API Integration (Code-First) |
| **Repository** | https://github.com/muntherh/forsa-ai-agent |
| **Harness** | `evaluation/` — 476 lines, 0 additional dependencies |
| **Reproduce** | `npm run eval` → 20/21 (no credentials) · `npm run eval -- --live` → 21/21 |

---

## 1. Introduction & Methodology

### 1.1 Why this system requires evidence, not assertion

Forsa AI issues a **scored judgement about a person** and converts that judgement
into a personalised development plan. That raises the evidentiary bar above
conventional web software. A scorecard can render beautifully while being
structurally unsound. An interviewer can sound fluent while silently substituting
a job title it recognises for the one the candidate actually requested. Both
failures are invisible to the user and invisible to a passing build.

The evaluation strategy therefore targets the properties that are **falsifiable
in software** — contract integrity, input robustness, and determinism — and
states explicitly where a property cannot be measured without live upstream
credentials.

### 1.2 The harness: real modules, no mocks

The suite lives in the repository at `evaluation/` and is executed with
`npm run eval`. Its defining architectural decision is that **every case imports
and exercises the production modules directly**:

```
evaluation/cases.mts  →  lib/assistant.ts    (agent construction, variable injection)
                      →  lib/rubric.ts       (evaluation prompt, Zod schema)
                      →  lib/roles.ts        (role taxonomy)
                      →  lib/upskilling.ts   (recommendation engine)
```

No logic is reimplemented inside a test double. A passing case therefore reflects
**shipped behaviour**, not a parallel mock that can drift from it — the single
most common way a green test suite comes to certify nothing.

### 1.3 Zero-dependency, zero-build execution

The harness runs the TypeScript sources directly through **Node's native type
stripping** (`node --experimental-strip-types`, Node v22.22.2). There is no
transpilation step, no bundler, and no test framework added to the dependency
tree. The entire suite is 476 lines and adds **zero** packages to
`package.json` — a deliberate choice, since an evaluation apparatus that itself
introduces supply-chain surface is a poor trade for a security-conscious
submission.

### 1.4 Measurement honesty as a design constraint

Each case declares a `mode`:

- **`offline`** — fully deterministic. No API key, no network, no external state.
- **`liveKey`** — requires a running server or upstream credential.

Cases requiring credentials are **skipped by default and reported in a separate
tally**. The runner is structurally incapable of printing a skipped case as
passed. A failure exits non-zero, allowing the suite to gate CI. This is what
permits the results in §4 to be read as measurements rather than claims.

---

## 2. System Architecture Under Test

The measurements in §4 are only meaningful against a clear statement of what was
built. Two architectural decisions define the system.

### 2.1 A deliberate two-model split

Forsa AI runs **two different models for two different jobs**, rather than
forcing one model to do both badly.

| Stage | Component | Configuration |
|---|---|---|
| **Live conversation** | GPT-4o, served through Vapi | `provider: "openai"`, `model: "gpt-4o"`, `temperature: 0.6` |
| **Speech-to-text** | Deepgram Nova-2 | `language: "en"` |
| **Text-to-speech** | OpenAI `alloy` | — |
| **Transport** | Vapi WebRTC | `maxDurationSeconds: 900` |
| **Turn-taking** | Vapi start/stop speaking plans | `waitSeconds: 1.2`, LiveKit endpointing, `numWords: 3` |
| **Noise** | Smart background-speech denoising | `enabled: true` |
| **Post-call evaluation** | Anthropic Claude Sonnet (`claude-sonnet-5`) | Structured Outputs against a Zod schema |

The rationale is latency versus rigour. A live interview turn must return fast
enough to feel like a conversation; the evaluation that follows has no such
constraint but must emit a **schema-valid scorecard** that the UI and the PDF
exporter can both consume without defensive parsing. Those are different
problems, and they are solved by different models.

The assistant — model, voice, transcriber, system prompt, and its self-invoked
`endCall` tool — is constructed **entirely in code** (`lib/assistant.ts`). No
assistant is pre-created in a Vapi dashboard, which means the platform runs on a
public key alone and there is no externally-held configuration that can drift out
of sync with the repository. Case **E1** in §3.5 certifies exactly this property.

Giving the model an `endCall` tool is a small decision with real consequence: the
agent closes the interview itself once its question set is complete, rather than
the application inferring "done" from transcript heuristics that would misfire on
a long pause or a candidate's closing remark.

### 2.2 Conversational resilience: Smart Mute and graceful silence

A voice interview fails in a specific, demoralising way: the candidate pauses to
think, and the agent reads the silence as a non-answer and moves on. The
candidate concludes the machine gave up on them. Three mechanisms prevent it.

**Turn-taking is tuned, not left at defaults.** `startSpeakingPlan.waitSeconds`
is raised from 0.4s to **1.2s**, so the agent stops jumping into the mid-sentence
pauses people take while assembling a technical answer, with **LiveKit smart
endpointing** (the SDK's explicit recommendation for English). `stopSpeakingPlan`
requires **3 words** to interrupt, so a listener's "mm" or "right" no longer cuts
the interviewer off mid-question. Smart background-speech denoising is enabled,
because live judging happens in a room containing other conversations.

**Smart Mute is a signal, not a switch.** Muting stops transmission *and* writes a
system turn into the conversation telling the agent the silence is deliberate —
that it must not be scored as a non-answer, must not trigger a repeat, and must
not advance to a new question. The notice is injected with
`triggerResponseEnabled: false`: it is context, not a cue to speak. An agent that
announced "I see you have muted" would defeat the purpose entirely.

**Silence earns reassurance, not abandonment.** After **10 seconds** of genuine
dead air on the candidate's turn, the agent speaks one short line — *"Take your
time, I'm here when you're ready"* — delivered with interruptions enabled so a
candidate finding their words can talk straight over it. Muted candidates get a
mute-specific variant. Reassurance is capped at **two per turn**: a third is
nagging someone who needs to think.

The timing is driven client-side, in `lib/interview-flow.ts`, for a concrete
reason: Vapi's own `messagePlan.idleMessages` and `silenceTimeoutSeconds` are
**absent from `CreateAssistantDTO`** in the installed SDK, so neither is settable
on a transient assistant. Every decision in that module is a pure function —
state in, state out, no timers, no Vapi handle, no DOM — which is what allows
Dimension F in §3.6 to test the behaviour directly rather than requiring someone
to sit through a real ten-second silence.

There is deliberately **no destructive "end call" control**. Finishing is a quiet,
two-step confirmation that hands off to scoring exactly as a naturally-concluded
interview does.

### 2.3 CV → transcript cross-analysis

The system does not score spoken answers in isolation. The candidate's CV is
injected at **two separate stages**, under two different constraints.

| Stage | CV form | Purpose |
|---|---|---|
| **Live interview** | Sanitised and capped to **1,000 characters** — quotes, newlines, tabs and repeated whitespace stripped | The interviewer opens on a **real project from the candidate's own history**, and grounds at least one technical question in it, instead of a generic opener |
| **Post-call evaluation** | **Full text, uncapped**, sent alongside the complete transcript | Claude weighs what the candidate **said** against what they **claimed** |

The cap exists for a concrete reason. Vapi's call-start request carries the CV in
its `variableValues` payload; raw PDF extraction routinely yields several thousand
characters of multi-line text with quote characters and column artifacts, which
can malform that payload and reject the call at the exact moment the candidate
presses *Start*. The evaluation call has no such constraint, so it receives
everything — the asymmetry is intentional, and case **B3** in §3.2 certifies it.

The payoff is in the action plan. The evaluation prompt **requires** at least one
task to be grounded in a specific CV item — a listed technology the interview
revealed a shallow understanding of, or a genuine strength worth building on.
This is what separates an evaluator from a transcript summariser: the output is
anchored to the candidate's own claimed history, not to generic advice.

*Scope note:* the prompt instructs the evaluator to weigh transcript evidence
against the CV and to ground remediation in it. It does **not** run a separate
contradiction-detection pass, and the *quality* of that cross-analysis is not
benchmarked here — see §6.1.

---

## 3. Benchmark Dataset Breakdown

The dataset comprises **21 cases across 6 dimensions**, weighted deliberately
toward the failure modes that matter for an interview product: unrecognised job
titles, degenerate CV input, and malformed model output.

| Dimension | Cases | Property certified |
|---|---|---|
| **A — Role & competency extraction** | 4 | Catalogue *and* free-text titles reach both the interviewer and the evaluator unaltered |
| **B — CV context handling** | 3 | Absent, sparse, and adversarial CV inputs degrade gracefully |
| **C — Schema conformance** | 4 | Malformed model output is rejected before reaching the UI |
| **D — Upskilling recommendation logic** | 3 | Recommendations trace to a real deficit, bounded and non-duplicated |
| **E — Agent & API contract** | 2 | Assistant is self-contained; the API rejects bad input before spending an upstream call |
| **F — Conversational resilience** | 5 | Pauses and mutes are handled as thinking time, never as non-answers |

### 3.1 Dimension A — Custom role parsing and competency extraction

Forsa AI accepts arbitrary free-text job titles. The architectural risk is
**silent normalisation**: a model that quietly interviews a "Quantitative
Researcher" as a generic Data Scientist produces a plausible-sounding but
invalid assessment.

| # | Case | Assertion |
|---|---|---|
| **A1** | Catalogue role reaches the live agent verbatim | `buildInterviewVariableValues()` injects the exact label into the Vapi call's `variableValues` |
| **A2** | Hybrid custom title is **not** coerced to a preset | `"Quantitative Researcher (Systematic Macro)"` survives verbatim and matches **no** catalogue entry |
| **A3** | Custom title also reaches the *evaluation* prompt | The scorer is calibrated to the same title as the interviewer — no interviewer/evaluator drift |
| **A4** | Taxonomy integrity | All role ids unique, all labels non-empty, no empty categories |

The title in **A2** is chosen adversarially: it contains a parenthetical
sub-specialisation, spans two recognised disciplines, and appears nowhere in the
43-role catalogue.

### 3.2 Dimension B — Edge-case CV inputs

| # | Input profile | Assertion |
|---|---|---|
| **B1** | **Absent** — no CV uploaded | `cvContext` resolves to empty string; the system prompt directs the agent to run a general interview rather than hallucinate a background |
| **B2** | **Extremely sparse** — 27 characters (`"Jane Doe. Graduate. Python."`) | Forwarded byte-identical. No padding, no inferred experience |
| **B3** | **Adversarial / oversized** — 5,000+ characters containing embedded double quotes, tabs, and CRLF sequences | Capped to **1,000 characters**; quotes, newlines, tabs and repeated whitespace stripped before entering the call payload |

**B3** protects a real failure mode. The Vapi call-start request carries
`variableValues` in its payload; raw PDF extraction routinely produces multi-line
text with quote characters and column artifacts that can malform that payload and
reject the call at the moment the candidate presses *Start*.

### 3.3 Dimension C — Schema conformance and JSON structure validation

The evaluation route uses **Anthropic Structured Outputs** —
`client.messages.parse()` with `output_config.format` derived from a Zod schema
— so the model is constrained at generation time rather than corrected
afterwards. Dimension C certifies the second line of defence: the schema itself.

| # | Payload | Expected |
|---|---|---|
| **C1** | Well-formed scorecard | **Accepted** |
| **C2** | `overallScore: 142` (out of 0–100 range) | **Rejected** |
| **C3** | `actionPlan` key deleted | **Rejected** — the UI contract requires it |
| **C4** | `recommendation: "Maybe Hire"` (outside enum) | **Rejected** |

*Implementation note:* the schema is authored against the **Zod v4 API surface**
via the `zod/v4` entry point of the installed `zod@3.25.76`. This is load-bearing
rather than cosmetic — `zodOutputFormat()` calls `z.toJSONSchema()` internally,
which exists only on v4-style schema instances; a schema built from the classic
v3 import fails at runtime when passed to it.

### 3.4 Dimension D — Threshold-based upskilling recommendation logic

The recommendation engine converts rubric scores into a learning roadmap. A
category scoring **below 75** is treated as a genuine deficit; recommendations
are ordered weakest-first, limited to two courses per deficit and **four in
total**.

| # | Scenario | Assertion |
|---|---|---|
| **D1** | Communication 52, Confidence 88 | First recommendation targets **communication**; the strong dimension is **excluded** — no filler |
| **D2** | All four categories ≥ 86 | Engine returns **reinforcement** framing, never inventing a weakness the candidate does not have |
| **D3** | All four categories ≤ 44 | Roadmap remains **bounded at 4**, contains **no duplicates**, and every entry resolves to the catalogue |

**D2 is the case that protects credibility.** A recommendation engine that always
finds a fault is an engine whose findings carry no information. Each rendered
card displays the numeric score that triggered it (e.g. *"Communication ·
52/100"*), making every suggestion auditable by the candidate.

### 3.5 Dimension E — Agent and API contract

| # | Case | Assertion |
|---|---|---|
| **E1** | Assistant is fully defined in code | Model, voice, transcriber and the `endCall` tool are constructed inline; all three template variables (`{{role}}`, `{{experienceLevel}}`, `{{cvContext}}`) are present. No dashboard-side assistant is required — the platform runs on a public key alone |
| **E2** | `/api/evaluate` rejects a malformed body | Returns **400 before any upstream call is made**, protecting both latency and spend |

### 3.6 Dimension F — Conversational resilience

The behaviour described in §2.2 is timing-dependent, which normally makes it the
kind of feature that is demonstrated rather than tested. Because the logic is
expressed as pure functions over an explicit clock, these cases drive ten minutes
of simulated silence in under a millisecond.

| # | Scenario | Assertion |
|---|---|---|
| **F1** | 6 seconds of thought | **No** interruption — under the 10s threshold |
| **F2** | 10+ seconds of dead air on the candidate's turn | Exactly one reassurance, drawn from the silence set |
| **F3** | 30 seconds of silence **while the agent is still speaking** | **No** prompt — the agent never talks over its own question |
| **F4** | 10 minutes muted, sampled once per second | Exactly **2** prompts, all mute-specific, then silence — the cap holds |
| **F5** | Audible speech at 9s vs. sub-threshold room tone at 9s | Speech resets the clock; room tone does **not** |

**F3 and F4 are the cases that matter.** F3 guards the failure where an agent
interrupts itself because it cannot tell its own speech from dead air. F4 proves
the cap holds under sustained pressure: a candidate who mutes for ten minutes is
reassured twice and then left in peace, rather than nagged 50 times.

---

## 4. Quantitative Results & Performance Metrics

### 4.1 Benchmark suite

The suite runs in two modes, and the distinction is reported rather than hidden.

**Mode 1 — `npm run eval` · 20 deterministic cases, no credentials, no network**

```
Summary
  Executed : 20/21
  Passed   : 20
  Failed   : 0
  Skipped  : 1 (require --live + a running server)
  Wall time: 4.2ms
```

**Mode 2 — `npm run eval -- --live` · all 21 cases against a running server**

```
  ✔ E2 /api/evaluate rejects a malformed request body (400, no upstream call)
      400 returned before any upstream request (99.8ms)

Summary
  Executed : 21/21
  Passed   : 21
  Failed   : 0
  Wall time: 105.6ms

All executed cases passed.
```

A judge running the default command will see **20/21 executed with 1 skipped** —
that is the harness working as designed, not a gap. The twenty-first case (E2)
requires a live HTTP server, so it is withheld by default and tallied separately.
The runner is structurally incapable of printing a skipped case as passed, which
is precisely what makes the 21/21 in Mode 2 meaningful.

| Metric | Result |
|---|---|
| **Pass rate — full suite** | **100% (21 / 21)** |
| **Pass rate — credential-free subset** | **100% (20 / 20 executed, 1 correctly skipped)** |
| Failures across both modes | **0** |
| Malformed payloads accepted by the schema | **0 / 4** |
| Custom-title fidelity | **100%** — preserved verbatim into both prompts |
| Role taxonomy | **5 categories / 43 roles**, all ids unique, all labelled |
| CV payload capping | 5,000+ chars → **1,000 chars**, control characters stripped |
| Deterministic subset wall time (20 cases) | **4.2 ms** |
| Full-suite wall time (21 cases) | **105.6 ms** |
| Dependencies added by the harness | **0** |

Execution overhead is low enough that the suite is a **pre-commit-viable gate**,
not a nightly job. The 20 deterministic cases complete in **4.2 ms** combined —
including ten minutes of simulated interview silence in F4.
The full-suite figure is dominated almost entirely by the single HTTP round-trip
in E2 — **99.8 ms of the 105.6 ms total** — which is network time, not evaluation
overhead.

### 4.2 Pipeline integrity — browser-measured

Driven end-to-end in headless Chromium across
`/` → `/setup` → `/interview` → `/evaluating` → `/results`:

| Metric | Result |
|---|---|
| Cumulative Layout Shift — landing | **0** (with ambient animation running) |
| Cumulative Layout Shift — results | **0.0004** |
| Horizontal overflow @ 375 / 768 / 1280 px | **0 px** at every breakpoint |
| Console and page errors across the full flow | **0** |
| Deep-link guards (`/evaluating`, `/results` with no payload) | Redirect to `/` — no indefinite spinner |
| Analysis-screen integrity | Exactly **1** step displayed as complete while the evaluation request remained in flight |
| State handoff | Role, level and CV survive every route boundary; scorecard is Zod-validated **before** persistence |

The analysis-screen metric is deliberate. The loading sequence is gated on the
**actual** request lifecycle rather than a decorative timer, so the interface
cannot report work as finished while it is still pending.

### 4.3 PDF action plan — artifact-level verification

The exported report was opened and inspected **programmatically with PyMuPDF**,
not merely downloaded:

| Metric | Result |
|---|---|
| Pages generated | **3** (cover + scores · action plan · upskilling roadmap) |
| Clickable link annotations | **4**, all resolving to intended course URLs |
| Hit-area accuracy | **4 / 4** annotations fully enclose their printed URL glyphs |
| Page ground | White; light print branding preserved despite the dark product UI |

**Coordinate mapping — engineering detail.** `html2canvas` rasterises the layout
to a flat image, which destroys `<a>` elements. Clickability is restored by
re-attaching native jsPDF link annotations, computing each rectangle by measuring
the anchor against its page container and scaling into millimetres — the page is
authored at exactly 210 mm, so it is its own px-per-mm reference and the two
cannot drift.

The first implementation placed hit areas **7.7 pt above the glyphs**: the
rectangle is measured on the live DOM while the text is drawn by `html2canvas`,
whose baseline placement differs slightly. Hit areas are now padded to absorb
that drift, and each was re-verified against the rendered glyph bands extracted
from the generated file.

### 4.4 Build, static analysis and regression posture

| Metric | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 errors** |
| ESLint | **0 warnings, 0 errors** |
| Production build (`next build`) | **Passes** — 9 routes |
| Shared first-load JS | **102 kB** |
| Audio assets in initial bundle | **0 kB** — ~31 kB lazy-loaded on first play |
| Runtime environment diagnostics | `/api/health` reports live commit SHA and per-variable configuration state (booleans only; no secret values, prefixes or lengths) |

### 4.5 Verified stack

| Layer | Component | Version |
|---|---|---|
| Framework | Next.js (App Router, serverless) | 15.5.25 |
| UI | React · Tailwind CSS · Framer Motion | 18.3.1 · 3.4.7 · 11.11.17 |
| Evaluation model | Anthropic Claude Sonnet (`claude-sonnet-5`) | SDK 0.124.0 |
| Schema | Zod (v4 API via `zod/v4` entry point) | 3.25.76 |
| Voice | Vapi Web SDK (WebRTC) · Deepgram Nova-2 STT | 2.6.3 |
| Documents | pdf-parse · jsPDF · html2canvas | 2.4.5 · 4.2.1 · 1.4.1 |
| Runtime | Node.js | 22.22.2 |

---

## 5. Defects Surfaced by Evaluation

Evaluation earned its cost by surfacing four defects that a passing build and a
clean type-check did not:

1. **Serverless PDF-parse failure.** `pdf-parse` resolves its worker at runtime,
   so the platform's build-time file tracer omitted it — producing a 500 in
   production only. Diagnosed by running the traced output in isolation;
   resolved with `outputFileTracingIncludes`.
2. **Missing `DOMMatrix` in the serverless runtime.** `pdfjs-dist` instantiates
   one at module load even for pure text extraction, and the native canvas
   package it normally sources it from does not survive serverless packaging.
   Resolved with a dependency-free polyfill.
3. **Invisible hero typography in dark mode.** `background-clip: text` cannot
   clip to glyphs painted by child elements that own compositing layers, and
   every letter animates `filter`. Detectable only by rendering the page.
4. **Environment-variable namespace mismatch.** Production was provisioned with
   `NEXT_PUBLIC_VAPI_KEY` while the application read
   `NEXT_PUBLIC_VAPI_PUBLIC_KEY` — a silent, total failure of the interview
   screen despite the key being present. Both names now resolve, and
   `/api/health` reports which was used.

---

## 6. Declared Boundaries and Technical Rigor

An evaluation section is only as credible as the boundary it declares. The
following are **explicitly outside** the scope of the measurements above:

**6.1 Scoring quality is not benchmarked against human raters.** The suite
certifies that model output conforms to the rubric schema and renders
deterministically. It does **not** measure agreement between Claude's category
scores and expert human interviewer judgement, which would require an
inter-rater reliability study over labelled transcripts.

**6.2 End-to-end voice latency is a property of upstream providers.** The WebRTC
loop (Vapi orchestration, Deepgram transcription, model inference, speech
synthesis) is measured across networks and infrastructure outside this
repository's control. Voice behaviour was validated interactively; no
instrumented latency figure is claimed as a controlled measurement.

**6.3 Upstream evaluation latency is not reported.** Every automated run used a
deterministic or validation-path response. No timing figure is asserted for the
live Claude call, as none was measured under controlled conditions.

**6.4 Turn-taking is tuned, but its perceptual quality is not measured.** The
speaking plans, Smart Mute signalling and silence reassurance in §2.2 are real
configuration and real code, and Dimension F tests the *decision logic* — when a
prompt fires, when it must not, and that the cap holds. What is **not** measured
is how the result feels over a live WebRTC connection: whether 1.2s is the right
wait on a slow network, or whether a 3-word interruption threshold is
comfortable in practice. Those are perceptual judgements requiring real calls
with real candidates. The values are reasoned starting points, not tuned optima.

**6.5 What the boundary buys.** Confining automated claims to deterministic
logic, schema conformance and system contracts means every figure in §4 is
reproducible by a judge on a clean checkout, with no credential, in under a
second. Metrics that depend on third-party infrastructure are named as such
rather than estimated.

### 6.6 Declared next measurement

The natural extension is a **labelled transcript corpus** — strong, average and
weak responses per rubric dimension — asserting **monotonicity**: a strictly
stronger transcript must never receive a lower category score. This converts
scoring quality from an assertion into a test, and is the recommended first
addition to the harness post-submission.

---

## 7. Reproduction

```bash
git clone https://github.com/muntherh/forsa-ai-agent
cd forsa-ai-agent && npm install

npm run eval              # 20 deterministic cases — no credentials required
npm run eval -- --live    # all 21 cases — requires a running server

npx tsc --noEmit          # type integrity
npm run lint              # static analysis
npm run build             # production build
```

The harness exits non-zero on any failure and is therefore suitable as a CI gate.
