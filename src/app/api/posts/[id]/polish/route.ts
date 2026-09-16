import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const [post, settings] = await Promise.all([
    prisma.post.findUnique({ where: { id: params.id } }),
    prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
  ]);

  if (!settings.enableKitsAiPolish) {
    return NextResponse.json(
      { error: "Voice polish is turned off in Settings — enable it there first." },
      { status: 400 }
    );
  }
  if (!post?.rawAudioUrl) {
    return NextResponse.json({ error: "No generated audio to polish yet" }, { status: 400 });
  }

  await prisma.post.update({ where: { id: post.id }, data: { status: "POLISHING" } });

  const audioRes = await fetch(post.rawAudioUrl);
  const audioBlob = await audioRes.blob();

  const form = new FormData();
  form.append("voiceModelId", process.env.KITS_AI_VOICE_MODEL_ID!);
  form.append("soundFile", audioBlob, "input.wav");

  const kitsRes = await fetch("https://arpeggi.io/api/kits/v1/voice-conversions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.KITS_AI_API_KEY}` },
    body: form,
  });

  if (!kitsRes.ok) {
    const errText = await kitsRes.text();
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "FAILED", errorMessage: `Kits.ai error: ${errText}` },
    });
    return NextResponse.json({ error: "Voice polish failed" }, { status: 500 });
  }

  const job = await kitsRes.json();
  await prisma.post.update({
    where: { id: post.id },
    data: { errorMessage: `kits_job:${job.id}` },
  });

  return NextResponse.json({ jobId: job.id, status: "POLISHING" });
}
