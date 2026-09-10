/**
 * Dark mode is an opt-in alternate theme (see tailwind.config.ts's
 * `darkMode: "class"`) — Forsa's real light brand is always the default,
 * regardless of the visitor's OS preference. The choice is remembered in
 * localStorage (not sessionStorage: a deliberate visual preference should
 * survive across visits, unlike the single-use interview setup).
 */

const STORAGE_KEY = "forsa_theme";
export type Theme = "light" | "dark";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredTheme(): Theme {
  if (!isBrowser()) return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
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
 * effect) so the `dark` class is applied before first paint — otherwise the
 * page would flash light-then-dark for a returning visitor who chose dark
 * mode.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=window.localStorage.getItem("${STORAGE_KEY}");if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;
