"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { playSound } from "@/lib/sounds";
import type { CallStatus } from "@/lib/types";

const STATUS_DOT: Record<CallStatus, string> = {
  idle: "bg-muted",
  connecting: "bg-amber animate-pulse",
  speaking: "bg-teal animate-pulse",
  listening: "bg-blue animate-pulse",
  ended: "bg-muted",
  error: "bg-red-600",
};

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: "Not connected",
  connecting: "Connecting",
  speaking: "Live — Ava speaking",
  listening: "Live — listening to you",
  ended: "Call ended",
  error: "Connection error",
};

const SPRING = { type: "spring", stiffness: 300, damping: 20 } as const;

interface CallControlsProps {
  status: CallStatus;
  muted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  /** Ends the session deliberately and hands off for scoring. */
  onFinish: () => void;
}

export default function CallControls({ status, muted, onStart, onToggleMute, onFinish }: CallControlsProps) {
  const isActive = status === "connecting" || status === "speaking" || status === "listening";
  const [confirmingFinish, setConfirmingFinish] = useState(false);

  // Never leave a confirmation hanging over a session that has already ended.
  useEffect(() => {
    if (!isActive) setConfirmingFinish(false);
  }, [isActive]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className="text-xs font-medium text-muted dark:text-dark-muted">{STATUS_LABEL[status]}</span>
      </div>

      {!isActive ? (
        <motion.button
          type="button"
          onClick={() => {
            playSound("click");
            onStart();
          }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.985, y: 0 }}
          transition={SPRING}
          className="rounded-xl bg-blue px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(36,112,179,0.55)] transition-colors duration-200 hover:bg-blue-dark dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:text-obsidian dark:shadow-[0_0_30px_-6px_rgba(47,224,182,0.6)]"
        >
          Start Interview
        </motion.button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* Mute is the primary control during a live call: it is the one the
              candidate actually reaches for, and it is non-destructive. */}
          <motion.button
            type="button"
            onClick={() => {
              playSound("tick");
              onToggleMute();
            }}
            aria-pressed={muted}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985, y: 0 }}
            transition={SPRING}
            className={`flex items-center gap-2.5 rounded-xl border px-7 py-3 text-sm font-bold transition-colors duration-200 ${
              muted
                ? "border-amber/45 bg-amber/10 text-amber-dark shadow-[0_0_24px_-8px_rgba(217,155,34,0.55)] dark:text-amber"
                : "border-line bg-white text-navy hover:border-blue hover:text-blue dark:border-white/12 dark:bg-white/[0.04] dark:text-dark-text dark:hover:border-teal-glow/60 dark:hover:text-teal-glow"
            }`}
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${muted ? "bg-amber animate-pulse" : "bg-teal dark:bg-teal-glow"}`}
            />
            {muted ? "Muted — tap to resume" : "Mute"}
          </motion.button>

          {/* The reassurance the mute state earns: it explains that pausing is
              safe, which is the entire psychological point of Smart Mute. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {muted && (
              <motion.p
                key="mute-hint"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={SPRING}
                className="max-w-xs text-center text-[11px] leading-relaxed text-muted dark:text-dark-muted"
              >
                Ava knows you&apos;ve paused and will wait. Your question is still open — nothing
                is being scored against you.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Finishing is deliberately quiet and two-step. There is no red
              button: ending the interview is a normal conclusion that produces
              a scorecard, not an emergency exit. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {confirmingFinish ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={SPRING}
                className="flex flex-col items-center gap-2"
              >
                <p className="text-[11px] text-muted dark:text-dark-muted">
                  Finish here and generate your scorecard?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      onFinish();
                    }}
                    className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-xs font-bold text-teal-dark transition-colors hover:bg-teal/20 dark:border-teal-glow/35 dark:text-teal-glow"
                  >
                    Yes, finish
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingFinish(false)}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-muted transition-colors hover:text-navy dark:text-dark-muted dark:hover:text-white"
                  >
                    Keep going
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="finish"
                type="button"
                onClick={() => setConfirmingFinish(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                className="text-[11px] font-semibold text-muted underline-offset-4 transition-colors hover:text-navy hover:underline dark:text-dark-muted dark:hover:text-white"
              >
                Finish interview early
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
