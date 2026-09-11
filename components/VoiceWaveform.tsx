"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { alpha, mix, seededRandom, useSafeReducedMotion } from "@/lib/motion";
import type { CallStatus } from "@/lib/types";

// Forsa's own brand tokens (tailwind.config.ts: blue #2470B3, teal
// #1FA98A) — the same pair used by the waveform in Forsa's production
// voice-interview UI.
const BLUE = "#2470B3";
const TEAL = "#1FA98A";
// Brighter end of the same ramp (tailwind.config.ts `emerald.glow`), used for
// the centre of the bar gradient and the glow.
const EMERALD = "#34E7BE";
const SIZE = 176;
// Seven bars: enough for a sense of spectrum, few enough that each one is a
// chunky, readable element rather than a hairline.
const BAR_COUNT = 7;

/**
 * Per-bar response curve. `envelope` tapers the outer bars so the group reads
 * as one waveform rather than a flat row; `sensitivity` and `lag` are jittered
 * per bar so they don't all snap in unison (which looks like a single block
 * scaling) — the illusion of frequency bands from a single amplitude value.
 */
function useWaveformBars() {
  return useMemo(() => {
    const random = seededRandom(0x5f3a2b);
    return Array.from({ length: BAR_COUNT }, (_, index) => {
      const position = index / (BAR_COUNT - 1);
      const fromCentre = Math.abs(position - 0.5) * 2;
      const envelope = 0.55 + 0.45 * Math.pow(Math.sin(position * Math.PI), 0.8);

      return {
        // Teal at the edges through emerald at the centre, so the brightest
        // point of the gradient sits where the bars are tallest.
        colour: mix(TEAL, EMERALD, 1 - fromCentre),
        glow: mix(TEAL, EMERALD, 1 - fromCentre),
        envelope,
        sensitivity: 2.1 + random() * 1.5,
        // Stiffness jitter: each bar settles on a slightly different spring so
        // the row ripples instead of moving as one.
        stiffness: 260 + random() * 180,
        rest: 0.12 + random() * 0.06,
        idleKeyframes: [
          0.18 + random() * 0.16,
          0.5 + random() * 0.34,
          0.24 + random() * 0.2,
          0.62 + random() * 0.3,
        ],
        idleDuration: 1.1 + random() * 0.7,
        idleDelay: random() * 0.5,
      };
    });
  }, []);
}

type Bar = ReturnType<typeof useWaveformBars>[number];

function LiveBar({ volume, bar, reduced }: { volume: MotionValue<number>; bar: Bar; reduced: boolean }) {
  // Raw amplitude -> this bar's target height, then a spring so the bar
  // glides to each new level instead of snapping on every volume event
  // (Vapi emits them far faster than the eye wants to track).
  const target = useTransform(volume, (v) =>
    reduced ? bar.rest : Math.max(bar.rest, Math.min(1, v * bar.sensitivity * bar.envelope))
  );
  const scaleY = useSpring(target, { stiffness: bar.stiffness, damping: 26, mass: 0.35 });
  // Quiet bars dim as well as shrink — height alone reads as mechanical.
  const opacity = useTransform(scaleY, [bar.rest, 1], [0.45, 1]);

  return (
    <motion.span
      aria-hidden
      className="block w-2.5 rounded-full sm:w-3"
      style={{
        height: "100%",
        originY: 0.5,
        scaleY,
        opacity,
        background: `linear-gradient(180deg, ${bar.colour} 0%, ${mix(bar.colour, EMERALD, 0.6)} 100%)`,
        filter: `drop-shadow(0 0 8px ${alpha(bar.glow, 0.85)}) drop-shadow(0 0 18px ${alpha(bar.glow, 0.4)})`,
      }}
    />
  );
}

function IdleBar({ bar, reduced }: { bar: Bar; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="block w-2.5 rounded-full sm:w-3"
      style={{
        height: "100%",
        originY: 0.5,
        background: `linear-gradient(180deg, ${bar.colour} 0%, ${mix(bar.colour, EMERALD, 0.6)} 100%)`,
        filter: `drop-shadow(0 0 8px ${alpha(bar.glow, 0.7)}) drop-shadow(0 0 18px ${alpha(bar.glow, 0.3)})`,
      }}
      initial={{ scaleY: bar.rest }}
      animate={reduced ? { scaleY: bar.rest } : { scaleY: bar.idleKeyframes }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              duration: bar.idleDuration,
              delay: bar.idleDelay,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }
      }
    />
  );
}

function SpeakingBars({ reduced, volume }: { reduced: boolean; volume?: MotionValue<number> }) {
  const bars = useWaveformBars();
  return (
    <div className="flex h-20 w-full items-center justify-center gap-2.5 px-4 sm:gap-3">
      {bars.map((bar, index) =>
        volume ? (
          <LiveBar key={index} volume={volume} bar={bar} reduced={reduced} />
        ) : (
          <IdleBar key={index} bar={bar} reduced={reduced} />
        )
      )}
    </div>
  );
}

function ListeningPulse({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      {!reduced &&
        [0, 1, 2].map((ring) => (
          <motion.span
            key={ring}
            aria-hidden
            className="absolute rounded-full border"
            style={{ width: 76, height: 76, borderColor: alpha(TEAL, 0.5) }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.7, 2.6], opacity: [0.55, 0] }}
            transition={{ duration: 3, delay: ring * 1, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      <motion.span
        aria-hidden
        className="absolute rounded-full blur-2xl"
        style={{
          width: 120,
          height: 120,
          background: `radial-gradient(circle, ${alpha(TEAL, 0.5)} 0%, transparent 70%)`,
        }}
        animate={reduced ? { opacity: 0.6, scale: 1 } : { opacity: [0.45, 0.85, 0.45], scale: [0.94, 1.08, 0.94] }}
        transition={reduced ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="relative rounded-full"
        style={{
          width: 18,
          height: 18,
          backgroundColor: TEAL,
          boxShadow: `0 0 20px ${alpha(TEAL, 0.9)}, 0 0 50px ${alpha(TEAL, 0.4)}`,
        }}
        animate={reduced ? { scale: 1 } : { scale: [1, 1.15, 1] }}
        transition={reduced ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function IdlePulse({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <motion.span
        aria-hidden
        className="rounded-full"
        style={{
          width: 64,
          height: 64,
          background: `radial-gradient(circle at 35% 30%, ${alpha(BLUE, 0.9)}, ${alpha(TEAL, 0.35)} 70%, transparent 100%)`,
          boxShadow: `0 0 40px ${alpha(BLUE, 0.35)}`,
        }}
        animate={reduced ? { scale: 1 } : { scale: [1, 1.05, 1] }}
        transition={reduced ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function ConnectingSpinner() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <motion.span
        aria-hidden
        className="absolute rounded-full border-2 border-transparent"
        style={{ width: 72, height: 72, borderTopColor: TEAL, borderRightColor: BLUE }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      <span className="rounded-full" style={{ width: 14, height: 14, backgroundColor: BLUE }} />
    </div>
  );
}

const CAPTION: Record<CallStatus, string> = {
  idle: "Ready to begin",
  connecting: "Connecting...",
  speaking: "Ava is speaking",
  listening: "Listening to you",
  ended: "Interview ended",
  error: "Connection error",
};

export default function VoiceWaveform({ status, volume }: { status: CallStatus; volume?: MotionValue<number> }) {
  const reduced = useSafeReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-line bg-white/70 py-8 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
      <div className="flex items-center justify-center" style={{ height: SIZE, width: "100%" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            className="flex w-full items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 20 }}
          >
            {status === "speaking" && <SpeakingBars reduced={reduced} volume={volume} />}
            {status === "listening" && <ListeningPulse reduced={reduced} />}
            {status === "connecting" && <ConnectingSpinner />}
            {(status === "idle" || status === "ended" || status === "error") && <IdlePulse reduced={reduced} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.3em] text-muted dark:text-dark-muted" aria-live="polite">
        {CAPTION[status]}
      </p>
    </div>
  );
}
