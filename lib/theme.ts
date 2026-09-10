/**
 * The app opens in its cinematic dark theme; light mode is Forsa's real
 * production brand palette, kept as an explicit opt-out via the header
 * toggle. The choice is remembered in localStorage (not sessionStorage: a
 * deliberate visual preference should survive across visits, unlike the
 * single-use interview setup).
 *
 * Dark being the DEFAULT is why the server renders `<html class="dark">` and
 * the init script below only ever *removes* that class: the no-preference
 * case then matches the server markup exactly, so there is nothing for
 * hydration to reconcile.
 */

const STORAGE_KEY = "forsa_theme";
export type Theme = "light" | "dark";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredTheme(): Theme {
  if (!isBrowser()) return "dark";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  if (!isBrowser()) return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded edge cases —
    // the toggle still works for the rest of the session, it just won't
    // persist across a reload.
  }
}

/**
 * Inlined into app/layout.tsx's <head> as a blocking <script> (not a React
 * effect) so the theme is settled before first paint — otherwise a visitor
 * who chose light mode would see a flash of the dark theme on every load.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(window.localStorage.getItem("${STORAGE_KEY}")==="light"){document.documentElement.classList.remove("dark");}}catch(e){}})();`;
