import type { Config } from "tailwindcss";

// Forsa's brand palette and typography, adapted from
// forsa-frontend/tailwind.config.ts. The light theme is Forsa's real
// production identity; the dark theme (now the default — see lib/theme.ts)
// is a cinematic obsidian treatment built on the SAME brand teal rather than
// an unrelated accent, so both themes read as one product.
const config: Config = {
  // Class-based (not "media") so an explicit choice always wins over the OS
  // preference, in both directions — the app opens cinematic-dark by default
  // and the toggle can pin it to Forsa's light brand.
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2E4A",
        blue: { DEFAULT: "#2470B3", dark: "#1B5A8C" },
        teal: { DEFAULT: "#1FA98A", glow: "#2FE0B6" },
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
        // Dark theme: obsidian carrying a midnight-navy tint pulled from the
        // brand navy, so the dark surfaces read as "Forsa at night" rather
        // than neutral grey. Emerald is the brighter end of the teal ramp,
        // used only for glow/active states.
        obsidian: "#05080F",
        "dark-surface": "#0A1018",
        "dark-surface-raised": "#111A25",
        "dark-border": "#1E2A38",
        "dark-muted": "#8697A8",
        "dark-text": "#F4F8FB",
        emerald: { DEFAULT: "#12C99B", glow: "#34E7BE" },
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
        // Continuous ambient loops run as plain CSS animations rather than
        // framer-motion `repeat: Infinity` wherever the element isn't already
        // inside a motion tree — a GPU-composited CSS animation costs nothing
        // on the main thread, unlike a perpetually-ticking JS animation loop.
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.05)" },
        },
      },
      animation: {
        "fade-in-down": "fade-in-down 250ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-scale": "fade-in-scale 300ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-up": "fade-in-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "glow-pulse": "glow-pulse 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
