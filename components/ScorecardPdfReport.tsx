"use client";

import { useCallback, useState } from "react";
import type { Scorecard as ScorecardData } from "@/lib/types";
import { CATEGORY_LABELS as SKILL_LABELS, recommendCourses } from "@/lib/upskilling";

/**
 * Renders a downloadable, branded PDF of a finished interview's scorecard
 * + action plan.
 *
 * PDF ENGINE: html2canvas + jsPDF directly (dynamically imported on click,
 * so neither ships in the initial bundle) — the same technique Forsa's own
 * production report download (forsa-frontend's PremiumReportDownload.tsx)
 * uses, and for the same reason: rasterizing whatever the browser actually
 * renders means real font rendering and this app's existing Tailwind
 * classes come for free, with no separate PDF-library styling API to
 * maintain in parallel.
 *
 * HOW IT'S WIRED (ported from the proven forsa-frontend pattern):
 * 1. A normal, ALWAYS-RENDERED hidden layout (`printRef`) holds each "page"
 *    as a plain div sized to a real physical A4 page (`w-[210mm] h-[297mm]`)
 *    — jsPDF's own `{ unit: "mm", format: "a4" }` page format uses the
 *    exact same physical unit, so no separate px-to-mm conversion can drift
 *    out of sync. Hidden via a 0×0 `overflow-hidden` OUTER wrapper (takes
 *    zero space, paints nothing on screen) around printRef itself, which
 *    keeps its own full natural layout so html2canvas has real, fully
 *    painted content to rasterize — NOT `display:none` (html2canvas can't
 *    rasterize an unpainted element) and not an extreme negative offset
 *    (that has separately been confirmed elsewhere in this codebase's
 *    history to produce a near-blank capture).
 * 2. Each page div gets its OWN html2canvas() call and its own jsPDF page
 *    (`addImage` + `addPage`) — not a single capture-then-auto-slice pass,
 *    which is a known source of page-count bugs when a slicer's own height
 *    math lands fractionally apart from hand-authored page breaks.
 * 3. `windowWidth: PAGE_WIDTH_PX` forces html2canvas to render at a fixed
 *    210mm-equivalent viewport regardless of the visitor's actual browser
 *    width, so a capture on a narrow phone screen isn't clipped.
 */

const MM_PER_INCH = 25.4;
const CSS_PX_PER_INCH = 96;
const PAGE_WIDTH_PX = Math.round((210 / MM_PER_INCH) * CSS_PX_PER_INCH);

const FORSA_BLUE = "#2470B3";
const FORSA_BLUE_DARK = "#1B5A8C";
const FORSA_TEAL = "#1FA98A";
const FORSA_TEAL_DARK = "#0F6B57";
const FORSA_AMBER = "#F2A93B";
const FORSA_AMBER_DARK = "#8A5A0C";

const MAX_ACTION_PHASES = 4;
const MAX_TASKS_PER_PHASE = 6;

function scoreColor(score: number) {
  if (score >= 75) return FORSA_TEAL_DARK;
  if (score >= 50) return FORSA_AMBER_DARK;
  return "#B42318";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function Watermark({ opacity = 0.06 }: { opacity?: number }) {
  return (
    // Only ever rendered inside the hidden html2canvas capture target;
    // next/image's lazy loading / proxied URL would add "is it actually
    // painted yet" uncertainty that html2canvas can't tolerate (see this
    // file's header comment).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 grayscale"
      style={{ opacity }}
    />
  );
}

function HeaderBand({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div
      className="relative flex flex-col justify-end px-12 pb-8 pt-10"
      style={{ height: 160, background: `linear-gradient(135deg, ${FORSA_BLUE} 0%, ${FORSA_TEAL_DARK} 100%)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- see Watermark's comment above */}
      <img src="/logo.png" alt="" aria-hidden className="absolute right-12 top-8 h-10 w-10 rounded-full border border-white/40" />
      <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-white/75">{eyebrow}</p>
      <h2 className="font-display text-[26px] font-extrabold text-white">{title}</h2>
    </div>
  );
}

function PageFooter({ pageText }: { pageText: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-line px-12 py-4 text-[11px] text-muted">
      <span>Forsa AI</span>
      <span className="font-mono">{pageText}</span>
    </div>
  );
}

function CircularScore({ label, value, color }: { label: string; value: number; color: string }) {
  const size = 122;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E3E9EF" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[24px] font-extrabold" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <p className="text-center text-[12.5px] font-semibold text-navy">{label}</p>
    </div>
  );
}

// --- Icons for the button (mirrors the icon states already used site-wide) ---

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v12m0 0l-5-5m5 5l5-5M4 20h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2.5} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface ScorecardPdfReportProps {
  data: ScorecardData;
  role: string;
  experienceLevel: string;
}

export default function ScorecardPdfReport({ data, role, experienceLevel }: ScorecardPdfReportProps) {
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle");

  const handleDownload = useCallback(async () => {
    if (status === "generating") return;
    setStatus("generating");

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

      const container = document.getElementById("scorecard-pdf-pages");
      if (!container) throw new Error("PDF layout not found in the DOM.");

      const pageEls = Array.from(container.children) as HTMLElement[];
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageEls.length; i++) {
        const pageEl = pageEls[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: PAGE_WIDTH_PX,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

        // html2canvas rasterizes to a flat image, so any <a> inside it stops
        // being a link. Re-attach real PDF link annotations on top of the
        // image by measuring each anchor against its page element and scaling
        // that rect into millimetres — the page div is authored at exactly
        // 210mm wide, so its own measured width is the px-per-mm reference
        // and the two can't drift apart.
        const pageRect = pageEl.getBoundingClientRect();
        const mmPerPx = pdfWidth / pageRect.width;
        pageEl.querySelectorAll<HTMLElement>("[data-pdf-link]").forEach((linkEl) => {
          const url = linkEl.dataset.pdfLink;
          if (!url) return;
          const r = linkEl.getBoundingClientRect();
          // The rect comes from the LIVE DOM while the glyphs underneath were
          // drawn by html2canvas, whose baseline placement is close to but
          // not pixel-identical with the browser's. Measured drift was ~2.7mm
          // vertically, enough to leave the bottom of a link untappable — so
          // the hit area is padded to absorb it. Link rows sit ~30mm apart,
          // so this cannot bleed into a neighbouring link.
          const padMm = 2.5;
          pdf.link(
            (r.left - pageRect.left) * mmPerPx - 1,
            (r.top - pageRect.top) * mmPerPx - padMm,
            r.width * mmPerPx + 2,
            r.height * mmPerPx + padMm * 2,
            { url }
          );
        });
      }

      pdf.save(`Forsa-AI-Interview-Report.pdf`);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1800);
    } catch (err) {
      console.error("ScorecardPdfReport: PDF generation failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2600);
    }
  }, [status]);

  const phases = data.actionPlan.phases.slice(0, MAX_ACTION_PHASES).map((phase) => ({
    ...phase,
    tasks: phase.tasks.slice(0, MAX_TASKS_PER_PHASE),
  }));

  // The roadmap page is only emitted when there is something to put on it, so
  // the page count below has to follow it rather than being hardcoded.
  const recommendations = recommendCourses(data);
  const totalPages = recommendations.length > 0 ? 3 : 2;

  const label =
    status === "generating"
      ? "Generating…"
      : status === "success"
        ? "Downloaded ✓"
        : status === "error"
          ? "Something went wrong — try again"
          : "Download PDF Report";

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={status === "generating"}
        // Only the BUTTON is theme-aware. The hidden capture layout below
        // must stay light: html2canvas rasterizes it onto white PDF pages.
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(36,112,179,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-90 disabled:hover:translate-y-0 dark:bg-gradient-to-r dark:from-teal dark:to-emerald dark:text-obsidian dark:shadow-[0_0_30px_-6px_rgba(47,224,182,0.6)]"
      >
        {status === "generating" ? <SpinnerIcon /> : status === "success" ? <CheckIcon /> : <DownloadIcon />}
        {label}
      </button>

      {/* Hidden capture target — see this file's header comment for why the
          outer wrapper (not printRef itself) is what's actually hidden. */}
      <div aria-hidden className="h-0 w-0 overflow-hidden">
        <div id="scorecard-pdf-pages" className="w-[210mm] font-body">
          {/* --- Page 1: Cover + Scores --- */}
          <div className="relative h-[297mm] w-[210mm] overflow-hidden bg-white">
            <Watermark />
            <div
              className="relative flex flex-col items-center justify-center px-16 py-14 text-center"
              style={{ background: `linear-gradient(160deg, ${FORSA_BLUE} 0%, ${FORSA_BLUE_DARK} 45%, ${FORSA_TEAL_DARK} 100%)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see Watermark's comment above */}
              <img src="/logo.png" alt="" aria-hidden className="mb-6 h-16 w-16 rounded-full border-2 border-white/50" />
              <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.2em] text-white/70">
                Mock Interview Report
              </p>
              <h1 className="mb-3 font-display text-[32px] font-extrabold leading-tight text-white">
                {role} · {experienceLevel}
              </h1>
              <p className="text-[13px] text-white/85">{formatDate(new Date())}</p>
            </div>

            <div className="relative flex flex-wrap items-start justify-center gap-x-6 gap-y-8 px-12 pt-10">
              <CircularScore label="Overall Score" value={data.overallScore} color={scoreColor(data.overallScore)} />
              <CircularScore label="Technical" value={data.categoryScores.technicalKnowledge} color={FORSA_TEAL_DARK} />
              <CircularScore label="Problem Solving" value={data.categoryScores.problemSolving} color={FORSA_BLUE} />
              <CircularScore label="Communication" value={data.categoryScores.communication} color={FORSA_BLUE_DARK} />
              <CircularScore label="Confidence" value={data.categoryScores.confidence} color={FORSA_AMBER_DARK} />
            </div>

            <div className="relative mt-8 px-16">
              <p className="text-center text-[13px] leading-relaxed text-muted">{data.summary}</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-line p-4">
                  <p className="mb-1.5 text-[11px] font-bold" style={{ color: FORSA_TEAL_DARK }}>
                    Strengths
                  </p>
                  <ul className="space-y-1">
                    {data.strengths.map((item, i) => (
                      <li key={i} className="text-[12px] leading-relaxed text-navy">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="mb-1.5 text-[11px] font-bold" style={{ color: FORSA_AMBER_DARK }}>
                    Areas for Improvement
                  </p>
                  <ul className="space-y-1">
                    {data.areasForImprovement.map((item, i) => (
                      <li key={i} className="text-[12px] leading-relaxed text-navy">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <PageFooter pageText={`1 / ${totalPages}`} />
          </div>

          {/* --- Page 2: Action Plan --- */}
          <div className="relative h-[297mm] w-[210mm] overflow-hidden bg-white">
            <Watermark opacity={0.05} />
            <HeaderBand eyebrow="Personalized Action Plan" title={data.actionPlan.title} />

            <div className="relative px-12 pt-8">
              <p className="mb-6 text-[13px] leading-relaxed text-muted">{data.actionPlan.summary}</p>

              <div className="space-y-5">
                {phases.map((phase, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-bg p-5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-[14px] font-bold text-navy">
                        {i + 1}. {phase.title}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: "rgba(36,112,179,0.1)", color: FORSA_BLUE }}
                      >
                        {phase.estimatedDuration}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {phase.tasks.map((task, ti) => (
                        <li key={ti} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: FORSA_TEAL }} />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-x-12 bottom-16 rounded-xl bg-bg px-5 py-4 text-center text-[11px] text-muted">
              Automatically generated by Forsa AI — a directional coaching tool, not a certified
              assessment of the candidate&apos;s abilities.
            </div>
            <PageFooter pageText={`2 / ${totalPages}`} />
          </div>

          {/* --- Page 3: Recommended Upskilling Roadmap (only when there is
              something to recommend; totalPages above follows this) --- */}
          {recommendations.length > 0 && (
            <div className="relative h-[297mm] w-[210mm] overflow-hidden bg-white">
              <Watermark opacity={0.04} />
              <HeaderBand eyebrow="Recommended next steps" title="Upskilling Roadmap" />

              <div className="relative px-12 pt-8">
                <p className="text-[12.5px] leading-relaxed text-muted">
                  {recommendations[0].isReinforcement
                    ? "No significant weaknesses surfaced in this interview. These free courses sharpen the lowest-scoring band further."
                    : "Free courses matched to the specific criteria this interview scored lowest on. Each link opens the course directly."}
                </p>

                <div className="mt-6 space-y-4">
                  {recommendations.map(({ course, category, score }) => (
                    <div key={course.id} className="rounded-xl border border-line bg-bg px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ backgroundColor: "rgba(242,169,59,0.16)", color: FORSA_AMBER_DARK }}
                        >
                          {SKILL_LABELS[category]} · {Math.round(score)}/100
                        </span>
                        <span className="text-[11px] font-medium text-muted">{course.provider}</span>
                      </div>

                      <p className="mt-2.5 text-[14px] font-bold leading-snug text-navy">{course.title}</p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{course.outcome}</p>

                      {/* The URL is printed as visible text so it survives
                          printing on paper, and carries data-pdf-link so the
                          download handler can lay a real clickable annotation
                          over exactly this rectangle. */}
                      <p
                        data-pdf-link={course.url}
                        className="mt-2.5 inline-block break-all font-mono text-[11px] font-semibold"
                        style={{ color: FORSA_BLUE }}
                      >
                        {course.url}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute inset-x-12 bottom-16 rounded-xl bg-bg px-5 py-4 text-center text-[11px] text-muted">
                Course links were correct at the time this report was generated. All courses listed
                are free to audit; certificates may require payment.
              </div>
              <PageFooter pageText={`3 / ${totalPages}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
