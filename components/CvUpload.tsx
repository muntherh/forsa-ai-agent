"use client";

import { useCallback, useId, useRef, useState } from "react";

type UploadStatus = "idle" | "uploading" | "ready" | "error";

interface CvUploadProps {
  /** Fires with the extracted text + file name once a CV is parsed, or with (null, null) when cleared. */
  onChange: (text: string | null, fileName: string | null) => void;
}

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export default function CvUpload({ onChange }: CvUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-muted">
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

      {status === "idle" && (
        <label
          htmlFor={inputId}
          className="mt-2 flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-line bg-bg px-4 py-5 text-center transition-colors hover:border-blue"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 15V3m0 0L7 8m5-5l5 5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              stroke="#5B7185"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold text-navy">Upload your CV (PDF)</span>
          <span className="text-xs text-muted">Ava will tailor questions to your background</span>
        </label>
      )}

      {status === "uploading" && (
        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-line bg-bg px-4 py-3.5">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-blue" />
          <span className="truncate text-sm text-muted">Reading {fileName}…</span>
        </div>
      )}

      {status === "ready" && (
        <div className="mt-2 flex items-center justify-between gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0">
              <path d="M4 12.5l5 5L20 6" stroke="#0F6B57" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="truncate text-sm font-medium text-teal-dark">{fileName}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex-shrink-0 text-xs font-semibold text-muted underline-offset-2 hover:text-navy hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{errorMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-1.5 text-xs font-semibold text-red-600 underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      <p className="mt-1.5 text-xs text-muted">
        {status === "ready" ? `${charCount.toLocaleString()} characters extracted. ` : ""}
        Skip this to start a general interview instead.
      </p>
    </div>
  );
}
