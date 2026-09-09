/**
 * Passes the parsed CV text from the landing page to the interview page
 * without a backend or a global state provider — the landing page writes
 * it to sessionStorage right before navigating, the interview page reads
 * it once on mount. sessionStorage (not localStorage) is deliberate: a CV
 * is only ever relevant to the single interview session about to start,
 * and clearing automatically when the tab closes means nothing lingers
 * across visits.
 */

const STORAGE_KEY = "forsa_cv_context_v1";

interface StoredCv {
  text: string;
  fileName: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveCvContext(text: string, fileName: string): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredCv = { text, fileName };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save CV context to sessionStorage:", err);
  }
}

export function loadCvContext(): StoredCv | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.text === "string" && typeof parsed?.fileName === "string") {
      return parsed as StoredCv;
    }
    return null;
  } catch (err) {
    console.warn("Failed to read CV context from sessionStorage:", err);
    return null;
  }
}

export function clearCvContext(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear CV context from sessionStorage:", err);
  }
}
