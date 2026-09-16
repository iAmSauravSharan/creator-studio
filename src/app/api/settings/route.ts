import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/settings — always returns the one settings row, creating it with
// defaults on first call so the dashboard never has to handle "no settings yet."
export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return NextResponse.json(settings);
}

// PUT /api/settings — partial update, e.g. { weeklyUploadTarget: 5 }
export async function PUT(req: NextRequest) {
  const body = await req.json();
  delete body.id;
  delete body.updatedAt;

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: body,
    create: { id: "default", ...body },
  });
  return NextResponse.json(settings);
}
