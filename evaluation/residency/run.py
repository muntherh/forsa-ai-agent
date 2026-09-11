#!/usr/bin/env python3
"""
AI Residency FAQ agent — evaluation harness.

    python3 run.py --self-test                 # validate the GRADER (no agent needed)
    python3 run.py --url https://host/chat     # run the 15 cases against a live agent
    python3 run.py --url ... --json out.json   # machine-readable results

Grading is deterministic and offline: each case passes only when every atomic
fact its gold answer asserts is present in the agent's answer, the answer's
polarity is right, and no forbidden (contradicting) pattern appears. No LLM
judge, so a result is reproducible by anyone on a clean checkout.

Exits non-zero if any executed case fails, so it can gate CI.
"""
import argparse, csv, json, os, re, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
G, R, Y, D, B, O = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[1m", "\033[0m"

AFFIRM = re.compile(r"\byes\b|\b(is|are)\s+included\b|\bincludes\b|\bthere\s+is\b|\bprovided\b")
NEGATE = re.compile(r"\bno\b|\bnot\b|\bn't\b|\bnone\b|\bwithout\b")
SOFTEN = re.compile(r"helpful|helps|advantage|beneficial|useful|recommend|nice\s+to\s+have|good\s+to")


def normalise(text):
    t = (text or "").lower().replace("’", "'").replace("–", "-").replace("—", "-")
    t = re.sub(r"[^\w\s/.:'-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def fact_hit(fact, text):
    return any(re.search(a, text) for a in fact["any"])


def check_polarity(kind, text):
    if kind == "affirm":
        return (bool(AFFIRM.search(text)) and not re.search(r"\b(not|no)\s+\w*\s*(included|provided|available)", text),
                "affirmative")
    if kind == "negate":
        return bool(NEGATE.search(text)), "negative"
    if kind == "soft":
        return bool(SOFTEN.search(text)), "soft/advisory"
    return True, ""


def grade(case, answer):
    """Return (passed, [reasons]) for one case."""
    text = normalise(answer)
    reasons, ok = [], True

    if not text:
        return False, ["empty answer"]

    missing = [f["label"] for f in case.get("required", []) if not fact_hit(f, text)]
    if missing:
        ok = False
        reasons.append("missing required fact(s): " + ", ".join(missing))

    anyof = case.get("any_of")
    if anyof:
        hits = [f["label"] for f in anyof["facts"] if fact_hit(f, text)]
        if len(hits) < anyof["k"]:
            ok = False
            reasons.append(f"only {len(hits)}/{anyof['k']} required items ({', '.join(hits) or 'none'})")
        else:
            reasons.append(f"{len(hits)}/{len(anyof['facts'])} items present")

    for pat in case.get("forbidden", []):
        if re.search(pat, text):
            ok = False
            reasons.append(f"contradicting content matched /{pat}/")

    pol = case.get("polarity")
    if pol:
        good, name = check_polarity(pol, text)
        if not good:
            ok = False
            reasons.append(f"answer is not {name}")

    if ok and not reasons:
        n = len(case.get("required", []))
        reasons.append(f"all {n} required fact(s) present")
    return ok, reasons


def load():
    with open(os.path.join(HERE, "dataset.csv"), encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    rubric = json.load(open(os.path.join(HERE, "rubric.json"), encoding="utf-8"))["cases"]
    if len(rows) != len(rubric):
        sys.exit(f"dataset has {len(rows)} rows but rubric has {len(rubric)} cases")
    for c, r in zip(rubric, rows):
        c["question"] = r["User Input"].strip()
        c["gold"] = r["Expected Output"].strip()
    return rubric


def ask_http(url, question, in_field, out_field, timeout):
    payload = json.dumps({in_field: question}).encode()
    req = urllib.request.Request(url, data=payload,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode()
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return raw
    node = body
    for part in out_field.split("."):
        if isinstance(node, list):
            node = node[0] if node else {}
        if isinstance(node, dict) and part in node:
            node = node[part]
        else:
            return json.dumps(body)
    return node if isinstance(node, str) else json.dumps(node)


# ── Grader validation: legitimate paraphrases must PASS, factual errors must FAIL ──
PARAPHRASE = {
    "R01": "Cohort 9 of the AI Residency begins on January 24, 2026.",
    "R02": "There are twenty masterclasses in total.",
    "R03": "It runs for six months end to end.",
    "R04": "Yes - you get individual mentoring throughout the programme.",
    "R13": "You'll need a computer with a reliable internet connection.",
}
CORRUPTION = {
    "R01": "Cohort 9 starts on 24 Jan 2025.",
    "R02": "The program includes 10 masterclasses.",
    "R03": "The program duration is 3 months.",
    "R04": "No, one-on-one mentorship is not included.",
    "R05": "Estimated time required is about 20 hours per week.",
    "R06": "The program is for advanced level learners.",
    "R08": "You should know variables.",
    "R11": "Yes, an advanced technical background is required.",
    "R14": "You may work with platforms such as OpenAI.",
    "R15": "Fine-tuning.",
    "R09": "",
    "R12": "I don't know.",
}


def self_test(cases):
    by_id = {c["id"]: c for c in cases}
    print(f"\n{B}Grader validation{O} {D}(no agent required){O}\n")
    fails = 0

    print(f"  {B}1. Gold answers — every one must PASS{O}")
    for c in cases:
        ok, why = grade(c, c["gold"])
        fails += not ok
        print(f"     {G+'✔'+O if ok else R+'✘'+O} {c['id']} {c['topic']}{'' if ok else '  — ' + '; '.join(why)}")

    print(f"\n  {B}2. Legitimate paraphrases — must PASS (proves it is not exact-match){O}")
    for cid, ans in PARAPHRASE.items():
        ok, why = grade(by_id[cid], ans)
        fails += not ok
        print(f"     {G+'✔'+O if ok else R+'✘'+O} {cid} {D}“{ans[:52]}…”{O}{'' if ok else '  — ' + '; '.join(why)}")

    print(f"\n  {B}3. Corrupted answers — must FAIL (proves it detects real errors){O}")
    for cid, ans in CORRUPTION.items():
        ok, why = grade(by_id[cid], ans)
        caught = not ok
        fails += not caught
        label = ans[:46] + "…" if ans else "(empty answer)"
        print(f"     {G+'✔'+O if caught else R+'✘'+O} {cid} {D}“{label}”{O}"
              f"{'  → rejected: ' + why[0] if caught else '  — WRONGLY ACCEPTED'}")

    total = len(cases) + len(PARAPHRASE) + len(CORRUPTION)
    print(f"\n{B}Grader validation summary{O}")
    print(f"  Probes   : {total}  ({len(cases)} gold, {len(PARAPHRASE)} paraphrase, {len(CORRUPTION)} corrupted)")
    print(f"  Correct  : {total - fails}")
    print(f"  Incorrect: {fails}\n")
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", help="agent endpoint (POST JSON, returns JSON or text)")
    ap.add_argument("--in-field", default="message", help="request field carrying the question")
    ap.add_argument("--out-field", default="output", help="dotted path to the answer in the response")
    ap.add_argument("--timeout", type=float, default=60.0)
    ap.add_argument("--self-test", action="store_true", help="validate the grader, no agent needed")
    ap.add_argument("--json", metavar="PATH", help="write machine-readable results")
    args = ap.parse_args()

    cases = load()
    if args.self_test or not args.url:
        if not args.url and not args.self_test:
            print(f"{Y}No --url given; running grader validation only.{O}")
        sys.exit(self_test(cases))

    print(f"\n{B}AI Residency FAQ Agent — Evaluation Suite{O}")
    print(f"{D}{len(cases)} benchmark cases · target {args.url} · {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}{O}\n")

    results, passed, total_ms = [], 0, 0.0
    for c in cases:
        t0 = time.perf_counter()
        try:
            answer = ask_http(args.url, c["question"], args.in_field, args.out_field, args.timeout)
            err = None
        except Exception as exc:                      # noqa: BLE001 - reported, not swallowed
            answer, err = "", f"{type(exc).__name__}: {exc}"
        ms = (time.perf_counter() - t0) * 1000
        total_ms += ms
        ok, why = (False, [err]) if err else grade(c, answer)
        passed += ok
        results.append({"id": c["id"], "topic": c["topic"], "type": c["type"],
                        "question": c["question"], "gold": c["gold"],
                        "answer": answer, "passed": ok, "reasons": why, "ms": round(ms, 1)})
        print(f"  {G+'✔'+O if ok else R+'✘'+O} {c['id']} {c['topic']} {D}({c['type']}){O}")
        print(f"      {D}{'; '.join(why)} ({ms:.0f}ms){O}")
        if not ok and answer:
            print(f"      {D}got: {answer[:100]}{O}")

    n = len(cases)
    lat = sorted(r["ms"] for r in results)
    print(f"\n{B}Summary{O}")
    print(f"  Executed  : {n}/{n}")
    print(f"  Passed    : {passed}")
    print(f"  Failed    : {n - passed}")
    print(f"  Pass rate : {passed / n * 100:.1f}%")
    print(f"  Latency   : mean {total_ms / n:.0f}ms · median {lat[n // 2]:.0f}ms · max {lat[-1]:.0f}ms\n")

    if args.json:
        json.dump({"target": args.url, "cases": n, "passed": passed,
                   "pass_rate": round(passed / n, 4),
                   "latency_ms": {"mean": round(total_ms / n, 1), "median": lat[n // 2], "max": lat[-1]},
                   "results": results}, open(args.json, "w"), indent=2)
        print(f"{D}wrote {args.json}{O}\n")

    if passed < n:
        print(f"{R}FAILED CASES{O}")
        for r in results:
            if not r["passed"]:
                print(f"  {r['id']} {r['topic']} — {'; '.join(r['reasons'])}")
        print()
        sys.exit(1)
    print(f"{G}All cases passed.{O}\n")


if __name__ == "__main__":
    main()
