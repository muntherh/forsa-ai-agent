import "@/lib/pdf-node-polyfills"; // must run before pdf-parse is imported
import { PDFParse } from "pdf-parse";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extracts plain text from an uploaded CV (PDF only). No auth, no database
 * write — this route only turns a file into text so the landing page can
 * hand it to the interview as context. The candidate's browser is the only
 * place the file itself is ever stored; nothing is persisted server-side.
 *
 * Text is capped (see MAX_TEXT_CHARS) before being returned — a CV is a
 * one-to-two page document, so anything wildly longer than that is either
 * a parsing artifact or a file that isn't really a CV, and either way isn't
 * worth passing untruncated into a Claude prompt.
 */

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — generous for a CV, small enough to stay well under typical platform request-size limits
const MAX_TEXT_CHARS = 20000;

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Request must include a 'file' field." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: buffer });
    // pageJoiner defaults to inserting a "-- page_number of total_number --"
    // marker between pages (confirmed by reading the actual extracted
    // output, not guessed) — harmless for a human reading a PDF viewer's
    // page count, but pure noise once this text is fed into a Vapi variable
    // or a Claude prompt. A plain newline still separates pages.
    const result = await parser.getText({ pageJoiner: "\n" });
    const text = result.text.trim();

    if (!text) {
      return NextResponse.json(
        { error: "No text could be extracted from this PDF — it may be a scanned image without a text layer." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: text.slice(0, MAX_TEXT_CHARS) });
  } catch (err) {
    console.error("[api/cv-extract] Failed to parse PDF:", err);
    return NextResponse.json({ error: "Failed to read this PDF. Try a different file." }, { status: 400 });
  } finally {
    await parser?.destroy();
  }
}
