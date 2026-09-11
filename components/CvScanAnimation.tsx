"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSafeReducedMotion } from "@/lib/motion";

/**
 * The scanning state shown while an uploaded CV is being read: a document
 * outline with a teal laser sweeping it, and short status badges drifting
 * upward beside it.
 *
 * The badges describe work that genuinely happens in this window — the PDF is
 * parsed to text server-side, and that text is what later grounds the
 * interviewer's questions and the evaluation. They are paced by a timer
 * rather than driven by real parse progress, because `/api/cv-extract` is a
 * single request with no progress events to subscribe to.
 */

const BADGES = ["Extracting text…", "Reading experience…", "Detecting skills…", "Indexing projects…"];

/** How long each badge stays before the next replaces it. */
const BADGE_INTERVAL_MS = 620;

export default function CvScanAnimation({ fileName }: { fileName: string | null }) {
  const reduced = useSafeReducedMotion();
  const [badgeIndex, setBadgeIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setBadgeIndex((i) => (i + 1) % BADGES.length);
    }, BADGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="mt-2 flex items-center gap-5 overflow-hidden rounded-2xl border border-teal/30 bg-teal/[0.04] px-5 py-5 backdrop-blur-xl dark:border-teal-glow/25 dark:bg-teal-glow/[0.05]">
      {/* Document + laser */}
      <div className="relative h-[68px] w-[54px] flex-shrink-0">
        <svg viewBox="0 0 54 68" className="h-full w-full" aria-hidden>
          <path
            d="M6 3h27l15 15v47a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"
            className="fill-white/70 stroke-teal-dark/50 dark:fill-white/[0.06] dark:stroke-teal-glow/45"
            strokeWidth="2"
          />
          <path d="M33 3v15h15" className="fill-none stroke-teal-dark/50 dark:stroke-teal-glow/45" strokeWidth="2" />
          {[28, 36, 44, 52].map((y, i) => (
            <rect
              key={y}
              x="11"
              y={y}
              width={i === 3 ? 20 : 32}
              height="3"
              rx="1.5"
              className="fill-teal-dark/25 dark:fill-teal-glow/25"
            />
          ))}
        </svg>

        {/* The laser: a bright line with a soft bloom, sweeping the document.
            Transform-only, so it never reflows the surrounding layout. */}
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-[-4px] h-[3px] rounded-full bg-teal shadow-[0_0_12px_3px_rgba(47,224,182,0.85)] dark:bg-teal-glow"
            initial={{ top: 4, opacity: 0 }}
            animate={{ top: [4, 60, 4], opacity: [0, 1, 1, 0] }}
            transition={{
              top: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1.6, repeat: Infinity, times: [0, 0.12, 0.88, 1], ease: "linear" },
            }}
          />
        )}
      </div>

      {/* Status text + drifting badges */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy dark:text-white">
          Scanning {fileName ?? "your CV"}…
        </p>

        <div className="relative mt-1.5 h-5">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={badgeIndex}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="absolute inset-x-0 truncate font-mono text-[11px] text-teal-dark dark:text-teal-glow"
            >
              {BADGES[badgeIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
