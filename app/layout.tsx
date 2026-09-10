import type { Metadata } from "next";
import { Almarai, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Same brand typefaces as forsa-frontend (Almarai display + IBM Plex body +
// IBM Plex Mono for numbers/scores). This app's UI is English-only, but the
// hero renders the literal brand name "فرصة" as a centerpiece (BrandMark) —
// the "arabic" subset is loaded too so those glyphs actually render in
// Almarai instead of silently falling back to the OS's default Arabic font
// (a latin-only subset file has no Arabic glyphs at all).
const almarai = Almarai({
  subsets: ["latin", "arabic"],
  weight: ["400", "700", "800"],
  variable: "--font-almarai",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Forsa AI — Voice Mock Interviewer",
  description:
    "An autonomous, real-time voice-first mock interviewer powered by Vapi and GPT-4o, with instant AI-generated performance scorecards.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${almarai.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <head>
        {/* Must run before first paint to avoid a light-then-dark flash for
            a visitor who previously chose dark mode — see lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-bg font-body text-navy antialiased transition-colors duration-300 dark:bg-obsidian dark:text-dark-text">
        {children}
      </body>
    </html>
  );
}
