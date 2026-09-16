import { NextRequest, NextResponse } from "next/server";

// POST /api/ai/enhance
// Body: { field: "title"|"description"|"lyrics"|"style", currentText: string,
//         context: { deity?, occasion?, platform? } }
// Returns: { rewritten: string, chips: string[] }
//
// Requires ANTHROPIC_API_KEY in .env — this is a paid API, billed per call,
// separate from any Claude.ai subscription. Cost is small per call (a few
// hundred tokens) but real at volume — see README for a rough estimate.

const FIELD_PROMPTS: Record<string, string> = {
  title: "Rewrite this title to be more search-friendly and devotional in tone. Keep it under 60 characters. Use Devanagari for the Hindi/Sanskrit portion where natural, paired with a transliteration. Preserve the actual meaning — don't invent content that isn't there.",
  description: "Rewrite this description to be warmer and more devotional in tone, keep the factual content accurate, and make the first two lines work well as a feed preview. Don't invent facts not present in the original.",
  lyrics: "Check this text for spelling and meter issues against standard published editions, if you recognize the source. Only correct clear errors — don't paraphrase or alter meaning. If you're not confident about a correction, leave that portion unchanged.",
  style: "Refine this music style/instrumentation prompt to be more specific and evocative for an AI music generator — tempo, specific instruments, vocal style, mood. Keep it concise, don't pad with filler.",
};

export async function POST(req: NextRequest) {
  const { field, currentText, context } = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set in .env — see README." }, { status: 400 });
  }
  if (!currentText?.trim()) {
    return NextResponse.json({ error: "Nothing to enhance yet — write something first." }, { status: 400 });
  }

  const instruction = FIELD_PROMPTS[field] ?? FIELD_PROMPTS.description;
  const contextLine = context?.deity || context?.occasion
    ? `Context: deity/theme is "${context?.deity ?? ""}", occasion is "${context?.occasion ?? ""}".`
    : "";

  const systemPrompt =
    `You help a solo creator refine devotional (Hindu, Hindi/Sanskrit) content before publishing. ` +
    `${instruction} ${contextLine} ` +
    `Respond with ONLY a JSON object, no other text: {"rewritten": "...", "chips": ["...", "...", "..."]} ` +
    `where "rewritten" is the full improved text and "chips" are 2-4 short (under 6 words each) optional ` +
    `additional tweaks the user could apply on top, phrased as actions (e.g. "add 'with Hindi meaning'").`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929", // check docs.anthropic.com/en/docs/about-claude/models for current model ids if this errors
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: currentText }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `AI enhance failed: ${errText}` }, { status: 500 });
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";

  try {
    const cleaned = text.trim().replace(/^```json\s*|```$/g, "");
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ rewritten: parsed.rewritten ?? currentText, chips: parsed.chips ?? [] });
  } catch {
    // If the model didn't return clean JSON, fall back to using the raw text as the rewrite with no chips.
    return NextResponse.json({ rewritten: text, chips: [] });
  }
}
