import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// POST /api/posts/:id/upload-audio  (multipart/form-data, field name "audio")
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) return NextResponse.json({ error: "No audio file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `audio-${post.id}${path.extname(file.name)}`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

  const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/uploads/${filename}`;

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { rawAudioUrl: publicUrl, finalAudioUrl: publicUrl, status: "GENERATED" },
  });

  return NextResponse.json(updated);
}
