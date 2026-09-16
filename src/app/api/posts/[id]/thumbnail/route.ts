import { NextRequest, NextResponse } from "next/server";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import Replicate from "replicate";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { buildThumbnailPrompt } from "@/lib/thumbnail-templates";

const TEMPLATE_DIR = path.join(process.cwd(), "assets", "thumbnail-templates");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { templateId, customIdea } = body as { templateId?: string; customIdea?: string };

  const [post, settings] = await Promise.all([
    prisma.post.findUnique({ where: { id: params.id } }),
    prisma.settings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } }),
  ]);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (settings.thumbnailMode === "ai") {
    const prompt = buildThumbnailPrompt({
      templateId: templateId ?? "temple-glow",
      customIdea: customIdea ?? "",
      deity: post.deity ?? "",
      occasion: post.occasion ?? "",
      brandColorScheme: settings.brandColorScheme,
      brandArtStyle: settings.brandArtStyle,
      nicheDescription: settings.nicheDescription,
    });

    const output: any = await replicate.run(
      (process.env.REPLICATE_IMAGE_MODEL as `${string}/${string}` | `${string}/${string}:${string}`) ??
        "black-forest-labs/flux-schnell",
      { input: { prompt, aspect_ratio: settings.thumbnailAspectRatio } }
    );
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const bg = await loadImage(await (await fetch(imageUrl)).arrayBuffer());
    ctx.drawImage(bg, 0, 0, width, height);

    await prisma.post.update({
      where: { id: post.id },
      data: { thumbnailPromptTemplateId: templateId ?? "temple-glow", thumbnailCustomIdea: customIdea ?? "" },
    });
  } else {
    const templateFile = `${(post.deity ?? "default").toLowerCase()}.png`;
    const templatePath = path.join(TEMPLATE_DIR, templateFile);
    const fallbackPath = path.join(TEMPLATE_DIR, "default.png");
    const bgPath = await fs.access(templatePath).then(() => templatePath).catch(() => fallbackPath);
    const bg = await loadImage(bgPath);
    ctx.drawImage(bg, 0, 0, width, height);
  }

  const gradient = ctx.createLinearGradient(0, height * 0.55, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  ctx.fillStyle = "#FFF7E6";
  ctx.font = `700 76px ${settings.brandFontFamily}`;
  ctx.textAlign = "center";
  wrapText(ctx, post.title, width / 2, height - 100, width - 120, 88);

  const buffer = await canvas.encode("png");
  const filename = `thumb-${post.id}.png`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/uploads/${filename}`;

  await prisma.post.update({
    where: { id: post.id },
    data: { thumbnailUrl: publicUrl, thumbnailTemplate: settings.thumbnailMode, status: "THUMBNAIL_READY" },
  });

  return NextResponse.json({ thumbnailUrl: publicUrl, mode: settings.thumbnailMode });
}

function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      lines.push(line);
      line = word + " ";
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - (lines.length - 1) * lineHeight;
  lines.forEach((l: string, i: number) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
}
