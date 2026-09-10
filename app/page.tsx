"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AmbientBackground from "@/components/AmbientBackground";
import BrandMark from "@/components/BrandMark";
import CvUpload from "@/components/CvUpload";
import RoleSelector from "@/components/RoleSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { clearInterviewSetup, saveInterviewSetup } from "@/lib/interview-session";
import { EXPERIENCE_LEVELS, ROLE_CATEGORIES } from "@/lib/roles";

const DEFAULT_ROLE = ROLE_CATEGORIES[0].roles[0].label;
const DEFAULT_LEVEL = EXPERIENCE_LEVELS[1];

const FEATURES = [
  {
    title: "Real-time voice, not a chatbot",
    body: "Speak naturally over WebRTC — Ava listens, thinks, and responds in real time, just like a real call.",
  },
  {
    title: "Grounded in your own CV",
    body: "Upload your CV and Ava opens with a question about a real project or role from it — no CV needed to start.",
  },
  {
    title: "Instant scorecard + action plan",
    body: "The moment the call ends, Claude scores your performance and builds a downloadable PDF action plan.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>(DEFAULT_ROLE);
  const [level, setLevel] = useState<string>(DEFAULT_LEVEL);
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  function startInterview() {
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
      animate={isExiting ? { opacity: 0, scale: 0.98 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (isExiting) router.push("/interview");
      }}
    >
      <header className="relative z-10 border-b border-line bg-bg/90 backdrop-blur-md dark:border-dark-border dark:bg-obsidian/80">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 font-display text-xl font-extrabold text-navy dark:text-dark-text">
            <Image src="/logo.png" alt="Forsa" width={34} height={34} className="rounded-full border border-line shadow-sm dark:border-dark-border" />
            Forsa AI
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted dark:border-dark-border dark:bg-dark-surface dark:text-dark-muted">
              English Edition
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-3xl flex-col items-center overflow-hidden px-6 py-16 sm:py-24">
        <AmbientBackground />

        <BrandMark />

        <h1 className="mt-8 text-center font-display text-4xl font-extrabold tracking-tight text-navy sm:text-5xl dark:text-dark-text">
          Practice your next interview,
          <br />
          out loud.
        </h1>

        <p className="mt-5 max-w-xl text-center text-base text-muted dark:text-dark-muted">
          An autonomous, real-time voice interviewer from Forsa. Talk through technical and
          behavioral questions with an AI interviewer, then get an instant, structured performance
          scorecard.
        </p>

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.15 + i * 0.08 }}
              className="rounded-card border border-line bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-surface"
            >
              <h3 className="font-display text-sm font-bold text-navy dark:text-dark-text">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted dark:text-dark-muted">{feature.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 w-full max-w-md rounded-card border border-line bg-white p-6 shadow-[0_30px_60px_-20px_rgba(11,46,74,0.25)] dark:border-dark-border dark:bg-dark-surface-raised dark:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
          <h2 className="font-display text-sm font-bold text-navy dark:text-dark-text">Set up your mock interview</h2>

          <div className="mt-5">
            <RoleSelector role={role} onRoleChange={setRole} level={level} onLevelChange={setLevel} />
          </div>

          <div className="mt-4">
            <CvUpload
              onChange={(text, fileName) => {
                setCvText(text);
                setCvFileName(fileName);
                if (!text) clearInterviewSetup();
              }}
            />
          </div>

          <motion.button
            type="button"
            onClick={startInterview}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98, y: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="mt-6 w-full rounded-xl bg-blue px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(36,112,179,0.55)] transition-colors duration-200 hover:bg-blue-dark dark:bg-indigo dark:shadow-[0_8px_24px_-6px_rgba(99,102,241,0.55)] dark:hover:bg-indigo-glow"
          >
            Start Mock Interview
          </motion.button>

          <p className="mt-3 text-center text-xs text-muted dark:text-dark-muted">
            You&apos;ll be asked for microphone access. No account or sign-up required.
          </p>
        </div>
      </main>
    </motion.div>
  );
}
