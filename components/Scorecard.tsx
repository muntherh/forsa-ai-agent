"use client";

import ScorecardPdfReport from "@/components/ScorecardPdfReport";
import type { ExperienceLevel, InterviewRole, Recommendation, Scorecard as ScorecardData } from "@/lib/types";

const RECOMMENDATION_STYLES: Record<Recommendation, string> = {
  "Strong Hire": "bg-teal/15 text-teal-dark border-teal/30 dark:bg-teal-glow/15 dark:text-teal-glow dark:border-teal-glow/30",
  Hire: "bg-teal/10 text-teal-dark border-teal/20 dark:bg-teal-glow/10 dark:text-teal-glow dark:border-teal-glow/20",
  "No Hire": "bg-amber/15 text-amber-dark border-amber/30 dark:bg-amber/15 dark:text-amber dark:border-amber/30",
  "Strong No Hire": "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
};

const CATEGORY_LABELS: Record<keyof ScorecardData["categoryScores"], string> = {
  technicalKnowledge: "Technical Knowledge",
  problemSolving: "Problem Solving",
  communication: "Communication",
  confidence: "Confidence",
};

function scoreColor(score: number) {
  if (score >= 75) return "bg-teal";
  if (score >= 50) return "bg-amber";
  return "bg-red-500";
}

function scoreBadgeClass(score: number) {
  if (score >= 75) return "bg-teal/10 text-teal-dark dark:bg-teal-glow/10 dark:text-teal-glow";
  if (score >= 50) return "bg-amber/15 text-amber-dark dark:bg-amber/15 dark:text-amber";
  return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#1FA98A" : score >= 50 ? "#F2A93B" : "#DC2626";

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" strokeWidth="10" className="stroke-line dark:stroke-white/10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-4xl font-bold text-navy dark:text-white">{Math.round(score)}</span>
        <span className="text-xs uppercase tracking-wide text-muted dark:text-dark-muted">/ 100</span>
      </div>
    </div>
  );
}

interface ScorecardProps {
  data: ScorecardData;
  role: InterviewRole;
  experienceLevel: ExperienceLevel;
}

export default function Scorecard({ data, role, experienceLevel }: ScorecardProps) {
  return (
    <div className="animate-fade-in-up rounded-[22px] border border-line bg-white/70 p-6 shadow-[0_30px_80px_-30px_rgba(11,46,74,0.35),inset_0_1px_0_0_rgba(255,255,255,0.7)] backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <div className="flex flex-col items-center gap-4 border-b border-line pb-8 sm:flex-row sm:justify-between dark:border-white/10">
        <div className="text-center sm:text-left">
          <h2 className="font-display text-lg font-bold text-navy dark:text-white">Interview Scorecard</h2>
          <p className="mt-1 max-w-md text-sm text-muted dark:text-dark-muted">{data.summary}</p>
        </div>
        <ScoreRing score={data.overallScore} />
      </div>

      <div className="mt-6 flex justify-center sm:justify-start">
        <span
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${RECOMMENDATION_STYLES[data.recommendation]}`}
        >
          {data.recommendation}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(Object.keys(data.categoryScores) as (keyof ScorecardData["categoryScores"])[]).map((key) => {
          const value = data.categoryScores[key];
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
                <span className="font-medium text-muted dark:text-dark-muted">{CATEGORY_LABELS[key]}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${scoreBadgeClass(value)}`}>
                  {Math.round(value)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDF1F5] dark:bg-white/10">
                <div
                  className={`h-full rounded-full ${scoreColor(value)} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold text-teal-dark dark:text-teal-glow">Strengths</h3>
          <ul className="space-y-2">
            {data.strengths.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm text-muted dark:text-dark-muted">
                <span className="mt-0.5 text-teal-dark dark:text-teal-glow">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-amber-dark dark:text-amber">Areas for Improvement</h3>
          <ul className="space-y-2">
            {data.areasForImprovement.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm text-muted dark:text-dark-muted">
                <span className="mt-0.5 text-amber-dark dark:text-amber">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-8 dark:border-white/10">
        <h3 className="font-display text-base font-bold text-navy dark:text-white">{data.actionPlan.title}</h3>
        <p className="mt-1.5 text-sm text-muted dark:text-dark-muted">{data.actionPlan.summary}</p>

        <div className="mt-5 space-y-4">
          {data.actionPlan.phases.map((phase, index) => (
            <div key={index} className="rounded-xl border border-line bg-bg p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-navy dark:text-white">
                  {index + 1}. {phase.title}
                </p>
                <span className="flex-shrink-0 rounded-full bg-blue/10 px-2.5 py-0.5 text-xs font-semibold text-blue-dark dark:bg-teal-glow/10 dark:text-teal-glow">
                  {phase.estimatedDuration}
                </span>
              </div>
              <ul className="space-y-1.5">
                {phase.tasks.map((task, taskIndex) => (
                  <li key={taskIndex} className="flex items-start gap-2 text-sm text-muted dark:text-dark-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal dark:bg-teal-glow" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <ScorecardPdfReport data={data} role={role} experienceLevel={experienceLevel} />
      </div>

      <p className="mt-6 border-t border-line pt-4 text-xs text-muted dark:border-white/10 dark:text-dark-muted">
        This scorecard was generated automatically by an AI model based on a single practice
        interview. It is intended as directional coaching feedback, not a certified assessment of
        the candidate&apos;s abilities.
      </p>
    </div>
  );
}
