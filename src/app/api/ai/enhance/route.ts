import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// POST /api/ai/enhance
// Body: { field: "title"|"description"|"lyrics"|"style", currentText: string,
//         context: { deity?, occasion?, platform? } }
// Returns: { rewritten: string, chips: string[] }
//
// Runs through Claude Code's headless mode (`claude -p`), authenticated as
// YOUR Claude subscription via CLAUDE_CODE_OAUTH_TOKEN — not the metered
// Anthropic API. As of Anthropic's paused June 2026 billing change, this
// still counts as normal subscription usage. See README "AI enhance setup"
// for the one-time CLI install/token steps and — importantly — how to
// verify it's actually landing on your plan and not silently billing.
// Anthropic has changed this policy with roughly a month's notice before;
// re-check the README note if this ever starts showing real spend.
//
// --max-budget-usd is a hard per-call ceiling, kept in even though this
// should draw from your subscription — it's a cheap safety net if that
// policy ever reverts without you noticing immediately.

const FIELD_PROMPTS: Record<string, string> = {
  title: "Rewrite this title to be more search-friendly and devotional in tone. Keep it under 60 characters. Use Devanagari for the Hindi/Sanskrit portion where natural, paired with a transliteration. Preserve the actual meaning — don't invent content that isn't there.",
  description: "Rewrite this description to be warmer and more devotional in tone, keep the factual content accurate, and make the first two lines work well as a feed preview. Don't invent facts not present in the original.",
  lyrics: "Check this text for spelling and meter issues against standard published editions, if you recognize the source. Only correct clear errors — don't paraphrase or alter meaning. If you're not confident about a correction, leave that portion unchanged.",
  style: "Refine this music style/instrumentation prompt to be more specific and evocative for an AI music generator — tempo, specific instruments, vocal style, mood. Keep it concise, don't pad with filler.",
};

export async function POST(req: NextRequest) {
  const { field, currentText, context } = await req.json();

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return NextResponse.json(
      { error: "CLAUDE_CODE_OAUTH_TOKEN is not set in .env — run `claude setup-token` and paste the result. See README \"AI enhance setup\"." },
      { status: 400 }
    );
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

  try {
    // execFile with an argument array (not a shell string) so currentText —
    // arbitrary user-typed content — can never be interpreted as shell syntax.
    const { stdout } = await execFileAsync(
      "claude",
      [
        "-p", currentText,
        "--append-system-prompt", systemPrompt,
        "--output-format", "json",
        "--max-turns", "1",          // pure text rewrite, no tool-use loop needed
        "--allowedTools", "",        // no filesystem/bash access needed for this task
        "--max-budget-usd", "0.50",  // hard ceiling — see file header
      ],
      {
        env: process.env,
        timeout: 60_000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );

    // The --output-format json envelope's exact shape has shifted across
    // Claude Code versions (result vs a messages array). Handle both rather
    // than assume one — cheaper than re-verifying on every release.
    const envelope = JSON.parse(stdout);
    const text: string = envelope.result ?? envelope.messages?.at(-1)?.content ?? "";

    const cleaned = text.trim().replace(/^```json\s*|```$/g, "");
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ rewritten: parsed.rewritten ?? currentText, chips: parsed.chips ?? [] });
  } catch (err: any) {
    const hint = /command not found|ENOENT/.test(String(err?.message))
      ? " (Is the Claude Code CLI installed? npm install -g @anthropic-ai/claude-code)"
      : "";
    return NextResponse.json({ error: `AI enhance failed: ${err?.message ?? err}${hint}` }, { status: 500 });
  }
}
