"use client";

import { useEffect, useRef } from "react";
import type { TranscriptTurn } from "@/lib/types";

export default function TranscriptPanel({ turns }: { turns: TranscriptTurn[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  if (turns.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center text-sm text-muted">
        Your conversation will appear here once the interview begins.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto rounded-card border border-line bg-surface p-5">
      {turns.map((turn, index) => (
        <div key={index} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              turn.role === "user" ? "bg-indigo/20 text-white" : "bg-surface-raised text-muted"
            }`}
          >
            {turn.text}
          </div>
        </div>
      ))}
    </div>
  );
}
