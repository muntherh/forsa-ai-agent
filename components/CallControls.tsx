"use client";

import type { CallStatus } from "@/lib/types";

const STATUS_DOT: Record<CallStatus, string> = {
  idle: "bg-muted",
  connecting: "bg-warn animate-pulse",
  speaking: "bg-cyan animate-pulse",
  listening: "bg-good animate-pulse",
  ended: "bg-muted",
  error: "bg-bad",
};

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: "Not connected",
  connecting: "Connecting",
  speaking: "Live — Ava speaking",
  listening: "Live — listening to you",
  ended: "Call ended",
  error: "Connection error",
};

interface CallControlsProps {
  status: CallStatus;
  muted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onEnd: () => void;
}

export default function CallControls({ status, muted, onStart, onToggleMute, onEnd }: CallControlsProps) {
  const isActive = status === "connecting" || status === "speaking" || status === "listening";

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className="text-xs font-medium text-muted">{STATUS_LABEL[status]}</span>
      </div>

      {!isActive ? (
        <button
          type="button"
          onClick={onStart}
          className="rounded-full bg-indigo px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo/30 transition hover:bg-indigo-dark active:scale-[0.98]"
        >
          Start Interview
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            className={`rounded-full border px-6 py-3 text-sm font-medium transition active:scale-[0.98] ${
              muted
                ? "border-warn/40 bg-warn/10 text-warn hover:bg-warn/15"
                : "border-line bg-surface-raised text-white hover:bg-surface"
            }`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="rounded-full bg-bad px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
          >
            End Call
          </button>
        </div>
      )}
    </div>
  );
}
