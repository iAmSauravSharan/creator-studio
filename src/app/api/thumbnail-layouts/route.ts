import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/thumbnail-layouts — list templates. ?includeInactive=1 to also
// see soft-deleted ones (used by the manager screen's "show inactive" toggle).
export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const layouts = await prisma.thumbnailLayout.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(layouts);
}

// POST /api/thumbnail-layouts — add a new template.
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.promptTemplate) {
    return NextResponse.json({ error: "name and promptTemplate are required" }, { status: 400 });
  }
  const layout = await prisma.thumbnailLayout.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      promptTemplate: body.promptTemplate,
    },
  });
  return NextResponse.json(layout, { status: 201 });
}
