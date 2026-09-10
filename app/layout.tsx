import type { Metadata } from "next";
import { Almarai, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Same brand typefaces as forsa-frontend (Almarai display + IBM Plex body +
// IBM Plex Mono for numbers/scores), loaded on the "latin" subset only —
// this edition of the app is English-only, brand name included.
const almarai = Almarai({
  subsets: ["latin"],
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
    // `dark` is rendered server-side because dark is the default theme, so
    // the common case needs no client-side correction at all. The init script
    // only removes it for visitors who explicitly chose light, which is the
    // one case suppressHydrationWarning covers.
    <html
      lang="en"
      className={`dark ${almarai.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-bg font-body text-navy antialiased transition-colors duration-300 dark:bg-obsidian dark:text-dark-text">
        {children}
      </body>
    </html>
  );
}
