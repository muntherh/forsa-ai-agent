# AI Residency FAQ Agent — Evaluation Harness

Deterministic, dependency-free evaluation of a knowledge-grounded FAQ agent
against a 15-case benchmark dataset.

```bash
python3 run.py --self-test                    # validate the grader (no agent needed)
python3 run.py --url https://host/endpoint    # run all 15 cases against a live agent
python3 run.py --url ... --json results.json  # machine-readable output
```

Requires Python 3.8+. No packages to install.

## Files

| File | Role |
|---|---|
| `dataset.csv` | The benchmark: 15 `User Input` / `Expected Output` pairs. Never edited by the harness. |
| `rubric.json` | Per-case grading spec — the atomic facts each answer must assert. |
| `run.py` | Runner, HTTP adapter, grader, and grader self-test. |

## How answers are graded

Exact string matching would fail any legitimate rephrasing; an LLM judge would
be non-deterministic and unreproducible. This harness instead grades at the
level of **atomic facts**. A case passes only when:

1. every fact in `required` is present (each fact matches any of its aliases,
   so "24 Jan 2026", "January 24, 2026" and "2026-01-24" are all accepted);
2. at least `any_of.k` of the listed items appear, for enumeration questions;
3. no `forbidden` pattern matches — content that contradicts the gold answer;
4. the answer's **polarity** is right — affirmative, negative, or soft/advisory.

Polarity matters more than it looks. "Is 1-on-1 mentorship included?" and "Do I
need an advanced technical background?" can both be answered with the right
keywords and still be completely wrong, because the truth is carried by the
yes/no, not by the nouns.

## Connecting an agent

`--url` POSTs `{"<in-field>": "<question>"}` and reads the answer from the
response. Both ends are configurable, so most chat endpoints work as-is:

```bash
python3 run.py --url https://host/webhook/faq \
               --in-field message \
               --out-field output          # dotted paths work: choices.0.message.content
```

A non-JSON response is graded as raw text. Transport errors fail the case they
occur on and are reported — never silently retried or skipped.

## Validating the grader

`--self-test` runs 32 probes with no agent: 15 gold answers that must pass, 5
legitimate paraphrases that must also pass (proving the grader is not exact
matching), and 12 corrupted answers — wrong dates, wrong counts, flipped
yes/no, truncated enumerations, an empty response, and a refusal — that must
all be rejected.

Run it after any rubric edit. It has already caught one real defect: an early
`forbidden` rule for R11 matched its own gold answer, because the gold negates
the phrase it was scanning for ("**No** advanced technical background is
required"). Polarity, not pattern-matching, is the correct mechanism there.

## Exit codes

`0` = all executed cases passed · `1` = at least one failed. Suitable as a CI gate.
