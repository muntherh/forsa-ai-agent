"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from "framer-motion";

/**
 * Decorative hero backdrop: a faint grid plus a handful of soft blurred
 * particles that drift continuously (CSS, GPU-composited) and parallax
 * gently toward the cursor (framer-motion motion values, transform-only).
 *
 * Must be placed inside a `relative`-positioned ancestor that clips it —
 * this component itself is `absolute inset-0`, so it never affects document
 * flow or causes layout shift: it only ever moves via `transform`, never
 * `top`/`left`/size, and the parallax is driven by framer-motion's motion
 * values directly (not React state), so mouse movement never triggers a
 * React re-render.
 */

interface Particle {
  id: number;
  size: number;
  top: string;
  left: string;
  depth: number; // parallax strength multiplier — larger = moves more
  duration: number;
  delay: number;
}

const PARTICLES: Particle[] = [
  { id: 1, size: 220, top: "8%", left: "12%", depth: 18, duration: 10, delay: 0 },
  { id: 2, size: 160, top: "62%", left: "8%", depth: 28, duration: 12, delay: 1.2 },
  { id: 3, size: 260, top: "15%", left: "78%", depth: 14, duration: 11, delay: 0.6 },
  { id: 4, size: 140, top: "70%", left: "82%", depth: 24, duration: 9, delay: 2 },
  { id: 5, size: 190, top: "40%", left: "48%", depth: 10, duration: 13, delay: 0.9 },
];

export default function AmbientBackground() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 20 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    // Reduced motion: pointerX/pointerY simply never move away from their
    // initial 0, so every particle's parallax transform stays inert — no
    // need to conditionally skip the hooks that consume them below.
    if (reduceMotion) return;
    const node = containerRef.current;
    if (!node) return;

    function handlePointerMove(event: PointerEvent) {
      const rect = node!.getBoundingClientRect();
      // Normalized -1..1 offset from the container's center.
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      pointerX.set(nx);
      pointerY.set(ny);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [reduceMotion, pointerX, pointerY]);

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Faint dot grid — barely-there in light mode (clean, professional),
          a touch more present in dark mode where it reads as depth rather
          than noise. */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(11,46,74,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute inset-0 hidden opacity-50 dark:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(129,140,248,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {PARTICLES.map((particle) => (
        <AmbientParticle key={particle.id} particle={particle} springX={springX} springY={springY} reduceMotion={!!reduceMotion} />
      ))}
    </div>
  );
}

function AmbientParticle({
  particle,
  springX,
  springY,
  reduceMotion,
}: {
  particle: Particle;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  reduceMotion: boolean;
}) {
  // Scales the shared cursor-position springs by this particle's own depth
  // factor — a lightweight per-layer parallax illusion without a separate
  // spring instance per particle. Always called unconditionally (rules of
  // hooks); harmless when reduceMotion is true since the source springs
  // never move away from 0 in that case (see the effect above).
  const x = useTransform(springX, (value) => value * particle.depth);
  const y = useTransform(springY, (value) => value * particle.depth);

  const driftStyle: CSSProperties | undefined = reduceMotion
    ? undefined
    : ({
        animationDuration: `${particle.duration}s`,
        animationDelay: `${particle.delay}s`,
        // Consumed by the "drift" keyframes in tailwind.config.ts.
        "--drift-x": `${particle.depth}px`,
        "--drift-y": `${-particle.depth}px`,
      } as CSSProperties);

  return (
    <motion.div
      className="absolute rounded-full bg-teal/20 blur-3xl dark:bg-indigo/25"
      style={{ width: particle.size, height: particle.size, top: particle.top, left: particle.left, x, y }}
    >
      <div className={`h-full w-full rounded-full ${reduceMotion ? "" : "animate-drift"}`} style={driftStyle} />
    </motion.div>
  );
}
