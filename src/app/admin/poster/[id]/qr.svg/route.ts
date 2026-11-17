import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionEmail } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { qrSvg } from "@/lib/qr";

export async function GET(_req: Request, ctx: RouteContext<"/admin/poster/[id]/qr.svg">) {
  if (!(await getSessionEmail())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id));
  if (!event) return new Response("Not found", { status: 404 });
  const svg = await qrSvg(`${getConfig().appUrl}/${event.slug}`, { margin: 2 });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "content-disposition": `attachment; filename="${event.slug}-qr.svg"`,
    },
  });
}
