import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const layout = await prisma.thumbnailLayout.findUnique({ where: { id: params.id } });
  if (!layout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(layout);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const layout = await prisma.thumbnailLayout.update({ where: { id: params.id }, data: body });
  return NextResponse.json(layout);
}

// Soft delete only — unlike /api/accounts/[id], this never runs a real
// DELETE. Past posts reference a template by id, and a hard delete would
// break that history. This just flips isActive off; the row stays.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const layout = await prisma.thumbnailLayout.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json(layout);
}
