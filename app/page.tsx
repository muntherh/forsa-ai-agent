"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceLevel, InterviewRole } from "@/lib/types";

const ROLES: InterviewRole[] = ["Software Engineer", "Data Scientist", "Product Manager", "DevOps Engineer", "UX Designer"];
const LEVELS: ExperienceLevel[] = ["Entry-level", "Mid-level", "Senior"];

const FEATURES = [
  {
    title: "Real-time voice, not a chatbot",
    body: "Speak naturally over WebRTC — Ava listens, thinks, and responds in real time, just like a real call.",
  },
  {
    title: "Adapts to your role & level",
    body: "Questions are generated live by GPT-4o, tailored to the role and seniority you pick below.",
  },
  {
    title: "Instant, structured feedback",
    body: "The moment the call ends, get a scored breakdown of your technical knowledge, communication, and more.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [role, setRole] = useState<InterviewRole>(ROLES[0]);
  const [level, setLevel] = useState<ExperienceLevel>(LEVELS[1]);

  function startInterview() {
    const params = new URLSearchParams({ role, level });
    router.push(`/interview?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-16 sm:py-24">
      <span className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan">
        Forsa AI — English Edition
      </span>

      <h1 className="mt-6 text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Practice your next interview,
        <br />
        out loud.
      </h1>

      <p className="mt-5 max-w-xl text-center text-base text-muted">
        An autonomous, real-time voice interviewer. Talk through technical and behavioral questions
        with an AI interviewer, then get an instant, structured performance scorecard.
      </p>

      <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-card border border-line bg-surface p-5">
            <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted">{feature.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 w-full max-w-md rounded-card border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold text-white">Set up your mock interview</h2>

        <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-muted">Target role</label>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as InterviewRole)}
          className="mt-2 w-full rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo"
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">Experience level</label>
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as ExperienceLevel)}
          className="mt-2 w-full rounded-lg border border-line bg-surface-raised px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo"
        >
          {LEVELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={startInterview}
          className="mt-6 w-full rounded-full bg-indigo px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo/30 transition hover:bg-indigo-dark active:scale-[0.98]"
        >
          Start Mock Interview
        </button>

        <p className="mt-3 text-center text-xs text-muted">
          You&apos;ll be asked for microphone access. No account or sign-up required.
        </p>
      </div>
    </main>
  );
}
