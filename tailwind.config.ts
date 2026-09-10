import type { Config } from "tailwindcss";

// Forsa's brand palette, typography, and radii — adapted 1:1 from
// forsa-frontend/tailwind.config.ts so this English-only sibling app reads
// as unmistakably the same product family.
const config: Config = {
  // Class-based (not "media") so a user's explicit toggle (see lib/theme.ts)
  // always wins over their OS preference — the landing page defaults to
  // Forsa's real light brand regardless of system theme, exactly like
  // forsa-frontend itself (which has no dark mode at all). Dark mode here is
  // an opt-in alternate theme for this app only, applied via a `dark` class
  // on <html>.
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2E4A",
        blue: { DEFAULT: "#2470B3", dark: "#1B5A8C" },
        teal: "#1FA98A",
        amber: "#F2A93B",
        bg: "#F6F8FA",
        line: "#E3E9EF",
        muted: "#5B7185",
        // Accessible (WCAG AA, 4.5:1+) text colors for use on tinted teal/
        // amber backgrounds (e.g. bg-teal/10) — the brand teal/amber
        // themselves fall short of AA at body-text weight. Same values
        // forsa-frontend settled on after its own contrast pass.
        "teal-dark": "#0F6B57",
        "amber-dark": "#8A5A0C",
        // Dark-theme tokens (opt-in, see darkMode above) — a distinct
        // obsidian/indigo/emerald palette rather than a darkened version of
        // the light brand tokens, since it's an intentionally different,
        // higher-contrast surface (deep charcoal + neon accents) rather than
        // an inverted version of the same design.
        obsidian: "#0a0a0a",
        "dark-surface": "#141417",
        "dark-surface-raised": "#1c1c20",
        "dark-border": "#27272a",
        "dark-muted": "#a1a1aa",
        "dark-text": "#fafafa",
        indigo: { DEFAULT: "#6366f1", glow: "#818cf8" },
        emerald: { DEFAULT: "#10b981", glow: "#34d399" },
      },
      fontFamily: {
        // forsa-frontend pairs Almarai (display) with IBM Plex Sans Arabic
        // (body) loaded on the "arabic" subset for its Arabic-first UI.
        // This app is English-only, so the same two type families are used
        // via their Latin-subset Google Fonts builds instead — same brand
        // typography, rendered for the script this app actually uses.
        display: ["var(--font-almarai)", "sans-serif"],
        body: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        card: "18px",
      },
      keyframes: {
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Continuous ambient loops (AmbientBackground / BrandMark glow) run
        // as plain CSS animations rather than framer-motion `repeat:
        // Infinity` — a GPU-composited CSS animation costs nothing on the
        // main thread, unlike a perpetually-ticking JS animation loop.
        drift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(var(--drift-x, 12px), var(--drift-y, -16px))" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" },
        },
      },
      animation: {
        "fade-in-down": "fade-in-down 250ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-scale": "fade-in-scale 300ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-up": "fade-in-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both",
        drift: "drift 9s ease-in-out infinite",
        "glow-pulse": "glow-pulse 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
