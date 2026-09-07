"use client";

import type { Recommendation, Scorecard as ScorecardData } from "@/lib/types";

const RECOMMENDATION_STYLES: Record<Recommendation, string> = {
  "Strong Hire": "bg-good/15 text-good border-good/30",
  Hire: "bg-good/10 text-good border-good/20",
  "No Hire": "bg-warn/10 text-warn border-warn/20",
  "Strong No Hire": "bg-bad/10 text-bad border-bad/20",
};

const CATEGORY_LABELS: Record<keyof ScorecardData["categoryScores"], string> = {
  technicalKnowledge: "Technical Knowledge",
  problemSolving: "Problem Solving",
  communication: "Communication",
  confidence: "Confidence",
};

function scoreColor(score: number) {
  if (score >= 75) return "bg-good";
  if (score >= 50) return "bg-warn";
  return "bg-bad";
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#34D399" : score >= 50 ? "#FBBF24" : "#F87171";

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#232A42" strokeWidth="10" />
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
        <span className="text-4xl font-semibold text-white">{Math.round(score)}</span>
        <span className="text-xs uppercase tracking-wide text-muted">/ 100</span>
      </div>
    </div>
  );
}

export default function Scorecard({ data }: { data: ScorecardData }) {
  return (
    <div className="animate-fade-in-up rounded-card border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4 border-b border-line pb-8 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold text-white">Interview Scorecard</h2>
          <p className="mt-1 max-w-md text-sm text-muted">{data.summary}</p>
        </div>
        <ScoreRing score={data.overallScore} />
      </div>

      <div className="mt-6 flex justify-center sm:justify-start">
        <span
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${RECOMMENDATION_STYLES[data.recommendation]}`}
        >
          {data.recommendation}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(Object.keys(data.categoryScores) as (keyof ScorecardData["categoryScores"])[]).map((key) => {
          const value = data.categoryScores[key];
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">{CATEGORY_LABELS[key]}</span>
                <span className="font-medium text-white">{Math.round(value)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
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
          <h3 className="mb-3 text-sm font-semibold text-good">Strengths</h3>
          <ul className="space-y-2">
            {data.strengths.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm text-muted">
                <span className="mt-0.5 text-good">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-warn">Areas for Improvement</h3>
          <ul className="space-y-2">
            {data.areasForImprovement.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm text-muted">
                <span className="mt-0.5 text-warn">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-8 border-t border-line pt-4 text-xs text-muted">
        This scorecard was generated automatically by an AI model based on a single practice
        interview. It is intended as directional coaching feedback, not a certified assessment of
        the candidate&apos;s abilities.
      </p>
    </div>
  );
}
