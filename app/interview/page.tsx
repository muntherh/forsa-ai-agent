"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMotionValue, useSpring } from "framer-motion";
import CallControls from "@/components/CallControls";
import Scorecard from "@/components/Scorecard";
import TranscriptPanel from "@/components/TranscriptPanel";
import VoiceWaveform from "@/components/VoiceWaveform";
import { buildInterviewAssistant, buildInterviewVariableValues } from "@/lib/assistant";
import { scorecardSchema } from "@/lib/rubric";
import { getVapiClient, isVapiConfigured } from "@/lib/vapi-client";
import type {
  CallStatus,
  ExperienceLevel,
  InterviewRole,
  Scorecard as ScorecardData,
  TranscriptTurn,
} from "@/lib/types";

const DEFAULT_ROLE: InterviewRole = "Software Engineer";
const DEFAULT_LEVEL: ExperienceLevel = "Mid-level";

// A real interview needs at least this many turns before an evaluation is
// meaningful — guards against scoring a call that ended in the first few
// seconds (e.g. the candidate hung up immediately).
const MIN_TURNS_FOR_EVALUATION = 2;

function describeVapiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const message = e.message ?? e.error ?? (e.error as Record<string, unknown> | undefined)?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "An unexpected error occurred while connecting to the interview call.";
}

function InterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") as InterviewRole) || DEFAULT_ROLE;
  const level = (searchParams.get("level") as ExperienceLevel) || DEFAULT_LEVEL;

  const [configured] = useState(isVapiConfigured());
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [scorecardStatus, setScorecardStatus] = useState<"idle" | "waiting" | "ready" | "error" | "too-short">("idle");

  const hasEndedRef = useRef(false);
  // Authoritative transcript for the evaluation request: call-end fires a
  // closure captured when the effect below was registered, so it cannot
  // read the live `transcript` state without going stale. The ref is
  // updated in the same tick as every `setTranscript` call, so it never is.
  const transcriptRef = useRef<TranscriptTurn[]>([]);

  const assistantVolumeRaw = useMotionValue(0);
  const assistantVolume = useSpring(assistantVolumeRaw, { stiffness: 60, damping: 20 });

  const runEvaluation = useCallback(async () => {
    if (transcriptRef.current.length < MIN_TURNS_FOR_EVALUATION) {
      setScorecardStatus("too-short");
      return;
    }
    setScorecardStatus("waiting");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptRef.current, role, experienceLevel: level }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("[interview] evaluation request failed:", res.status, data);
        setScorecardStatus("error");
        return;
      }

      const parsed = scorecardSchema.safeParse(data);
      if (!parsed.success) {
        console.error("[interview] scorecard failed validation:", parsed.error, data);
        setScorecardStatus("error");
        return;
      }

      setScorecard(parsed.data);
      setScorecardStatus("ready");
    } catch (err) {
      console.error("[interview] evaluation request threw:", err);
      setScorecardStatus("error");
    }
  }, [role, level]);

  useEffect(() => {
    if (!configured) return;
    const vapi = getVapiClient();
    hasEndedRef.current = false;

    const handleCallStart = () => {
      hasEndedRef.current = false;
      setStatus("listening");
    };

    const handleCallEnd = () => {
      hasEndedRef.current = true;
      setStatus("ended");
      void runEvaluation();
    };

    const handleSpeechStart = () => {
      if (hasEndedRef.current) return;
      setStatus("speaking");
    };

    const handleSpeechEnd = () => {
      if (hasEndedRef.current) return;
      setStatus("listening");
    };

    const handleVolumeLevel = (level: number) => {
      assistantVolumeRaw.set(level);
    };

    const handleError = (err: unknown) => {
      console.error("[interview] Vapi error:", err);
      setErrorMessage(describeVapiError(err));
      setStatus("error");
    };

    const handleMessage = (message: unknown) => {
      const m = message as {
        type?: string;
        role?: "user" | "assistant";
        transcriptType?: string;
        transcript?: string;
      };

      if (m.type === "transcript" && m.transcriptType === "final" && m.role && m.transcript) {
        const turn: TranscriptTurn = { role: m.role, text: m.transcript };
        transcriptRef.current = [...transcriptRef.current, turn];
        setTranscript(transcriptRef.current);
      }
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("volume-level", handleVolumeLevel);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);

    return () => {
      vapi.off("call-start", handleCallStart);
      vapi.off("call-end", handleCallEnd);
      vapi.off("speech-start", handleSpeechStart);
      vapi.off("speech-end", handleSpeechEnd);
      vapi.off("volume-level", handleVolumeLevel);
      vapi.off("message", handleMessage);
      vapi.off("error", handleError);
      if (!hasEndedRef.current) vapi.stop();
    };
    // Intentionally run once per mount — Vapi handlers must not be
    // re-registered mid-call. runEvaluation is stable enough in practice
    // (only depends on role/level, fixed for the lifetime of this page).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const handleStart = useCallback(async () => {
    setErrorMessage(null);
    setStatus("connecting");
    transcriptRef.current = [];
    setTranscript([]);
    setScorecard(null);
    setScorecardStatus("idle");
    try {
      const vapi = getVapiClient();
      const assistant = buildInterviewAssistant();
      const variableValues = buildInterviewVariableValues({ role, experienceLevel: level });
      await vapi.start(assistant, { variableValues });
    } catch (err) {
      setErrorMessage(describeVapiError(err));
      setStatus("error");
    }
  }, [role, level]);

  const handleToggleMute = useCallback(() => {
    const vapi = getVapiClient();
    const next = !muted;
    vapi.setMuted(next);
    setMuted(next);
  }, [muted]);

  const handleEnd = useCallback(() => {
    const vapi = getVapiClient();
    vapi.stop();
  }, []);

  if (!configured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-white">Vapi is not configured</h1>
        <p className="mt-3 text-sm text-muted">
          Add <code className="rounded bg-surface px-1.5 py-0.5 text-cyan">NEXT_PUBLIC_VAPI_PUBLIC_KEY</code> to a{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-cyan">.env.local</code> file (see{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-cyan">.env.example</code>) and restart the dev
          server.
        </p>
        <Link href="/" className="mt-6 text-sm font-medium text-cyan hover:underline">
          ← Back to start
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm font-medium text-muted transition hover:text-white"
        >
          ← Exit
        </button>
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          {role} · {level}
        </span>
      </div>

      <div className="mt-8">
        <VoiceWaveform status={status} volume={status === "speaking" ? assistantVolume : undefined} />
      </div>

      <div className="mt-8">
        <CallControls status={status} muted={muted} onStart={handleStart} onToggleMute={handleToggleMute} onEnd={handleEnd} />
      </div>

      {errorMessage && (
        <p className="mt-6 rounded-lg border border-bad/30 bg-bad/10 px-4 py-3 text-center text-sm text-bad">
          {errorMessage}
        </p>
      )}

      {(status === "connecting" || status === "speaking" || status === "listening" || status === "ended") && (
        <div className="mt-8">
          <TranscriptPanel turns={transcript} />
        </div>
      )}

      {status === "ended" && (
        <div className="mt-8">
          {scorecardStatus === "ready" && scorecard && <Scorecard data={scorecard} />}

          {scorecardStatus === "waiting" && (
            <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-8 text-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-cyan" />
              <p className="text-sm text-muted">Generating your interview scorecard…</p>
            </div>
          )}

          {scorecardStatus === "error" && (
            <div className="rounded-card border border-warn/30 bg-warn/10 p-6 text-center">
              <p className="text-sm text-warn">
                We couldn&apos;t generate a scorecard for this interview. Your transcript above is still available —
                please try another practice interview.
              </p>
            </div>
          )}

          {scorecardStatus === "too-short" && (
            <div className="rounded-card border border-line bg-surface p-6 text-center">
              <p className="text-sm text-muted">
                That call ended too early to generate a meaningful scorecard. Try a full practice interview of at
                least a few questions.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={null}>
      <InterviewSession />
    </Suspense>
  );
}
