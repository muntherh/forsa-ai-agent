import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#05070D",
        surface: "#0E1220",
        "surface-raised": "#151A2C",
        line: "#232A42",
        indigo: { DEFAULT: "#6366F1", dark: "#4338CA" },
        cyan: "#22D3EE",
        muted: "#8B93AB",
        good: "#34D399",
        warn: "#FBBF24",
        bad: "#F87171",
      },
      borderRadius: {
        card: "20px",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 400ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "fade-in": "fade-in 300ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
