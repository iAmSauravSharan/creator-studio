import { NextRequest, NextResponse } from "next/server";
import { exchangeRedditCode } from "@/lib/reddit";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const accountId = req.nextUrl.searchParams.get("state");
  if (!code || !accountId) return NextResponse.json({ error: "Missing code or state" }, { status: 400 });

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const tokens = await exchangeRedditCode(code);
  const slug = account.label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 30);
  const envKey = `REDDIT_REFRESH_TOKEN_${slug}`;

  await prisma.account.update({ where: { id: accountId }, data: { tokenEnvKey: envKey } });

  return new NextResponse(
    `<pre>Add this to your .env file, then restart the app:\n\n${envKey}="${tokens.refresh_token}"\n\nAfter that, "${account.label}" is fully connected. You can close this tab.</pre>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
