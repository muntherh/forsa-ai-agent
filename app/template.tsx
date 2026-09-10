"use client";

import { motion } from "framer-motion";

/**
 * Per-route entrance transition.
 *
 * This is a `template.tsx` rather than something inside `layout.tsx` because
 * templates re-mount on every navigation while layouts persist — the mount is
 * what re-fires the animation on each route change.
 *
 * Deliberately enter-only: the App Router unmounts the outgoing page before
 * the incoming one renders, so there is no window in which an exit animation
 * could play (that needs the View Transitions API, or the route to be a
 * modal/parallel segment). Where a departure should feel deliberate, the page
 * itself fades out first and navigates from `onAnimationComplete` — see the
 * CTA on `/` and `/setup`.
 *
 * Transform/opacity only, so it can never contribute layout shift.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
