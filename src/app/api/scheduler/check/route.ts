import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submitRedditPost } from "@/lib/reddit";

// GET /api/scheduler/check
// Looks for SCHEDULED Reddit posts whose time has come and submits them.
// YouTube doesn't need this — its own servers handle publishAt natively.
// This route does nothing by itself; something needs to call it
// periodically — see scheduler.js and the README.
export async function GET() {
  const due = await prisma.post.findMany({
    where: { status: "SCHEDULED", platform: "reddit", scheduledPublishAt: { lte: new Date() } },
    include: { account: true },
  });

  const results = [];
  for (const post of due) {
    try {
      if (!post.account.tokenEnvKey) throw new Error("Account not connected");
      const postId = await submitRedditPost({
        tokenEnvKey: post.account.tokenEnvKey,
        subreddit: post.redditSubreddit || post.account.redditDefaultSubreddit || "",
        title: post.title,
        bodyText: post.youtubeDescription ?? post.lyrics,
        flair: post.redditFlair ?? undefined,
      });
      await prisma.post.update({ where: { id: post.id }, data: { status: "PUBLISHED", redditPostId: postId } });
      results.push({ id: post.id, ok: true });
    } catch (err: any) {
      await prisma.post.update({ where: { id: post.id }, data: { status: "FAILED", errorMessage: String(err?.message ?? err) } });
      results.push({ id: post.id, ok: false, error: String(err?.message ?? err) });
    }
  }

  return NextResponse.json({ checked: due.length, results });
}
