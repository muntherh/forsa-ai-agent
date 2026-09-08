import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextRequest, NextResponse } from "next/server";
import { buildEvaluationSystemPrompt, buildEvaluationUserContent, scorecardSchema } from "@/lib/rubric";
import type { ExperienceLevel, InterviewRole, TranscriptTurn } from "@/lib/types";

/**
 * Runs the second Claude call: turning a finished interview's transcript
 * into the structured scorecard defined by the rubric in lib/rubric.ts.
 *
 * This is deliberately a separate call from the live interview itself (the
 * live conversation is entirely Vapi's — see lib/assistant.ts). Evaluating
 * against a rubric benefits from seeing the WHOLE transcript at once and
 * from Claude's Structured Outputs (`output_config.format`, via
 * `client.messages.parse()`) to guarantee a shape the UI can render without
 * guessing — neither of which fits naturally into a live, turn-by-turn
 * voice conversation.
 *
 * Model: `claude-sonnet-5` — Claude 3.5 Sonnet (the model originally
 * requested here) was retired on 2025-10-28 and returns a 404 from the API;
 * `claude-sonnet-5` is Anthropic's documented drop-in replacement for every
 * retired Sonnet 3.x snapshot, so it's used instead. `temperature` is
 * intentionally omitted: current-generation Sonnet rejects a non-default
 * sampling parameter with a 400, so the model is steered by the prompt
 * alone rather than a temperature setting.
 */

interface EvaluateRequestBody {
  transcript?: TranscriptTurn[];
  role?: InterviewRole;
  experienceLevel?: ExperienceLevel;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server. See .env.example." },
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

  const anthropic = new Anthropic({ apiKey });

  let response;
  try {
    response = await anthropic.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      system: buildEvaluationSystemPrompt(),
      messages: [{ role: "user", content: buildEvaluationUserContent(transcript, { role, experienceLevel }) }],
      output_config: {
        effort: "medium",
        format: zodOutputFormat(scorecardSchema),
      },
    });
  } catch (err) {
    // Most-specific-first: distinguishes retryable (rate limit, 5xx) from
    // non-retryable (bad request, auth, malformed structured output)
    // failures rather than one broad catch. Note that a structured-output
    // schema mismatch throws a plain AnthropicError (not an APIError) from
    // inside zodOutputFormat's own parse() — see its source — so that case
    // is handled separately from the HTTP-level APIError branch below.
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[api/evaluate] Anthropic authentication failed:", err.message);
      return NextResponse.json({ error: "The evaluation service rejected the configured API key." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      console.error("[api/evaluate] Anthropic rate limited:", err.message);
      return NextResponse.json({ error: "The evaluation service is rate limited. Please try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[api/evaluate] Anthropic API error:", err.status, err.message);
      return NextResponse.json({ error: "The evaluation service returned an error." }, { status: 502 });
    }
    if (err instanceof Anthropic.AnthropicError) {
      console.error("[api/evaluate] Structured output did not match the expected shape:", err.message);
      return NextResponse.json({ error: "The evaluation service returned a response that didn't match the expected shape." }, { status: 502 });
    }
    console.error("[api/evaluate] Failed to reach Anthropic:", err);
    return NextResponse.json({ error: "Failed to reach the evaluation service." }, { status: 502 });
  }

  // Reached only when the response carried no text block at all (e.g. a
  // pure refusal with empty content) — a schema mismatch on an actual text
  // block throws instead, and is handled in the catch above.
  if (!response.parsed_output) {
    console.error("[api/evaluate] No structured output in response. stop_reason:", response.stop_reason);
    return NextResponse.json({ error: "The evaluation service returned an unexpected response." }, { status: 502 });
  }

  return NextResponse.json(response.parsed_output);
}
