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
      <div className="rounded-card border border-line bg-white p-6 text-center text-sm text-muted shadow-sm">
        Your conversation will appear here once the interview begins.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-72 space-y-3 overflow-y-auto rounded-card border border-line bg-white p-5 shadow-sm"
    >
      {turns.map((turn, index) => (
        <div key={index} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={
              turn.role === "user"
                ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-navy px-4 py-3 text-[14.5px] text-white"
                : "max-w-[85%] rounded-2xl rounded-tl-sm bg-blue/10 px-4 py-3 text-[14.5px] text-navy"
            }
          >
            {turn.text}
          </div>
        </div>
      ))}
    </div>
  );
}
