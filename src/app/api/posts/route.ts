import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const CreatePostSchema = z.object({
  accountId: z.string().min(1),
  title: z.string().min(1),
  lyrics: z.string().min(1),
  deity: z.string().optional(),
  occasion: z.string().optional(),
  stylePrompt: z.string().optional(),
  thumbnailPromptTemplateId: z.string().optional(),
  thumbnailCustomIdea: z.string().optional(),
});

// GET /api/posts — list all posts, most recent first. Pass ?accountId=... to filter.
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  const posts = await prisma.post.findMany({
    where: accountId ? { accountId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { account: true },
  });
  return NextResponse.json(posts);
}

// POST /api/posts — the "put lyrics in" step. Requires an accountId so the
// platform (and its defaults) are known from the very first step.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: parsed.data.accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const post = await prisma.post.create({
    data: { ...parsed.data, platform: account.platform },
  });
  return NextResponse.json(post, { status: 201 });
}
