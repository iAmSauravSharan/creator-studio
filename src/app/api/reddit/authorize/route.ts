import { NextRequest, NextResponse } from "next/server";
import { buildRedditAuthUrl } from "@/lib/reddit";

// GET /api/reddit/authorize?accountId=xxx
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });

  const url = buildRedditAuthUrl(accountId);
  return NextResponse.redirect(url);
}
