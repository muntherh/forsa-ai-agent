"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import GeometricBackground from "@/components/GeometricBackground";
import PulsingCore from "@/components/PulsingCore";
import {
  clearPendingEvaluation,
  loadPendingEvaluation,
  saveScorecard,
} from "@/lib/interview-session";
import { scorecardSchema } from "@/lib/rubric";

/**
 * The analysis sequence.
 *
 * The steps are mapped onto the work that is ACTUALLY happening, rather than
 * being a decorative timer: step 1 completes when the transcript has been
 * read, step 2 holds for exactly as long as the Claude request is in flight,
 * step 3 completes when the response has been validated against the rubric
 * schema, and step 4 when the action plan has been stored. So the sequence
 * can never claim to have finished work that is still pending, and it never
 * cuts off mid-animation either — navigation waits on both.
 *
 * (The PDF itself is generated in the browser on demand, when the candidate
 * clicks Download on the results page — so this step says "action plan", not
 * "action plan PDF". Nothing here writes a PDF.)
 */
const STEPS = [
  "Extracting conversation transcript",
  "Analyzing technical responses with Claude",
  "Synthesizing multi-criteria rubric",
  "Generating your action plan",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Phase = "running" | "done" | "error";

export default function EvaluatingPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [completed, setCompleted] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // React Strict Mode double-invokes effects in development; without this
    // guard the evaluation would be requested twice per visit.
    if (startedRef.current) return;
    startedRef.current = true;

    const pending = loadPendingEvaluation();
    if (!pending) {
      // Nothing to evaluate — someone opened this URL directly, or refreshed
      // after the result was already consumed.
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function run() {
      // Step 1 — the transcript is already in hand; this beat exists so the
      // sequence reads at a human pace rather than flashing past.
      await sleep(900);
      if (cancelled) return;
      setCompleted(1);

      // Step 2 — the real Claude round-trip. Held open for its full duration.
      let data: unknown;
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: pending!.transcript,
            role: pending!.role,
            experienceLevel: pending!.experienceLevel,
            cvText: pending!.cvText,
            callId: pending!.callId,
          }),
        });
        data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("[evaluating] evaluation request failed:", res.status, data);
          if (!cancelled) {
            setErrorMessage("The evaluation service couldn't score this interview.");
            setPhase("error");
          }
          return;
        }
      } catch (err) {
        console.error("[evaluating] evaluation request threw:", err);
        if (!cancelled) {
          setErrorMessage("We couldn't reach the evaluation service. Check your connection.");
          setPhase("error");
        }
        return;
      }
      if (cancelled) return;
      setCompleted(2);

      // Step 3 — validate against the same rubric schema the API generated
      // against, before anything downstream trusts it.
      await sleep(650);
      if (cancelled) return;
      const parsed = scorecardSchema.safeParse(data);
      if (!parsed.success) {
        console.error("[evaluating] scorecard failed validation:", parsed.error, data);
        setErrorMessage("The scorecard came back in an unexpected shape.");
        setPhase("error");
        return;
      }
      setCompleted(3);

      // Step 4 — hand the finished scorecard to /results.
      await sleep(650);
      if (cancelled) return;
      saveScorecard({
        scorecard: parsed.data,
        role: pending!.role,
        experienceLevel: pending!.experienceLevel,
        cvFileName: pending!.cvFileName,
      });
      // Only consumed once it has definitely been handed on — so a transient
      // failure above leaves the transcript intact and the page retryable.
      clearPendingEvaluation();
      setCompleted(4);
      setPhase("done");

      await sleep(900);
      if (cancelled) return;
      // replace, not push: the back button should return to the interview,
      // not to a loader with nothing left to load.
      router.replace("/results");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GeometricBackground />
      <AppHeader />

      <main className="relative mx-auto flex min-h-[calc(100vh-69px)] max-w-lg flex-col items-center justify-center px-6 pb-20">
        {phase === "error" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full rounded-[22px] border border-amber/30 bg-amber/10 p-8 text-center backdrop-blur-xl"
          >
            <h1 className="font-display text-lg font-bold text-navy dark:text-white">
              We couldn&apos;t finish the analysis
            </h1>
            <p className="mt-2 text-sm text-amber-dark dark:text-amber">{errorMessage}</p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-blue px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-dark dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:text-obsidian"
              >
                Try again
              </button>
              <Link
                href="/setup"
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-navy dark:border-white/15 dark:text-dark-muted dark:hover:text-white"
              >
                Start a new interview
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <PulsingCore done={phase === "done"} />

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.15 }}
              className="mt-8 text-center font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl dark:text-white"
            >
              {phase === "done" ? "Analysis complete" : "Analyzing your interview"}
            </motion.h1>
            <p className="mt-2.5 text-center text-sm text-muted dark:text-dark-muted">
              {phase === "done"
                ? "Opening your scorecard…"
                : "This usually takes around twenty seconds. Hang tight."}
            </p>

            <ol className="mt-10 w-full space-y-1" aria-live="polite">
              {STEPS.map((step, index) => {
                const isDone = index < completed;
                const isActive = index === completed && phase === "running";
                return (
                  <motion.li
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: isDone || isActive ? 1 : 0.4, x: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.25 + index * 0.09 }}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5"
                  >
                    <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
                      <AnimatePresence mode="wait" initial={false}>
                        {isDone ? (
                          <motion.span
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 18 }}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-teal/15 dark:bg-teal-glow/15"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M4 12.5l5 5L20 6"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-teal-dark dark:text-teal-glow"
                              />
                            </svg>
                          </motion.span>
                        ) : isActive ? (
                          <motion.span
                            key="spin"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-blue dark:border-white/15 dark:border-t-teal-glow"
                          />
                        ) : (
                          <motion.span
                            key="dot"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-1.5 w-1.5 rounded-full bg-muted/40 dark:bg-dark-muted/40"
                          />
                        )}
                      </AnimatePresence>
                    </span>
                    <span
                      className={`text-sm transition-colors ${
                        isDone
                          ? "text-navy dark:text-white"
                          : isActive
                            ? "font-medium text-navy dark:text-white"
                            : "text-muted dark:text-dark-muted"
                      }`}
                    >
                      {step}
                      {isActive && "…"}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}
