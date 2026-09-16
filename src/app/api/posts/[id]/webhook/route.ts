import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (body.status === "succeeded") {
    const audioUrl = Array.isArray(body.output) ? body.output[0] : body.output;
    await prisma.post.update({
      where: { id: params.id },
      data: { rawAudioUrl: audioUrl, finalAudioUrl: audioUrl, status: "GENERATED" },
    });
  } else if (body.status === "failed") {
    await prisma.post.update({
      where: { id: params.id },
      data: { status: "FAILED", errorMessage: body.error ?? "Generation failed" },
    });
  }

  return NextResponse.json({ ok: true });
}
