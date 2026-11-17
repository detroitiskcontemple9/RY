import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { createSession, isAllowedAdmin } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const fail = NextResponse.redirect(new URL("/admin/login?error=expired", url));
  if (!token) return fail;

  const db = await getDb();
  const [row] = await db
    .update(schema.loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.loginTokens.tokenHash, await sha256(token)),
        isNull(schema.loginTokens.usedAt),
        gt(schema.loginTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row || !(await isAllowedAdmin(row.email))) return fail;

  await createSession(row.email);
  return NextResponse.redirect(new URL("/admin", url));
}
