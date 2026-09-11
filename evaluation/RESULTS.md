# Evaluation Dataset and Results

**Project:** Forsa AI — Real-Time Voice Interviewer & Performance Evaluator
**Track:** LLM/API Integration (Code-First)
**Repository:** https://github.com/muntherh/forsa-ai-agent
**Reproduce:** `npm run eval` (offline set) · `npm run eval -- --live` (full set)

---

## 1. Evaluation Philosophy

Forsa AI produces a *scored judgement about a person*. That raises the bar for
evidence: a scorecard that renders beautifully but is structurally unsound, or an
interviewer that silently substitutes a role it recognises for the one the
candidate actually asked for, fails the user invisibly. The evaluation strategy
therefore targets the properties that are falsifiable in software — **contract
integrity, input robustness, and determinism** — and states plainly where a
property requires live upstream credentials to measure.

Every case in the suite imports and exercises the **real application modules**
(`lib/assistant.ts`, `lib/rubric.ts`, `lib/roles.ts`, `lib/upskilling.ts`). No
logic is reimplemented inside the tests, so a passing case reflects shipped
behaviour rather than a parallel mock of it.

---

## 2. Evaluation Dataset

The benchmark comprises **16 cases across 5 dimensions**, deliberately weighted
toward the failure modes that matter for an interview product: unrecognised job
titles, missing or degenerate CV input, and malformed model output.

| Dimension | Cases | What it certifies |
|---|---|---|
| **A — Role & competency extraction** | 4 | Catalogue *and* free-text custom titles reach both the interviewer and the evaluator unaltered |
| **B — CV context handling** | 3 | Absent, sparse, and oversized CVs all degrade gracefully |
| **C — Evaluation schema conformance** | 4 | Malformed model output is rejected before it can reach the UI |
| **D — Upskilling recommendation logic** | 3 | Recommendations are traceable to a real weak score, bounded, and non-duplicated |
| **E — Agent & API contract** | 2 | Assistant is self-contained; the API rejects bad input before spending an upstream call |

### 2.1 Case inventory

| # | Dimension | Case | Mode |
|---|---|---|---|
| A1 | Role extraction | Catalogue role reaches the live agent verbatim | offline |
| A2 | Role extraction | Custom free-text title is **not** coerced to a catalogue role | offline |
| A3 | Role extraction | Custom title also reaches the evaluation prompt | offline |
| A4 | Role extraction | Taxonomy integrity — unique ids, labelled, non-empty categories | offline |
| B1 | CV handling | No CV supplied — interview remains viable | offline |
| B2 | CV handling | Sparse CV passes through intact (no padding, no invention) | offline |
| B3 | CV handling | Oversized CV capped and sanitised before entering the call payload | offline |
| C1 | Schema | Well-formed scorecard validates | offline |
| C2 | Schema | Out-of-range score rejected (`overallScore: 142`) | offline |
| C3 | Schema | Missing action plan rejected | offline |
| C4 | Schema | Unknown recommendation enum rejected (`"Maybe Hire"`) | offline |
| D1 | Upskilling | Weakest dimension addressed first; strong dimensions excluded | offline |
| D2 | Upskilling | Uniformly strong candidate is not told they have a weakness | offline |
| D3 | Upskilling | Roadmap bounded (≤4) and free of duplicates | offline |
| E1 | Agent contract | Assistant fully defined in code — no dashboard dependency | offline |
| E2 | API contract | `/api/evaluate` rejects a malformed body with 400, no upstream call | live |

**Edge-case inputs exercised:** a hybrid custom title
(`"Quantitative Researcher (Systematic Macro)"`), a 27-character sparse CV, a
5,000+ character CV containing embedded quotes, tabs and CRLF sequences, a score
of 142/100, a scorecard with its action plan deleted, and an invented enum value.

### 2.2 Measurement honesty

Cases declare whether they require a live credential. Offline cases run with no
API key and no network. The live case is **skipped by default and reported
separately** — the runner never prints a result as measured when its
prerequisite was absent. A failure exits non-zero, so the suite can gate CI.

---

## 3. Results

### 3.1 Benchmark suite

```
Forsa AI — Pipeline Evaluation Suite
16 benchmark cases

Executed : 16/16
Passed   : 16
Failed   : 0
Wall time: 139.7ms
```

| Metric | Result |
|---|---|
| Cases executed | **16 / 16** |
| Cases passed | **16 (100%)** |
| Schema-conformance failures | **0 / 4** malformed payloads accepted |
| Custom-title fidelity | **100%** — preserved verbatim into both prompts |
| Role taxonomy | **5 categories / 43 roles**, all ids unique, all labelled |
| CV payload capping | 5,000+ chars → **1,000 chars**, control characters stripped |
| Suite wall time | **139.7 ms** (offline subset: 5.8 ms) |

### 3.2 Pipeline integrity (browser-measured)

Driven end-to-end in headless Chromium across `/` → `/setup` → `/interview` →
`/evaluating` → `/results`:

| Metric | Result |
|---|---|
| Cumulative Layout Shift — landing | **0** (with ambient animation running) |
| Cumulative Layout Shift — results | **0.0004** |
| Horizontal overflow @ 375 / 768 / 1280 px | **0 px** at every breakpoint |
| Console / page errors across the full flow | **0** |
| Deep-link guards (`/evaluating`, `/results` with no payload) | Redirect to `/` — no hang |
| Analysis-screen honesty | Exactly **1** completed step displayed while the evaluation request was still in flight |
| State handoff | Role, level and CV survive every route boundary; scorecard Zod-validated **before** storage |

### 3.3 PDF action plan (artifact-verified with PyMuPDF)

The exported report was opened and inspected programmatically, not merely
downloaded:

| Metric | Result |
|---|---|
| Pages generated | **3** (cover + scores, action plan, upskilling roadmap) |
| Clickable link annotations | **4**, all resolving to the intended course URLs |
| Link hit-area accuracy | **4/4** annotations fully cover their printed URL text |
| Page ground truth | White; light branding preserved despite the dark UI |

Coordinate mapping was corrected during development: the first implementation
placed hit areas **7.7 pt above** the glyphs, because the rectangle is measured
on the live DOM while the text is rasterised by `html2canvas`, whose baseline
placement differs slightly. Hit areas are now padded to absorb that drift and
each was re-verified against the rendered glyph bands.

### 3.4 Build and static analysis

| Metric | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 errors** |
| ESLint | **0 warnings, 0 errors** |
| Production build (`next build`) | **Passes** — 8 routes |
| Shared first-load JS | **102 kB** |
| Audio assets in initial bundle | **0 kB** — ~31 kB lazy-loaded on first play (`/setup` grew 1.4 kB) |

---

## 4. Defects Found and Resolved Through Evaluation

Evaluation earned its cost by surfacing four defects that static checks and a
passing build did not:

1. **Serverless PDF parse failure.** `pdf-parse` resolves its worker at runtime,
   so Vercel's file tracer omitted it — a 500 in production only. Fixed with
   `outputFileTracingIncludes`, reproduced locally by running the traced output
   in isolation.
2. **Missing `DOMMatrix` in the serverless runtime.** `pdfjs-dist` instantiates
   one at module load even for pure text extraction. Fixed with a dependency-free
   polyfill.
3. **Invisible hero typography in dark mode.** `background-clip: text` cannot
   clip to glyphs painted by children that own compositing layers, and every
   letter animates `filter`. Caught only by looking at the rendered page.
4. **Environment-variable name mismatch.** Production was provisioned with
   `NEXT_PUBLIC_VAPI_KEY` (the sibling project's name) while the app read
   `NEXT_PUBLIC_VAPI_PUBLIC_KEY` — a silent, total failure of the interview
   screen. Now both names resolve, and `/api/health` reports which one was used.

---

## 5. Declared Limits of This Evaluation

Stated explicitly, because an evaluation section is only as credible as its
boundary:

- **Live scoring quality is not benchmarked.** The suite certifies that Claude's
  output conforms to the rubric schema and renders deterministically. It does
  **not** measure agreement between model scores and human interviewer
  judgement; that requires an inter-rater study against labelled transcripts.
- **End-to-end voice latency is not measured here.** The WebRTC loop requires
  live Vapi credentials, which are absent from the automated environment. Voice
  behaviour was validated interactively, not by instrumented benchmark.
- **Upstream evaluation latency is not reported.** Every automated run used a
  stubbed or validation-path response; no timing figure is claimed for the live
  Claude call.

**Next measurement step.** Extend the harness with a labelled transcript corpus
(strong / average / weak answers per dimension) and assert monotonicity — a
stronger transcript must not score lower — which converts scoring quality from
an assertion into a test.
