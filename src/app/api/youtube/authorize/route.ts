import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/youtube";

// GET /api/youtube/authorize?accountId=xxx
// Visit with an accountId so the callback knows which account this token
// belongs to, and can tell you the right .env key name to use.
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });

  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"],
    state: accountId,
  });
  return NextResponse.redirect(url);
}
