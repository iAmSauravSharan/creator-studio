import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/accounts — list all connected accounts, optionally ?platform=youtube
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const accounts = await prisma.account.findMany({
    where: platform ? { platform } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(accounts);
}

// POST /api/accounts — add a new account (not yet connected — that's a
// separate step via /api/youtube/authorize or /api/reddit/authorize).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const account = await prisma.account.create({
    data: {
      platform: body.platform,
      label: body.label,
      weeklyUploadTarget: body.weeklyUploadTarget ?? 7,
      youtubeChannelId: body.youtubeChannelId,
      youtubeCategoryId: body.youtubeCategoryId,
      redditDefaultSubreddit: body.redditDefaultSubreddit,
    },
  });
  return NextResponse.json(account, { status: 201 });
}
