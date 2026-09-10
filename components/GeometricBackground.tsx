"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from "framer-motion";

/**
 * The ambient backdrop: the geometry of the word "Forsa" itself, abstracted.
 * Each shape is the structural essence of one letter — the O's perfect ring,
 * the S's sweeping spine, the R's bowl and leg, the A's apex intersection,
 * the F's perpendicular arms — blown up to several hundred pixels, blurred
 * into soft light, and left to drift.
 *
 * Structured as three nested layers per shape, deliberately:
 *
 *   parallax wrapper  (style x/y from a shared cursor spring)
 *     └ float layer   (framer-motion keyframe drift/rotate/scale loop)
 *         └ blur layer (STATIC `filter: blur()` on the SVG)
 *
 * The blur never changes, so the browser rasterizes each shape once and the
 * compositor then just moves that cached texture around — animating a
 * `filter` directly, or animating transforms on the same element that owns
 * the filter, would force a full re-rasterization of a very large blurred
 * surface every frame. Splitting the layers is what keeps this smooth.
 *
 * The whole thing is `absolute inset-0` inside a clipping parent and only
 * ever uses transforms, so it can never shift layout.
 */

interface Shape {
  id: string;
  /** Which letter of "Forsa" the geometry is drawn from — documentation, and the a11y-free title. */
  letter: string;
  size: number;
  top: string;
  left: string;
  blur: number;
  opacity: number;
  depth: number; // cursor-parallax strength in px
  duration: number;
  drift: { x: number[]; y: number[]; rotate: number[]; scale: number[] };
  path: ReactNode;
}

const STROKE = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const SHAPES: Shape[] = [
  {
    // O — the perfect circle.
    id: "letter-o",
    letter: "O",
    size: 620,
    top: "-14%",
    left: "-10%",
    blur: 64,
    opacity: 0.1,
    depth: 22,
    duration: 34,
    drift: { x: [0, 40, -20, 0], y: [0, -30, 20, 0], rotate: [0, 12, -6, 0], scale: [1, 1.06, 0.97, 1] },
    path: <circle cx="100" cy="100" r="72" strokeWidth="16" {...STROKE} />,
  },
  {
    // S — the sweeping double curve.
    id: "letter-s",
    letter: "S",
    size: 560,
    top: "6%",
    left: "62%",
    blur: 58,
    opacity: 0.09,
    depth: 30,
    duration: 42,
    drift: { x: [0, -46, 24, 0], y: [0, 34, -18, 0], rotate: [0, -14, 8, 0], scale: [1, 0.94, 1.05, 1] },
    path: (
      <path
        d="M148 46C104 26 64 44 64 72c0 34 74 22 74 58 0 28-42 44-86 24"
        strokeWidth="16"
        {...STROKE}
      />
    ),
  },
  {
    // R — the bowl and the kicking leg.
    id: "letter-r",
    letter: "R",
    size: 520,
    top: "46%",
    left: "-6%",
    blur: 56,
    opacity: 0.08,
    depth: 26,
    duration: 38,
    drift: { x: [0, 34, -26, 0], y: [0, -26, 30, 0], rotate: [0, 9, -11, 0], scale: [1, 1.04, 0.96, 1] },
    path: (
      <path
        d="M62 30v140M62 30h46a38 38 0 0 1 0 76H62m48 0 52 64"
        strokeWidth="15"
        {...STROKE}
      />
    ),
  },
  {
    // A — the apex, where two diagonals intersect the crossbar.
    id: "letter-a",
    letter: "A",
    size: 600,
    top: "54%",
    left: "58%",
    blur: 62,
    opacity: 0.09,
    depth: 18,
    duration: 46,
    drift: { x: [0, -30, 18, 0], y: [0, 26, -22, 0], rotate: [0, -8, 13, 0], scale: [1, 1.05, 0.98, 1] },
    path: <path d="M40 172 100 34l60 138M64 122h72" strokeWidth="15" {...STROKE} />,
  },
  {
    // F — the sharp perpendicular intersections.
    id: "letter-f",
    letter: "F",
    size: 460,
    top: "20%",
    left: "28%",
    blur: 70,
    opacity: 0.07,
    depth: 12,
    duration: 52,
    drift: { x: [0, 22, -30, 0], y: [0, -34, 16, 0], rotate: [0, 6, -9, 0], scale: [1, 0.96, 1.06, 1] },
    path: <path d="M70 32v148M70 32h84M70 104h62" strokeWidth="15" {...STROKE} />,
  },
  {
    // A second, smaller O — depth, and the word has two round counters.
    id: "letter-o-small",
    letter: "o",
    size: 320,
    top: "72%",
    left: "24%",
    blur: 48,
    opacity: 0.08,
    depth: 34,
    duration: 30,
    drift: { x: [0, -28, 36, 0], y: [0, 22, -28, 0], rotate: [0, 16, -10, 0], scale: [1, 1.08, 0.95, 1] },
    path: <circle cx="100" cy="100" r="64" strokeWidth="20" {...STROKE} />,
  },
];

export default function GeometricBackground() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 45, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 45, damping: 22 });

  useEffect(() => {
    // Reduced motion: the pointer values simply never leave 0, so every
    // parallax transform below stays inert — no need to conditionally skip
    // the hooks that consume them.
    if (reduceMotion) return;
    const node = containerRef.current;
    if (!node) return;

    function handlePointerMove(event: PointerEvent) {
      const rect = node!.getBoundingClientRect();
      pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
      pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [reduceMotion, pointerX, pointerY]);

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Aurora wash: the cinematic base light the shapes float in. */}
      <div className="absolute left-1/2 top-[-18%] h-[560px] w-[820px] -translate-x-1/2 animate-glow-pulse rounded-full bg-teal/10 blur-[130px] dark:bg-teal/20" />
      <div className="absolute bottom-[-24%] right-[-6%] h-[460px] w-[620px] rounded-full bg-blue/10 blur-[140px] dark:bg-emerald/10" />

      {SHAPES.map((shape) => (
        <GeometricShape key={shape.id} shape={shape} springX={springX} springY={springY} reduceMotion={!!reduceMotion} />
      ))}

      {/* Vignette — pulls the eye to the centre and keeps the shapes from
          competing with the copy at the edges of the frame. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,8,15,0.55)_100%)] opacity-0 dark:opacity-100" />
    </div>
  );
}

function GeometricShape({
  shape,
  springX,
  springY,
  reduceMotion,
}: {
  shape: Shape;
  springX: MotionValue<number>;
  springY: MotionValue<number>;
  reduceMotion: boolean;
}) {
  // Scales the shared cursor springs by this shape's own depth, so nearer
  // shapes travel further — parallax depth without a spring per shape.
  const x = useTransform(springX, (value) => value * shape.depth);
  const y = useTransform(springY, (value) => value * shape.depth);

  return (
    <motion.div
      className="absolute"
      style={{ top: shape.top, left: shape.left, width: shape.size, height: shape.size, x, y }}
    >
      <motion.div
        className="h-full w-full"
        animate={
          reduceMotion
            ? undefined
            : { x: shape.drift.x, y: shape.drift.y, rotate: shape.drift.rotate, scale: shape.drift.scale }
        }
        transition={{ duration: shape.duration, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
      >
        {/* Static blur: rasterized once, then only transformed. */}
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full text-teal dark:text-teal-glow"
          style={{ filter: `blur(${shape.blur}px)`, opacity: shape.opacity }}
        >
          <g stroke="currentColor">{shape.path}</g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
