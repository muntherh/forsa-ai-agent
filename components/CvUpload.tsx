"use client";

import { useCallback, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CvScanAnimation from "@/components/CvScanAnimation";
import { playSound } from "@/lib/sounds";

type UploadStatus = "idle" | "dragging" | "scanning" | "ready" | "error";

interface CvUploadProps {
  /** Fires with the extracted text + file name once a CV is parsed, or with (null, null) when cleared. */
  onChange: (text: string | null, fileName: string | null) => void;
}

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Minimum time the scanning animation stays on screen.
 *
 * Deliberately a FLOOR, not a delay: the extraction request runs at the same
 * time, and we wait on whichever finishes last. A fast parse (a few hundred
 * ms) still gets a full, deliberate-feeling scan; a slow one adds nothing on
 * top. Sleeping first and only then uploading would have made every slow
 * parse two seconds worse.
 */
const MIN_SCAN_MS = 2000;
const SPRING = { type: "spring", damping: 20, stiffness: 300 } as const;

export default function CvUpload({ onChange }: CvUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setFileName(null);
    setCharCount(0);
    setErrorMessage(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onChange]);

  const handleFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setStatus("error");
        setErrorMessage("Only PDF files are supported.");
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setStatus("error");
        setErrorMessage("File is too large (max 8MB).");
        return;
      }

      setStatus("scanning");
      setFileName(file.name);

      // Kick off the real work and the minimum-display timer together, then
      // settle on whichever takes longer.
      const started = Date.now();
      const holdForMinimum = async () => {
        const elapsed = Date.now() - started;
        if (elapsed < MIN_SCAN_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_SCAN_MS - elapsed));
        }
      };

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/cv-extract", { method: "POST", body: formData });
        const data = await res.json().catch(() => null);

        // The floor applies to the failure path too — otherwise a fast 400
        // makes the scan flash on and off.
        await holdForMinimum();

        if (!res.ok || !data?.text) {
          setStatus("error");
          setErrorMessage(data?.error ?? "Failed to read this PDF. Try a different file.");
          return;
        }

        setStatus("ready");
        setCharCount(data.text.length);
        // Only on a genuine success — a chime over an error would be a lie.
        playSound("chime");
        onChange(data.text as string, file.name);
      } catch (err) {
        console.error("CV upload failed:", err);
        await holdForMinimum();
        setStatus("error");
        setErrorMessage("Failed to upload the file. Check your connection and try again.");
      }
    },
    [onChange]
  );

  const isIdleOrDragging = status === "idle" || status === "dragging";

  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted dark:text-dark-muted">
        CV (optional)
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isIdleOrDragging && (
          <motion.label
            key="dropzone"
            htmlFor={inputId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={(event) => {
              event.preventDefault();
              dragCounter.current += 1;
              setStatus("dragging");
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dragCounter.current -= 1;
              if (dragCounter.current <= 0) {
                dragCounter.current = 0;
                setStatus("idle");
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              dragCounter.current = 0;
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className={`mt-2 flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center backdrop-blur-xl transition-colors ${
              status === "dragging"
                ? "border-blue bg-blue/5 shadow-[0_0_0_4px_rgba(36,112,179,0.12)] dark:border-teal-glow dark:bg-teal-glow/[0.07] dark:shadow-[0_0_30px_-4px_rgba(47,224,182,0.45)]"
                : "border-line bg-white/50 hover:border-blue hover:shadow-[0_0_0_4px_rgba(36,112,179,0.08)] dark:border-white/15 dark:bg-white/[0.02] dark:hover:border-teal-glow/60 dark:hover:shadow-[0_0_24px_-6px_rgba(47,224,182,0.35)]"
            }`}
          >
            <motion.svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              animate={status === "dragging" ? { y: -3 } : { y: 0 }}
              transition={SPRING}
              className="text-muted dark:text-dark-muted"
            >
              <path
                d="M12 15V3m0 0L7 8m5-5l5 5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
            <span className="text-sm font-semibold text-navy dark:text-dark-text">
              {status === "dragging" ? "Drop your CV here" : "Upload your CV (PDF)"}
            </span>
            <span className="text-xs text-muted dark:text-dark-muted">Ava will tailor questions to your background</span>
          </motion.label>
        )}

        {status === "scanning" && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CvScanAnimation fileName={fileName} />
          </motion.div>
        )}

        {status === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            className="mt-2 flex items-center justify-between gap-2.5 rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3 backdrop-blur-xl dark:border-teal-glow/25 dark:bg-teal-glow/[0.08]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0">
                <path
                  d="M4 12.5l5 5L20 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-teal-dark dark:text-teal-glow"
                />
              </svg>
              <span className="truncate text-sm font-medium text-teal-dark dark:text-teal-glow">{fileName}</span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex-shrink-0 text-xs font-semibold text-muted underline-offset-2 hover:text-navy hover:underline dark:text-dark-muted dark:hover:text-dark-text"
            >
              Remove
            </button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-1.5 text-xs font-semibold text-red-600 underline-offset-2 hover:underline dark:text-red-400"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-1.5 text-xs text-muted dark:text-dark-muted">
        {status === "ready" ? `${charCount.toLocaleString()} characters extracted. ` : ""}
        Skip this to start a general interview instead.
      </p>
    </div>
  );
}
