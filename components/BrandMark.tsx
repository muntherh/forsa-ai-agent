"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * The "فرصة" hero centerpiece.
 *
 * Deliberately NOT split into per-character spans: Arabic is a cursive,
 * contextual script — each letter's glyph shape depends on its neighbors
 * (initial/medial/final/isolated forms), and browsers only apply that
 * shaping within a single, unbroken text run. Splitting "فرصة" into four
 * separate <span> letters (the obvious way to get a "staggered letter-by-
 * letter" reveal) would render each letter in its isolated form — visibly
 * broken Arabic, not a stylistic choice. Instead the whole word stays one
 * text node (correct shaping guaranteed) and "assembles" via an animated
 * clip-path wipe that sweeps right-to-left — matching Arabic's own reading
 * direction — combined with a blur-to-sharp focus pull.
 *
 * The English "Forsa AI" wordmark underneath has no such constraint, so it
 * gets a genuine per-letter spring stagger.
 */

const WORDMARK = "Forsa AI";

const wordmarkContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.5 } },
};

const wordmarkLetter: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.85 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 20, stiffness: 300 },
  },
};

export default function BrandMark() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow behind the Arabic centerpiece — a blurred, pulsing
          duplicate rather than a box-shadow, so it reads as light rather
          than a flat tinted rectangle. Purely decorative: aria-hidden. */}
      <motion.div
        aria-hidden
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="pointer-events-none absolute -top-10 h-40 w-64 animate-glow-pulse rounded-full bg-teal/25 blur-3xl dark:bg-indigo/30"
      />

      <motion.div
        dir="rtl"
        lang="ar"
        initial={reduceMotion ? undefined : { clipPath: "inset(0 0 0 100%)", filter: "blur(10px)", opacity: 0 }}
        animate={{ clipPath: "inset(0 0 0 0%)", filter: "blur(0px)", opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
        className="relative bg-gradient-to-l from-navy via-blue to-teal bg-clip-text font-display text-7xl font-extrabold leading-none text-transparent sm:text-8xl dark:from-indigo dark:via-indigo-glow dark:to-emerald-glow"
      >
        فرصة
      </motion.div>

      <motion.p
        variants={reduceMotion ? undefined : wordmarkContainer}
        initial="hidden"
        animate="visible"
        aria-label={WORDMARK}
        className="mt-3 flex font-display text-sm font-bold uppercase tracking-[0.35em] text-muted dark:text-dark-muted"
      >
        {WORDMARK.split("").map((char, i) => (
          <motion.span key={i} aria-hidden variants={reduceMotion ? undefined : wordmarkLetter}>
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
}
