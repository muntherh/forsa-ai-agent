"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The analysis "core": a glowing centre with concentric rings that expand
 * outward and fade, plus a slow counter-rotating orbit. Rings are absolutely
 * positioned and centred with transforms only, so nothing here can shift
 * layout while it loops.
 */
export default function PulsingCore({ done = false }: { done?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-44 w-44 items-center justify-center" aria-hidden>
      {/* Expanding rings */}
      {!reduceMotion &&
        !done &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-teal/40 dark:border-teal-glow/40"
            style={{ width: 72, height: 72 }}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
          />
        ))}

      {/* Slow orbit */}
      <motion.span
        className="absolute rounded-full border border-dashed border-teal/25 dark:border-teal-glow/25"
        style={{ width: 150, height: 150 }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        className="absolute rounded-full border border-teal/20 dark:border-teal-glow/20"
        style={{ width: 112, height: 112 }}
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      {/* Glow */}
      <motion.span
        className="absolute h-24 w-24 rounded-full bg-teal/30 blur-2xl dark:bg-teal-glow/30"
        animate={reduceMotion ? undefined : { opacity: [0.45, 0.9, 0.45], scale: [1, 1.12, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core */}
      <motion.span
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal to-emerald shadow-[0_0_36px_-4px_rgba(47,224,182,0.75)]"
        animate={done ? { scale: 1 } : reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
        transition={done ? { type: "spring", stiffness: 300, damping: 18 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {done && (
          <motion.svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <path
              d="M4 12.5l5 5L20 6"
              stroke="#0A0A0A"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.span>
    </div>
  );
}
