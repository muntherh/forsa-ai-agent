"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * The one piece of chrome shared by every route, so the five pages read as
 * one product rather than five separate screens.
 */
export default function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="relative z-20 border-b border-line bg-bg/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-obsidian/60">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold text-navy dark:text-white">
          <Image
            src="/logo.png"
            alt="Forsa AI"
            width={32}
            height={32}
            className="rounded-full border border-line shadow-sm dark:border-white/15"
          />
          Forsa AI
        </Link>
        <div className="flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
