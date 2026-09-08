"use client";

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
      <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className="text-xs font-medium text-muted">{STATUS_LABEL[status]}</span>
      </div>

      {!isActive ? (
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-blue px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(36,112,179,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0 active:scale-[0.98]"
        >
          Start Interview
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            className={`rounded-xl border px-6 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
              muted
                ? "border-amber/40 bg-amber/10 text-amber-dark hover:bg-amber/15"
                : "border-line bg-white text-navy hover:-translate-y-0.5 hover:border-blue hover:text-blue"
            }`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0 active:scale-[0.98]"
          >
            End Call
          </button>
        </div>
      )}
    </div>
  );
}
