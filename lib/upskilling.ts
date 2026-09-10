import type { CategoryScores, Scorecard } from "./types";

/**
 * The upskilling catalogue and the logic that turns a scorecard into a
 * personalised learning roadmap.
 *
 * Every course here is a free-to-audit course on a major platform, and each
 * one is attached to the specific rubric category it addresses — so a
 * recommendation is always traceable to a real, low score from the
 * candidate's own interview rather than being generic filler.
 *
 * Course titles and providers are stored alongside the URL on purpose: the
 * exported PDF prints all three, so a candidate can still find the course by
 * name if a platform ever reorganises its URLs.
 */

export type SkillCategory = keyof CategoryScores;

export interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  /** Which rubric categories this course strengthens. */
  categories: SkillCategory[];
  /** What it fixes — shown to the candidate as the rationale. */
  outcome: string;
}

export const COURSE_CATALOGUE: Course[] = [
  {
    id: "communication-skills",
    title: "Improving Communication Skills",
    provider: "University of Pennsylvania · Coursera",
    url: "https://www.coursera.org/learn/communication-skills",
    categories: ["communication"],
    outcome:
      "Get your ideas across clearly and handle unexpected interview questions with more flexibility.",
  },
  {
    id: "public-speaking",
    title: "Introduction to Public Speaking",
    provider: "University of Washington · Coursera",
    url: "https://www.coursera.org/learn/public-speaking",
    categories: ["confidence", "communication"],
    outcome:
      "Break the fear barrier, steady your delivery, and build real presence when you're being assessed.",
  },
  {
    id: "google-ai-essentials",
    title: "Google AI Essentials",
    provider: "Google · Coursera",
    url: "https://www.coursera.org/professional-certificates/google-ai-essentials",
    categories: ["technicalKnowledge"],
    outcome:
      "Close the AI-literacy gap and speak credibly about using AI tools in day-to-day engineering work.",
  },
  {
    id: "learning-how-to-learn",
    title: "Learning How to Learn: Powerful mental tools to help you master tough subjects",
    provider: "McMaster University · Coursera",
    url: "https://www.coursera.org/learn/learning-how-to-learn",
    categories: ["problemSolving", "technicalKnowledge"],
    outcome:
      "Absorb unfamiliar concepts faster and retain them, using deep-practice and spaced-recall techniques.",
  },
  {
    id: "interview-techniques",
    title: "Advanced Interviewing Techniques",
    provider: "University of Maryland · Coursera",
    url: "https://www.coursera.org/learn/interview-techniques",
    categories: ["communication", "confidence"],
    outcome:
      "Handle competency-based and behavioural questions with structured, evidence-backed answers.",
  },
  {
    id: "interviews-with-ai",
    title: "Prepare and Practice for Interviews with AI",
    provider: "Google · Coursera",
    url: "https://www.coursera.org/learn/google-prepare-and-practice-for-interviews-with-ai",
    categories: ["confidence", "communication"],
    outcome:
      "Learn the STAR method for behavioural answers and rehearse against realistic interview prompts.",
  },
  {
    id: "algorithmic-toolbox",
    title: "Algorithmic Toolbox",
    provider: "UC San Diego · Coursera",
    url: "https://www.coursera.org/learn/algorithmic-toolbox",
    categories: ["problemSolving"],
    outcome:
      "Build a reliable method for breaking down unfamiliar problems under time pressure.",
  },
  {
    id: "algorithms-part-1",
    title: "Algorithms, Part I",
    provider: "Princeton University · Coursera",
    url: "https://www.coursera.org/learn/algorithms-part1",
    categories: ["technicalKnowledge", "problemSolving"],
    outcome:
      "Shore up data-structure and algorithm fundamentals that technical rounds keep returning to.",
  },
  {
    id: "sql-for-data-science",
    title: "SQL for Data Science",
    provider: "UC Davis · Coursera",
    url: "https://www.coursera.org/learn/sql-for-data-science",
    categories: ["technicalKnowledge"],
    outcome:
      "Query and reason about data confidently — expected in data, analytics and most backend roles.",
  },
];

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  technicalKnowledge: "Technical Knowledge",
  problemSolving: "Problem Solving",
  communication: "Communication",
  confidence: "Confidence",
};

/**
 * Below this, a category is treated as a genuine gap worth a course.
 * Matches the band the scorecard UI already uses for "strong" (>= 75), so
 * the recommendations never contradict the colour the candidate is looking
 * at right above them.
 */
const GAP_THRESHOLD = 75;

/** Keeps the roadmap actionable, and keeps the PDF page to one sheet. */
const MAX_RECOMMENDATIONS = 4;

export interface Recommendation {
  course: Course;
  /** The category that triggered it, and that category's actual score. */
  category: SkillCategory;
  score: number;
  /** True when nothing was actually weak and this is a sharpening suggestion. */
  isReinforcement: boolean;
}

/**
 * Turns category scores into an ordered roadmap: weakest area first, at most
 * two courses per area, never the same course twice.
 *
 * When every category is already strong there is no gap to fix, but an empty
 * roadmap is a wasted section — so it falls back to the single lowest
 * category and marks the result as reinforcement, which the UI wording keys
 * off so it doesn't tell a strong candidate they have a weakness.
 */
export function recommendCourses(scorecard: Scorecard): Recommendation[] {
  const scores = scorecard.categoryScores;
  const ranked = (Object.keys(scores) as SkillCategory[])
    .map((category) => ({ category, score: scores[category] }))
    .sort((a, b) => a.score - b.score);

  const gaps = ranked.filter((entry) => entry.score < GAP_THRESHOLD);
  const isReinforcement = gaps.length === 0;
  const targets = isReinforcement ? ranked.slice(0, 1) : gaps;

  const recommendations: Recommendation[] = [];
  const used = new Set<string>();

  for (const target of targets) {
    const matches = COURSE_CATALOGUE.filter(
      (course) => course.categories.includes(target.category) && !used.has(course.id)
    ).slice(0, 2);

    for (const course of matches) {
      if (recommendations.length >= MAX_RECOMMENDATIONS) break;
      used.add(course.id);
      recommendations.push({ course, category: target.category, score: target.score, isReinforcement });
    }
    if (recommendations.length >= MAX_RECOMMENDATIONS) break;
  }

  return recommendations;
}
