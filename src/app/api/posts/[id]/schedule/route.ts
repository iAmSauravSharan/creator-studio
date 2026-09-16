import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "@/lib/db";
import { uploadAndSchedule } from "@/lib/youtube";
import { submitRedditPost } from "@/lib/reddit";
import { pushWeeklyDatapoint } from "@/lib/beeminder";

// POST /api/posts/:id/schedule   Body: { publishAt: ISO string }
// Branches by the post's platform. Only call after status is APPROVED.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { publishAt } = await req.json();
  const post = await prisma.post.findUnique({ where: { id: params.id }, include: { account: true } });

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.status !== "APPROVED") {
    return NextResponse.json({ error: "Post must be APPROVED before scheduling" }, { status: 400 });
  }
  if (!post.account.tokenEnvKey) {
    return NextResponse.json({ error: `${post.account.label} isn't connected yet — visit Settings to connect it.` }, { status: 400 });
  }

  try {
    if (post.platform === "youtube") {
      if (!post.finalAudioUrl || !post.thumbnailUrl) {
        return NextResponse.json({ error: "Post is missing audio or thumbnail" }, { status: 400 });
      }
      const audioPath = path.join(os.tmpdir(), `${post.id}-audio.mp3`);
      fs.writeFileSync(audioPath, Buffer.from(await (await fetch(post.finalAudioUrl)).arrayBuffer()));
      const thumbPath = path.join(os.tmpdir(), `${post.id}-thumb.png`);
      fs.writeFileSync(thumbPath, Buffer.from(await (await fetch(post.thumbnailUrl)).arrayBuffer()));

      const videoId = await uploadAndSchedule({
        tokenEnvKey: post.account.tokenEnvKey,
        filePath: audioPath,
        title: post.title,
        description: post.youtubeDescription ?? post.lyrics,
        tags: post.youtubeTags?.split(",") ?? [],
        categoryId: post.account.youtubeCategoryId ?? "22",
        thumbnailPath: thumbPath,
        publishAt,
      });
      fs.unlinkSync(audioPath);
      fs.unlinkSync(thumbPath);

      await prisma.post.update({
        where: { id: post.id },
        data: { status: "SCHEDULED", youtubeVideoId: videoId, scheduledPublishAt: new Date(publishAt) },
      });
    } else if (post.platform === "reddit") {
      const isImmediate = new Date(publishAt).getTime() <= Date.now() + 60_000; // within a minute counts as "now"

      if (isImmediate) {
        const postId = await submitRedditPost({
          tokenEnvKey: post.account.tokenEnvKey,
          subreddit: post.redditSubreddit || post.account.redditDefaultSubreddit || "",
          title: post.title,
          bodyText: post.youtubeDescription ?? post.lyrics, // reusing the same "description" field across platforms
          flair: post.redditFlair ?? undefined,
        });
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "PUBLISHED", redditPostId: postId, scheduledPublishAt: new Date(publishAt) },
        });
      } else {
        // Reddit has no native future-scheduling — hold it here and let
        // /api/scheduler/check submit it when the time comes. Requires the
        // app to actually be running at that time — see README.
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "SCHEDULED", scheduledPublishAt: new Date(publishAt) },
        });
      }
    } else {
      return NextResponse.json(
        { error: `${post.platform} isn't wired up for direct publishing yet — use the Claude in Chrome handoff for now.` },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
    if (settings.enableBeeminder) await pushWeeklyDatapoint();

    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    return NextResponse.json(updated);
  } catch (err: any) {
    await prisma.post.update({ where: { id: post.id }, data: { status: "FAILED", errorMessage: String(err?.message ?? err) } });
    return NextResponse.json({ error: "Publishing failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
