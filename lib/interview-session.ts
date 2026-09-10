/**
 * Passes the candidate's full interview setup — role, experience level, and
 * (optionally) parsed CV text — from the landing page to the interview page
 * without a backend or a global state provider: the landing page writes it
 * to sessionStorage right before navigating, the interview page reads it
 * once on mount, then clears it. sessionStorage (not localStorage, not URL
 * query params) is deliberate: this setup is only ever relevant to the
 * single interview about to start, so it shouldn't linger across tabs/visits
 * or be visible/bookmarkable in the URL.
 *
 * Supersedes the old lib/cv-session.ts (CV-only) now that the landing page's
 * role/experience-level selection also needs to survive the navigation —
 * previously carried via ?role=&level= query params.
 */

const STORAGE_KEY = "forsa_interview_setup_v1";

export interface InterviewSetup {
  role: string;
  experienceLevel: string;
  cvText?: string;
  cvFileName?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveInterviewSetup(setup: InterviewSetup): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  } catch (err) {
    console.warn("Failed to save interview setup to sessionStorage:", err);
  }
}

export function loadInterviewSetup(): InterviewSetup | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.role === "string" && typeof parsed?.experienceLevel === "string") {
      return parsed as InterviewSetup;
    }
    return null;
  } catch (err) {
    console.warn("Failed to read interview setup from sessionStorage:", err);
    return null;
  }
}

export function clearInterviewSetup(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear interview setup from sessionStorage:", err);
  }
}
