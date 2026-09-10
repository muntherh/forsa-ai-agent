"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import GeometricBackground from "@/components/GeometricBackground";
import Scorecard from "@/components/Scorecard";
import { loadScorecard, type StoredScorecard } from "@/lib/interview-session";

export default function ResultsPage() {
  const router = useRouter();
  // `undefined` = still reading sessionStorage on mount, `null` = nothing to
  // show. Distinguishing them keeps the page from flashing an empty state
  // for one frame before the real scorecard arrives.
  const [stored, setStored] = useState<StoredScorecard | null | undefined>(undefined);

  useEffect(() => {
    const result = loadScorecard();
    if (!result) {
      router.replace("/");
      return;
    }
    setStored(result);
  }, [router]);

  if (stored === undefined || stored === null) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AppHeader />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GeometricBackground />
      <AppHeader
        right={
          <Link
            href="/setup"
            className="text-xs font-semibold text-muted transition-colors hover:text-navy dark:text-dark-muted dark:hover:text-white"
          >
            New interview
          </Link>
        }
      />

      <main className="relative mx-auto flex max-w-3xl flex-col px-6 pb-24 pt-12 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-dark dark:text-teal-glow">
              Results
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl dark:text-white">
              Your performance
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {stored.cvFileName && (
              <span className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-medium text-teal-dark dark:border-teal-glow/25 dark:bg-teal-glow/10 dark:text-teal-glow">
                CV attached
              </span>
            )}
            <span className="rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-muted">
              {stored.role} · {stored.experienceLevel}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          className="mt-8"
        >
          <Scorecard data={stored.scorecard} role={stored.role} experienceLevel={stored.experienceLevel} />
        </motion.div>
      </main>
    </div>
  );
}
