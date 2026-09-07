import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forsa AI — Voice Mock Interviewer",
  description:
    "An autonomous, real-time voice-first mock interviewer powered by Vapi and GPT-4o.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
