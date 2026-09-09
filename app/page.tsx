"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CvUpload from "@/components/CvUpload";
import { clearCvContext, saveCvContext } from "@/lib/cv-session";
import type { ExperienceLevel, InterviewRole } from "@/lib/types";

const ROLES: InterviewRole[] = ["Software Engineer", "Data Scientist", "Product Manager", "DevOps Engineer", "UX Designer"];
const LEVELS: ExperienceLevel[] = ["Entry-level", "Mid-level", "Senior"];

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
  const [role, setRole] = useState<InterviewRole>(ROLES[0]);
  const [level, setLevel] = useState<ExperienceLevel>(LEVELS[1]);
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  function startInterview() {
    if (cvText) saveCvContext(cvText, cvFileName ?? "CV");
    const params = new URLSearchParams({ role, level });
    router.push(`/interview?${params.toString()}`);
  }

  return (
    <>
      <header className="border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 font-display text-xl font-extrabold text-navy">
            <Image src="/logo.png" alt="Forsa" width={34} height={34} className="rounded-full border border-line shadow-sm" />
            Forsa AI
          </div>
          <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            English Edition
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 sm:py-24">
        <h1 className="text-center font-display text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
          Practice your next interview,
          <br />
          out loud.
        </h1>

        <p className="mt-5 max-w-xl text-center text-base text-muted">
          An autonomous, real-time voice interviewer from Forsa. Talk through technical and
          behavioral questions with an AI interviewer, then get an instant, structured performance
          scorecard.
        </p>

        <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-card border border-line bg-white p-5 shadow-sm">
              <h3 className="font-display text-sm font-bold text-navy">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted">{feature.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 w-full max-w-md rounded-card border border-line bg-white p-6 shadow-[0_30px_60px_-20px_rgba(11,46,74,0.25)]">
          <h2 className="font-display text-sm font-bold text-navy">Set up your mock interview</h2>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted">Target role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as InterviewRole)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Experience level</label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as ExperienceLevel)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-blue"
          >
            {LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="mt-4">
            <CvUpload
              onChange={(text, fileName) => {
                setCvText(text);
                setCvFileName(fileName);
                if (!text) clearCvContext();
              }}
            />
          </div>

          <button
            type="button"
            onClick={startInterview}
            className="mt-6 w-full rounded-xl bg-blue px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(36,112,179,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0 active:scale-[0.98]"
          >
            Start Mock Interview
          </button>

          <p className="mt-3 text-center text-xs text-muted">
            You&apos;ll be asked for microphone access. No account or sign-up required.
          </p>
        </div>
      </main>
    </>
  );
}
