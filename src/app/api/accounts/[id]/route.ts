import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const account = await prisma.account.findUnique({ where: { id: params.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(account);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const account = await prisma.account.update({ where: { id: params.id }, data: body });
  return NextResponse.json(account);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.account.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
