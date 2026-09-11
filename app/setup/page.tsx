"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sounds";
import AppHeader from "@/components/AppHeader";
import CvUpload from "@/components/CvUpload";
import GeometricBackground from "@/components/GeometricBackground";
import RoleSelector from "@/components/RoleSelector";
import { saveInterviewSetup } from "@/lib/interview-session";
import { EXPERIENCE_LEVELS, ROLE_CATEGORIES } from "@/lib/roles";

const DEFAULT_ROLE = ROLE_CATEGORIES[0].roles[0].label;
const DEFAULT_LEVEL = EXPERIENCE_LEVELS[1];

const GLASS_CARD =
  "rounded-[22px] border border-line bg-white/70 shadow-[0_30px_80px_-30px_rgba(11,46,74,0.35),inset_0_1px_0_0_rgba(255,255,255,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

export default function SetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>(DEFAULT_ROLE);
  const [level, setLevel] = useState<string>(DEFAULT_LEVEL);
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  function startInterview() {
    playSound("click");
    saveInterviewSetup({
      role,
      experienceLevel: level,
      cvText: cvText ?? undefined,
      cvFileName: cvFileName ?? undefined,
    });
    setIsExiting(true);
  }

  return (
    <motion.div
      animate={isExiting ? { opacity: 0, scale: 0.98, filter: "blur(6px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (isExiting) router.push("/interview");
      }}
      className="relative min-h-screen overflow-hidden"
    >
      <GeometricBackground />
      <AppHeader
        right={
          <Link
            href="/"
            className="text-xs font-semibold text-muted transition-colors hover:text-navy dark:text-dark-muted dark:hover:text-white"
          >
            ← Back
          </Link>
        }
      />

      <main className="relative mx-auto flex max-w-xl flex-col px-6 pb-24 pt-14 sm:pt-20">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-dark dark:text-teal-glow">
            Step 1 of 2
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl dark:text-white">
          Configure your session
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted dark:text-dark-muted">
          Choose the role you&apos;re preparing for and how senior it is. Add your CV and Ava will
          open with a question about your real experience.
        </p>

        <section className={`mt-8 ${GLASS_CARD} p-6`}>
          <RoleSelector role={role} onRoleChange={setRole} level={level} onLevelChange={setLevel} />

          <div className="mt-6 border-t border-line pt-6 dark:border-white/10">
            <CvUpload
              onChange={(text, fileName) => {
                setCvText(text);
                setCvFileName(fileName);
              }}
            />
          </div>

          <motion.button
            type="button"
            onClick={startInterview}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mt-6 w-full rounded-xl bg-blue px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(36,112,179,0.65)] transition-colors duration-200 hover:bg-blue-dark dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:text-obsidian dark:shadow-[0_0_30px_-6px_rgba(47,224,182,0.6)] dark:hover:from-teal-glow dark:hover:to-teal-glow"
          >
            Enter the interview room
          </motion.button>

          <p className="mt-3 text-center text-[11px] text-muted dark:text-dark-muted">
            You&apos;ll be asked for microphone access on the next screen.
          </p>
        </section>
      </main>
    </motion.div>
  );
}
