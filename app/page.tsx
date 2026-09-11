"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sounds";
import AppHeader from "@/components/AppHeader";
import BrandMark from "@/components/BrandMark";
import CinematicText from "@/components/CinematicText";
import GeometricBackground from "@/components/GeometricBackground";

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

const GLASS_CARD =
  "rounded-[22px] border border-line bg-white/70 shadow-[0_30px_80px_-30px_rgba(11,46,74,0.35),inset_0_1px_0_0_rgba(255,255,255,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

export default function LandingPage() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  return (
    <motion.div
      animate={isExiting ? { opacity: 0, scale: 0.98, filter: "blur(6px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (isExiting) router.push("/setup");
      }}
      className="relative min-h-screen overflow-hidden"
    >
      <GeometricBackground />
      <AppHeader
        right={
          <span className="hidden rounded-full border border-line bg-white/70 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted backdrop-blur-xl sm:inline-block dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-muted">
            English Edition
          </span>
        }
      />

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-28 pt-20 sm:pt-28">
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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.45 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <motion.button
            type="button"
            onClick={() => {
              playSound("click");
              setIsExiting(true);
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group flex items-center gap-2 rounded-xl bg-blue px-8 py-4 text-sm font-bold text-white shadow-[0_10px_28px_-8px_rgba(36,112,179,0.65)] transition-colors duration-200 hover:bg-blue-dark dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:text-obsidian dark:shadow-[0_0_34px_-6px_rgba(47,224,182,0.6)] dark:hover:from-teal-glow dark:hover:to-teal-glow"
          >
            Start your mock interview
            <motion.span aria-hidden className="inline-block" initial={false} whileHover={{ x: 3 }}>
              →
            </motion.span>
          </motion.button>
          <p className="text-[11px] text-muted dark:text-dark-muted">
            No account or sign-up required · takes about 10 minutes
          </p>
        </motion.div>

        <div className="mt-20 grid w-full gap-3.5 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.6 + i * 0.09 }}
              className={`${GLASS_CARD} p-5`}
            >
              <h3 className="font-display text-[13px] font-bold text-navy dark:text-white">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted dark:text-dark-muted">{feature.body}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </motion.div>
  );
}
