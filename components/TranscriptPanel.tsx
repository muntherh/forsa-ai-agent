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
      <div className="rounded-[22px] border border-line bg-white/70 p-6 text-center text-sm text-muted backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:text-dark-muted">
        Your conversation will appear here once the interview begins.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="menu-scroll max-h-72 space-y-3 overflow-y-auto rounded-[22px] border border-line bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]"
    >
      {turns.map((turn, index) => (
        <div key={index} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={
              turn.role === "user"
                ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-navy px-4 py-3 text-[14.5px] text-white dark:bg-gradient-to-br dark:from-teal dark:to-emerald dark:text-obsidian"
                : "max-w-[85%] rounded-2xl rounded-tl-sm bg-blue/10 px-4 py-3 text-[14.5px] text-navy dark:bg-white/[0.06] dark:text-dark-text"
            }
          >
            {turn.text}
          </div>
        </div>
      ))}
    </div>
  );
}
