"use client";

import { useCallback, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type UploadStatus = "idle" | "dragging" | "uploading" | "ready" | "error";

interface CvUploadProps {
  /** Fires with the extracted text + file name once a CV is parsed, or with (null, null) when cleared. */
  onChange: (text: string | null, fileName: string | null) => void;
}

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
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

      setStatus("uploading");
      setFileName(file.name);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/cv-extract", { method: "POST", body: formData });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.text) {
          setStatus("error");
          setErrorMessage(data?.error ?? "Failed to read this PDF. Try a different file.");
          return;
        }

        setStatus("ready");
        setCharCount(data.text.length);
        onChange(data.text as string, file.name);
      } catch (err) {
        console.error("CV upload failed:", err);
        setStatus("error");
        setErrorMessage("Failed to upload the file. Check your connection and try again.");
      }
    },
    [onChange]
  );

  const isIdleOrDragging = status === "idle" || status === "dragging";

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">
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
            className={`mt-2 flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
              status === "dragging"
                ? "border-blue bg-blue/5 shadow-[0_0_0_4px_rgba(36,112,179,0.12)] dark:border-indigo dark:bg-indigo/10 dark:shadow-[0_0_24px_rgba(99,102,241,0.35)]"
                : "border-line bg-bg hover:border-blue hover:shadow-[0_0_0_4px_rgba(36,112,179,0.08)] dark:border-dark-border dark:bg-dark-surface dark:hover:border-indigo dark:hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
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

        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-2.5 rounded-xl border border-line bg-bg px-4 py-3.5 dark:border-dark-border dark:bg-dark-surface"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-blue dark:border-dark-border dark:border-t-indigo" />
            <span className="truncate text-sm text-muted dark:text-dark-muted">Reading {fileName}…</span>
          </motion.div>
        )}

        {status === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING}
            className="mt-2 flex items-center justify-between gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-4 py-3 dark:border-emerald/30 dark:bg-emerald/10"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0">
                <path
                  d="M4 12.5l5 5L20 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-teal-dark dark:text-emerald-glow"
                />
              </svg>
              <span className="truncate text-sm font-medium text-teal-dark dark:text-emerald-glow">{fileName}</span>
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
