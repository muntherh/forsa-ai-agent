/**
 * Runner for the Forsa AI pipeline evaluation suite.
 *
 *   npm run eval              # offline cases only (no credentials needed)
 *   npm run eval -- --live    # also runs cases requiring a running server
 *
 * Exits non-zero if any executed case fails, so it can gate CI.
 */

import { CASES, type EvalCase, type CaseResult } from "./cases.mts";

const includeLive = process.argv.includes("--live");

const GREEN = "[32m";
const RED = "[31m";
const DIM = "[2m";
const BOLD = "[1m";
const YEL = "[33m";
const OFF = "[0m";

interface Row {
  c: EvalCase;
  result: CaseResult | null;
  ms: number;
}

const rows: Row[] = [];

for (const c of CASES) {
  if (c.mode === "liveKey" && !includeLive) {
    rows.push({ c, result: null, ms: 0 });
    continue;
  }
  const t0 = performance.now();
  let result: CaseResult;
  try {
    result = await c.run();
  } catch (err) {
    result = { ok: false, detail: `threw: ${(err as Error).message}` };
  }
  rows.push({ c, result, ms: performance.now() - t0 });
}

console.log(`\n${BOLD}Forsa AI — Pipeline Evaluation Suite${OFF}`);
console.log(`${DIM}${CASES.length} benchmark cases · ${new Date().toISOString()}${OFF}\n`);

let currentDim = "";
for (const { c, result, ms } of rows) {
  if (c.dimension !== currentDim) {
    currentDim = c.dimension;
    console.log(`${BOLD}${currentDim}${OFF}`);
  }
  if (result === null) {
    console.log(`  ${YEL}○${OFF} ${c.id} ${c.name} ${DIM}— skipped (needs --live)${OFF}`);
    continue;
  }
  const mark = result.ok ? `${GREEN}✔${OFF}` : `${RED}✘${OFF}`;
  console.log(`  ${mark} ${c.id} ${c.name}`);
  console.log(`      ${DIM}${result.detail} (${ms.toFixed(1)}ms)${OFF}`);
}

const executed = rows.filter((r) => r.result !== null);
const passed = executed.filter((r) => r.result!.ok);
const failed = executed.filter((r) => !r.result!.ok);
const skipped = rows.filter((r) => r.result === null);
const totalMs = executed.reduce((sum, r) => sum + r.ms, 0);

console.log(`\n${BOLD}Summary${OFF}`);
console.log(`  Executed : ${executed.length}/${CASES.length}`);
console.log(`  Passed   : ${passed.length}`);
console.log(`  Failed   : ${failed.length}`);
if (skipped.length) console.log(`  Skipped  : ${skipped.length} ${DIM}(require --live + a running server)${OFF}`);
console.log(`  Wall time: ${totalMs.toFixed(1)}ms\n`);

if (failed.length) {
  console.log(`${RED}FAILED CASES${OFF}`);
  for (const f of failed) console.log(`  ${f.c.id} ${f.c.name} — ${f.result!.detail}`);
  process.exit(1);
}
console.log(`${GREEN}All executed cases passed.${OFF}\n`);
