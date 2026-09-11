"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import CallControls from "@/components/CallControls";
import GeometricBackground from "@/components/GeometricBackground";
import TranscriptPanel from "@/components/TranscriptPanel";
import VoiceWaveform from "@/components/VoiceWaveform";
import { buildInterviewAssistant, buildInterviewVariableValues } from "@/lib/assistant";
import {
  createInterviewFlowState,
  noteAssistantSpeechEnd,
  noteAssistantSpeechStart,
  noteCandidateAudio,
  noteMuteChange,
  nextReassurance,
  MUTE_CONTEXT_NOTICE,
  UNMUTE_CONTEXT_NOTICE,
  type InterviewFlowState,
} from "@/lib/interview-flow";
import { clearInterviewSetup, loadInterviewSetup, savePendingEvaluation } from "@/lib/interview-session";
import { getVapiClient, isVapiConfigured } from "@/lib/vapi-client";
import type { CallStatus, TranscriptTurn } from "@/lib/types";

// Fallback only for the (unsupported) case of navigating straight to
// /interview without going through /setup — there is no sessionStorage
// payload to read in that case.
const DEFAULT_ROLE = "Software Engineer";
const DEFAULT_LEVEL = "Mid-Level";

// A real interview needs at least this many turns before an evaluation is
// meaningful — guards against scoring a call that ended in the first few
// seconds (e.g. the candidate hung up immediately).
const MIN_TURNS_FOR_EVALUATION = 2;

// How often the silence coach is evaluated. One second is far finer than the
// 10s threshold it guards, so the prompt never lands noticeably late, and the
// work per tick is a handful of numeric comparisons.
const FLOW_TICK_MS = 1000;

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

export default function InterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [level, setLevel] = useState(DEFAULT_LEVEL);

  const [configured] = useState(isVapiConfigured());
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [tooShort, setTooShort] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  const hasEndedRef = useRef(false);
  // Authoritative transcript for the handoff: call-end fires a closure
  // captured when the effect below was registered, so it cannot read the
  // live `transcript` state without going stale. The ref is updated in the
  // same tick as every `setTranscript` call, so it never is.
  const transcriptRef = useRef<TranscriptTurn[]>([]);
  // The setup is read once on mount and kept in refs so the call-end handler
  // — which is registered once and never re-registered mid-call — can still
  // hand the full configuration on to /evaluating.
  const cvTextRef = useRef<string | null>(null);
  const cvFileNameRef = useRef<string | null>(null);
  const roleRef = useRef(DEFAULT_ROLE);
  const levelRef = useRef(DEFAULT_LEVEL);
  // Set once vapi.start() resolves with the call's own id — used only as
  // the server-side transcript-fallback key (see lib/vapi-server.ts).
  const callIdRef = useRef<string | null>(null);
  // Conversational-resilience state. Held in a ref, not state: it is updated
  // from Vapi event handlers and a timer many times a second, and nothing in
  // the render tree depends on it — making it state would re-render the page
  // on every microphone sample for no visual gain.
  const flowRef = useRef<InterviewFlowState>(createInterviewFlowState(0));

  // The setup payload is single-use: read it once, then clear it so a later
  // visit that doesn't go through /setup can't silently reuse a stale role
  // or CV from a previous interview.
  useEffect(() => {
    const stored = loadInterviewSetup();
    if (stored) {
      setRole(stored.role);
      setLevel(stored.experienceLevel);
      roleRef.current = stored.role;
      levelRef.current = stored.experienceLevel;
      if (stored.cvText) {
        cvTextRef.current = stored.cvText;
        cvFileNameRef.current = stored.cvFileName ?? "CV";
        setCvFileName(stored.cvFileName ?? "CV");
      }
      clearInterviewSetup();
    }
  }, []);

  const assistantVolumeRaw = useMotionValue(0);
  const assistantVolume = useSpring(assistantVolumeRaw, { stiffness: 60, damping: 20 });

  /** Hands the finished call off to /evaluating, which owns the analysis. */
  const handOffForEvaluation = useCallback(() => {
    if (transcriptRef.current.length < MIN_TURNS_FOR_EVALUATION) {
      setTooShort(true);
      return;
    }
    savePendingEvaluation({
      transcript: transcriptRef.current,
      callId: callIdRef.current ?? undefined,
      role: roleRef.current,
      experienceLevel: levelRef.current,
      cvText: cvTextRef.current ?? undefined,
      cvFileName: cvFileNameRef.current ?? undefined,
    });
    router.push("/evaluating");
  }, [router]);

  useEffect(() => {
    if (!configured) return;
    const vapi = getVapiClient();
    hasEndedRef.current = false;

    const handleCallStart = () => {
      hasEndedRef.current = false;
      flowRef.current = createInterviewFlowState(Date.now());
      setStatus("listening");
    };

    const handleCallEnd = () => {
      hasEndedRef.current = true;
      setStatus("ended");
      handOffForEvaluation();
    };

    const handleSpeechStart = () => {
      if (hasEndedRef.current) return;
      flowRef.current = noteAssistantSpeechStart(flowRef.current, Date.now());
      setStatus("speaking");
    };

    const handleSpeechEnd = () => {
      if (hasEndedRef.current) return;
      // The agent has stopped: the candidate's turn starts now, and the
      // silence clock starts with it.
      flowRef.current = noteAssistantSpeechEnd(flowRef.current, Date.now());
      setStatus("listening");
    };

    const handleVolumeLevel = (level: number) => {
      assistantVolumeRaw.set(level);
    };

    // The candidate's OWN microphone level, which is what tells us whether a
    // silence is real. `volume-level` above is the assistant's output and would
    // reset the clock every time Ava spoke.
    const handleLocalVolumeLevel = (level: number) => {
      if (hasEndedRef.current) return;
      flowRef.current = noteCandidateAudio(flowRef.current, level, Date.now());
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
    vapi.on("local-volume-level", handleLocalVolumeLevel);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);

    // The silence coach. Everything it decides lives in lib/interview-flow.ts;
    // this timer only asks "is anything due?" and delivers the line.
    const flowTimer = window.setInterval(() => {
      if (hasEndedRef.current) return;
      const due = nextReassurance(flowRef.current, Date.now());
      if (!due) return;
      flowRef.current = due.state;
      try {
        // `interruptionsEnabled` matters: the candidate finding their words
        // mid-reassurance must be able to talk straight over it.
        vapi.send({ type: "say", message: due.line, interruptionsEnabled: true });
      } catch (err) {
        // A send can race the call ending. Never surface this to the
        // candidate — a failed reassurance is not a failed interview.
        console.warn("[interview] reassurance not delivered:", err);
      }
    }, FLOW_TICK_MS);

    return () => {
      window.clearInterval(flowTimer);
      vapi.off("call-start", handleCallStart);
      vapi.off("call-end", handleCallEnd);
      vapi.off("speech-start", handleSpeechStart);
      vapi.off("speech-end", handleSpeechEnd);
      vapi.off("volume-level", handleVolumeLevel);
      vapi.off("local-volume-level", handleLocalVolumeLevel);
      vapi.off("message", handleMessage);
      vapi.off("error", handleError);
      if (!hasEndedRef.current) vapi.stop();
    };
    // Intentionally registered once per mount — Vapi handlers must not be
    // re-registered mid-call. handOffForEvaluation only closes over refs and
    // a stable router, so it never goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const handleStart = useCallback(async () => {
    setErrorMessage(null);
    setTooShort(false);
    setStatus("connecting");
    transcriptRef.current = [];
    setTranscript([]);
    callIdRef.current = null;
    try {
      const vapi = getVapiClient();
      const assistant = buildInterviewAssistant();
      const variableValues = buildInterviewVariableValues({
        role: roleRef.current,
        experienceLevel: levelRef.current,
        cvText: cvTextRef.current ?? undefined,
      });
      const call = await vapi.start(assistant, { variableValues });
      callIdRef.current = call?.id ?? null;
    } catch (err) {
      setErrorMessage(describeVapiError(err));
      setStatus("error");
    }
  }, []);

  /**
   * Smart Mute. Muting is not just a switch on the audio track — it is a
   * deliberate signal ("give me a second") that the agent otherwise has no way
   * of seeing. Alongside stopping transmission, a system turn is written into
   * the conversation so the agent knows the silence is intentional and does not
   * treat it as a non-answer, repeat itself, or move on.
   *
   * `triggerResponseEnabled: false` is the important half: the notice is
   * context, not a cue to start talking. An agent that announced "I see you have
   * muted" would defeat the entire point.
   */
  const handleToggleMute = useCallback(() => {
    const vapi = getVapiClient();
    const next = !muted;
    vapi.setMuted(next);
    setMuted(next);
    flowRef.current = noteMuteChange(flowRef.current, next, Date.now());
    try {
      vapi.send({
        type: "add-message",
        message: { role: "system", content: next ? MUTE_CONTEXT_NOTICE : UNMUTE_CONTEXT_NOTICE },
        triggerResponseEnabled: false,
      });
    } catch (err) {
      // The mute itself already succeeded; only the contextual hint was lost.
      console.warn("[interview] mute context not delivered:", err);
    }
  }, [muted]);

  /**
   * Ends the session deliberately and hands off for scoring. This is a finish,
   * not a kill: `vapi.stop()` fires `call-end`, which routes the transcript to
   * /evaluating exactly as a naturally-concluded interview does. The confirmation
   * step lives in CallControls so a mis-click during a live interview cannot
   * discard the session.
   */
  const handleFinish = useCallback(() => {
    const vapi = getVapiClient();
    vapi.stop();
  }, []);

  if (!configured) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AppHeader />
        <main className="mx-auto flex min-h-[calc(100vh-69px)] max-w-lg flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-xl font-bold text-navy dark:text-white">Vapi is not configured</h1>
          <p className="mt-3 text-sm text-muted dark:text-dark-muted">
            Add{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-blue-dark dark:bg-dark-surface dark:text-teal-glow">
              NEXT_PUBLIC_VAPI_PUBLIC_KEY
            </code>{" "}
            to a{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-blue-dark dark:bg-dark-surface dark:text-teal-glow">
              .env.local
            </code>{" "}
            file (see{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-blue-dark dark:bg-dark-surface dark:text-teal-glow">
              .env.example
            </code>
            ) and restart the dev server.
          </p>
          <Link href="/" className="mt-6 text-sm font-semibold text-blue hover:underline dark:text-teal-glow">
            ← Back to start
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GeometricBackground />
      <AppHeader
        right={
          <div className="flex items-center gap-2">
            {cvFileName && (
              <span className="hidden rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-medium text-teal-dark sm:inline-block dark:border-teal-glow/25 dark:bg-teal-glow/10 dark:text-teal-glow">
                CV attached
              </span>
            )}
            <span className="rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-dark-muted">
              {role} · {level}
            </span>
          </div>
        }
      />

      <main className="relative mx-auto flex max-w-2xl flex-col px-6 pb-24 pt-10 sm:pt-14">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-dark dark:text-teal-glow">
            Step 2 of 2 · Live session
          </span>
        </div>

        <div className="mt-6">
          <VoiceWaveform status={status} volume={status === "speaking" ? assistantVolume : undefined} />
        </div>

        <div className="mt-8">
          <CallControls
            status={status}
            muted={muted}
            onStart={handleStart}
            onToggleMute={handleToggleMute}
            onFinish={handleFinish}
          />
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        {tooShort && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="mt-6 rounded-[22px] border border-line bg-white/70 p-6 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]"
          >
            <p className="text-sm text-muted dark:text-dark-muted">
              That call ended too early to generate a meaningful scorecard. Try a full practice
              interview of at least a few questions.
            </p>
          </motion.div>
        )}

        {(status === "connecting" || status === "speaking" || status === "listening" || status === "ended") && (
          <div className="mt-8">
            <TranscriptPanel turns={transcript} />
          </div>
        )}
      </main>
    </div>
  );
}
