"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useTransform, type MotionValue } from "framer-motion";
import { alpha, mix, seededRandom, useSafeReducedMotion } from "@/lib/motion";
import type { CallStatus } from "@/lib/types";

// Forsa's own brand tokens (tailwind.config.ts: blue #2470B3, teal
// #1FA98A) — the same pair used by the waveform in Forsa's production
// voice-interview UI.
const BLUE = "#2470B3";
const TEAL = "#1FA98A";
const SIZE = 176;
const BAR_COUNT = 32;

function useWaveformBars() {
  return useMemo(() => {
    const random = seededRandom(0x5f3a2b);
    return Array.from({ length: BAR_COUNT }, (_, index) => {
      const position = index / (BAR_COUNT - 1);
      const envelope = Math.pow(Math.sin(position * Math.PI), 0.7);
      const fromCentre = Math.abs(position - 0.5) * 2;
      const peak = (raw: number) => Math.max(0.08, Math.min(1, raw * envelope));

      return {
        colour: mix(BLUE, TEAL, fromCentre),
        glow: mix(BLUE, TEAL, fromCentre, 0.5),
        keyframes: [
          peak(0.28 + random() * 0.3),
          peak(0.62 + random() * 0.38),
          peak(0.22 + random() * 0.34),
          peak(0.74 + random() * 0.26),
          peak(0.34 + random() * 0.3),
        ],
        duration: 1.05 + random() * 0.8,
        delay: random() * 0.5,
        rest: peak(0.2 + random() * 0.16),
        envelope,
        sensitivity: 0.7 + random() * 0.6,
      };
    });
  }, []);
}

function LiveBar({
  volume,
  envelope,
  sensitivity,
  restScale,
  reduced,
  colour,
  glow,
}: {
  volume: MotionValue<number>;
  envelope: number;
  sensitivity: number;
  restScale: number;
  reduced: boolean;
  colour: string;
  glow: string;
}) {
  const scaleY = useTransform(volume, (v) => (reduced ? restScale : Math.min(1, 0.1 + v * sensitivity * envelope)));
  return (
    <motion.span
      aria-hidden
      className="block h-full flex-1 rounded-full"
      style={{ maxWidth: 6, backgroundColor: colour, boxShadow: `0 0 10px ${glow}`, scaleY }}
    />
  );
}

function SpeakingBars({ reduced, volume }: { reduced: boolean; volume?: MotionValue<number> }) {
  const bars = useWaveformBars();
  return (
    <div className="flex h-full w-full items-center justify-center gap-1 px-4">
      {bars.map((bar, index) =>
        volume ? (
          <LiveBar
            key={index}
            volume={volume}
            envelope={bar.envelope}
            sensitivity={bar.sensitivity}
            restScale={bar.rest}
            reduced={reduced}
            colour={bar.colour}
            glow={bar.glow}
          />
        ) : (
          <motion.span
            key={index}
            aria-hidden
            className="block h-full flex-1 rounded-full"
            style={{ maxWidth: 6, backgroundColor: bar.colour, boxShadow: `0 0 10px ${bar.glow}` }}
            initial={{ scaleY: bar.rest }}
            animate={reduced ? { scaleY: bar.rest } : { scaleY: bar.keyframes }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: bar.duration, delay: bar.delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
            }
          />
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
