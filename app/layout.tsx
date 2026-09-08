import type { Metadata } from "next";
import { Almarai, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Same brand typefaces as forsa-frontend (Almarai display + IBM Plex body +
// IBM Plex Mono for numbers/scores), loaded on the "latin" subset since
// this app — unlike forsa-frontend's Arabic-first UI — is English-only.
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
    <html lang="en" className={`${almarai.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-bg font-body text-navy antialiased">{children}</body>
    </html>
  );
}
