"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import CinematicText from "@/components/CinematicText";
import CvUpload from "@/components/CvUpload";
import GeometricBackground from "@/components/GeometricBackground";
import RoleSelector from "@/components/RoleSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { clearInterviewSetup, saveInterviewSetup } from "@/lib/interview-session";
import { EXPERIENCE_LEVELS, ROLE_CATEGORIES } from "@/lib/roles";

const DEFAULT_ROLE = ROLE_CATEGORIES[0].roles[0].label;
const DEFAULT_LEVEL = EXPERIENCE_LEVELS[1];

const SPRING = { type: "spring", stiffness: 300, damping: 20 } as const;

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

/** The glass command-center surface: translucent fill, blur, 1px inner glow. */
const GLASS_CARD =
  "rounded-[22px] border border-line bg-white/70 shadow-[0_30px_80px_-30px_rgba(11,46,74,0.35),inset_0_1px_0_0_rgba(255,255,255,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

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
      animate={isExiting ? { opacity: 0, scale: 0.98, filter: "blur(6px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (isExiting) router.push("/interview");
      }}
      className="relative min-h-screen overflow-hidden"
    >
      {/* Full-bleed: the ambient layer lives here rather than inside <main>,
          which is width-constrained — clipping the glow to that column left a
          visible vertical seam down the page. */}
      <GeometricBackground />

      <header className="relative z-10 border-b border-line bg-bg/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-obsidian/60">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 font-display text-lg font-extrabold text-navy dark:text-white">
            <Image
              src="/logo.png"
              alt="Forsa"
              width={32}
              height={32}
              className="rounded-full border border-line shadow-sm dark:border-white/15"
            />
            Forsa AI
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-line bg-white/70 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted backdrop-blur-xl sm:inline-block dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-muted">
              English Edition
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 sm:pt-28">
        <BrandMark />

        <CinematicText
          as="h2"
          text={"Practice your next interview,\nout loud."}
          delay={0.55}
          stagger={0.016}
          className="mt-12 text-center font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-navy sm:text-5xl dark:text-white"
          letterClassName="dark:bg-gradient-to-b dark:from-white dark:via-white dark:to-slate-400 dark:bg-clip-text dark:text-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.25 }}
          className="mt-6 max-w-xl text-center text-[15px] leading-relaxed text-muted dark:text-dark-muted"
        >
          An autonomous, real-time voice interviewer from Forsa. Talk through technical and
          behavioral questions with an AI interviewer, then get an instant, structured performance
          scorecard.
        </motion.p>

        <div className="mt-14 grid w-full gap-3.5 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.4 + i * 0.09 }}
              className={`${GLASS_CARD} p-5`}
            >
              <h3 className="font-display text-[13px] font-bold text-navy dark:text-white">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted dark:text-dark-muted">{feature.body}</p>
            </motion.div>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.7 }}
          className={`mt-14 w-full max-w-md ${GLASS_CARD} p-6`}
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_2px_rgba(31,169,138,0.6)] dark:bg-teal-glow dark:shadow-[0_0_10px_2px_rgba(47,224,182,0.7)]" />
            <h2 className="font-display text-[13px] font-bold tracking-tight text-navy dark:text-white">
              Set up your mock interview
            </h2>
          </div>

          <div className="mt-5">
            <RoleSelector role={role} onRoleChange={setRole} level={level} onLevelChange={setLevel} />
          </div>

          <div className="mt-5">
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
            whileTap={{ scale: 0.985, y: 0 }}
            transition={SPRING}
            className="mt-6 w-full rounded-xl bg-blue px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(36,112,179,0.65)] transition-colors duration-200 hover:bg-blue-dark dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:text-obsidian dark:shadow-[0_0_30px_-6px_rgba(47,224,182,0.6)] dark:hover:from-teal-glow dark:hover:to-teal-glow"
          >
            Start Mock Interview
          </motion.button>

          <p className="mt-3 text-center text-[11px] text-muted dark:text-dark-muted">
            You&apos;ll be asked for microphone access. No account or sign-up required.
          </p>
        </motion.section>
      </main>
    </motion.div>
  );
}
