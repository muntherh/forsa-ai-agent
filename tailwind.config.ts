import type { Config } from "tailwindcss";

// Forsa's brand palette, typography, and radii — adapted 1:1 from
// forsa-frontend/tailwind.config.ts so this English-only sibling app reads
// as unmistakably the same product family.
const config: Config = {
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
      },
      animation: {
        "fade-in-down": "fade-in-down 250ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-scale": "fade-in-scale 300ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-up": "fade-in-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
