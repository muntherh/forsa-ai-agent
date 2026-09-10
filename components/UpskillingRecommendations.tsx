"use client";

import { motion } from "framer-motion";
import { CATEGORY_LABELS, recommendCourses } from "@/lib/upskilling";
import type { Scorecard as ScorecardData } from "@/lib/types";

/**
 * Turns the weak categories of a finished scorecard into a concrete learning
 * roadmap with direct enrolment links. Every card names the score that
 * triggered it, so the candidate can see exactly why it was suggested rather
 * than being handed a generic course list.
 */
export default function UpskillingRecommendations({ data }: { data: ScorecardData }) {
  const recommendations = recommendCourses(data);
  if (recommendations.length === 0) return null;

  const isReinforcement = recommendations[0].isReinforcement;

  return (
    <div>
      <h3 className="font-display text-base font-bold text-navy dark:text-white">
        Recommended Upskilling Roadmap
      </h3>
      <p className="mt-1.5 text-sm text-muted dark:text-dark-muted">
        {isReinforcement
          ? "No real weak spots in this interview — these are the sharpening moves for your lowest band."
          : "Free courses matched to the specific areas this interview scored lowest on."}
      </p>

      <div className="mt-5 space-y-3">
        {recommendations.map(({ course, category, score }, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: index * 0.07 }}
            className="rounded-xl border border-line bg-bg p-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-dark dark:bg-amber/15 dark:text-amber">
                {CATEGORY_LABELS[category]} · {Math.round(score)}/100
              </span>
              <span className="text-[11px] font-medium text-muted dark:text-dark-muted">{course.provider}</span>
            </div>

            <p className="mt-2.5 text-sm font-bold text-navy dark:text-white">{course.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted dark:text-dark-muted">{course.outcome}</p>

            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue/30 bg-blue/[0.06] px-3 py-1.5 text-xs font-bold text-blue-dark transition-colors hover:bg-blue/10 dark:border-teal-glow/30 dark:bg-teal-glow/[0.08] dark:text-teal-glow dark:hover:bg-teal-glow/15"
            >
              Start this course
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 17L17 7M17 7H8M17 7v9"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
