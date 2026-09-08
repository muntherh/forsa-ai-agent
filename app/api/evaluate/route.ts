import { NextRequest, NextResponse } from "next/server";
import { buildEvaluationMessages, SCORECARD_JSON_SCHEMA, scorecardSchema } from "@/lib/rubric";
import type { ExperienceLevel, InterviewRole, TranscriptTurn } from "@/lib/types";

/**
 * Runs the second GPT-4o call: turning a finished interview's transcript
 * into the structured scorecard defined by the rubric in lib/rubric.ts.
 *
 * This is deliberately a separate call from the live interview itself (the
 * live conversation is entirely Vapi's — see lib/assistant.ts). Evaluating
 * against a rubric benefits from seeing the WHOLE transcript at once and
 * from OpenAI's Structured Outputs (`response_format: json_schema`, strict
 * mode) to guarantee a shape the UI can render without guessing — neither
 * of which fits naturally into a live, turn-by-turn voice conversation.
 */

interface EvaluateRequestBody {
  transcript?: TranscriptTurn[];
  role?: InterviewRole;
  experienceLevel?: ExperienceLevel;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server. See .env.example." },
      { status: 500 }
    );
  }

  let body: EvaluateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { transcript, role, experienceLevel } = body;
  if (!Array.isArray(transcript) || transcript.length === 0 || !role || !experienceLevel) {
    return NextResponse.json(
      { error: "Request must include a non-empty transcript, role, and experienceLevel." },
      { status: 400 }
    );
  }

  const messages = buildEvaluationMessages(transcript, { role, experienceLevel });

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "interview_scorecard",
            strict: true,
            schema: SCORECARD_JSON_SCHEMA,
          },
        },
      }),
    });
  } catch (err) {
    console.error("[api/evaluate] Failed to reach OpenAI:", err);
    return NextResponse.json({ error: "Failed to reach the evaluation service." }, { status: 502 });
  }

  if (!openaiResponse.ok) {
    const errorBody = await openaiResponse.text().catch(() => "");
    console.error("[api/evaluate] OpenAI returned an error:", openaiResponse.status, errorBody);
    return NextResponse.json({ error: "The evaluation service returned an error." }, { status: 502 });
  }

  const completion = await openaiResponse.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.error("[api/evaluate] Unexpected OpenAI response shape:", completion);
    return NextResponse.json({ error: "The evaluation service returned an unexpected response." }, { status: 502 });
  }

  let scorecard: unknown;
  try {
    scorecard = JSON.parse(content);
  } catch (err) {
    console.error("[api/evaluate] Failed to parse scorecard JSON:", err, content);
    return NextResponse.json({ error: "Failed to parse the scorecard response." }, { status: 502 });
  }

  const parsed = scorecardSchema.safeParse(scorecard);
  if (!parsed.success) {
    console.error("[api/evaluate] Scorecard failed schema validation:", parsed.error, scorecard);
    return NextResponse.json({ error: "The scorecard response did not match the expected shape." }, { status: 502 });
  }

  return NextResponse.json(parsed.data);
}
