"use client";

import { motion, useReducedMotion } from "framer-motion";
import CinematicText from "./CinematicText";

/**
 * The hero wordmark: "Forsa", English only.
 *
 * The letters get the same blur-to-focus spring entrance as the headline,
 * finished in a high-contrast white-to-slate gradient. The glow behind it is
 * a separate blurred layer rather than a text-shadow, so it reads as light
 * spilling off the type instead of a hard halo tracing the glyph edges.
 */
export default function BrandMark() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        aria-hidden
        initial={reduceMotion ? false : { opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute -top-8 h-36 w-[min(420px,80vw)] animate-glow-pulse rounded-full bg-teal/20 blur-[70px] dark:bg-teal-glow/25"
      />

      <CinematicText
        as="h1"
        text="Forsa"
        delay={0.15}
        stagger={0.075}
        className="relative font-display text-7xl font-extrabold leading-[1.05] tracking-tight sm:text-8xl"
        letterClassName="bg-gradient-to-b from-navy via-navy to-blue bg-clip-text text-transparent dark:from-white dark:via-white dark:to-slate-400"
      />

      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.75 }}
        className="mt-4 font-display text-[11px] font-bold uppercase tracking-[0.42em] text-teal-dark dark:text-teal-glow"
      >
        AI Interview Studio
      </motion.p>
    </div>
  );
}
