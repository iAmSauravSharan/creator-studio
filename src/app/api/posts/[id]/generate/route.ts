import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { prisma } from "@/lib/db";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Optional/legacy path — only relevant if you self-host a song generator
// instead of using Suno directly. Not part of the default flow.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  await prisma.post.update({ where: { id: post.id }, data: { status: "GENERATING" } });

  try {
    const prediction = await replicate.predictions.create({
      version: process.env.REPLICATE_MUSIC_MODEL!.split(":")[1],
      input: {
        lyrics: post.lyrics,
        tags: post.stylePrompt ?? "devotional, bhajan, harmonium, tabla, warm reverent vocals, hindi",
      },
      webhook: `${process.env.NEXT_PUBLIC_BASE_URL}/api/posts/${post.id}/webhook`,
      webhook_events_filter: ["completed"],
    });

    await prisma.post.update({ where: { id: post.id }, data: { replicatePredictionId: prediction.id } });
    return NextResponse.json({ predictionId: prediction.id, status: "GENERATING" });
  } catch (err: any) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "FAILED", errorMessage: String(err?.message ?? err) },
    });
    return NextResponse.json({ error: "Generation failed to start" }, { status: 500 });
  }
}
