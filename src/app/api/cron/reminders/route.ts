import { timingSafeEqual } from "@/lib/crypto";
import { runPledgeReminders } from "@/lib/reminders";

// Called daily by the Cloudflare cron trigger (see worker.ts).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(auth, `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await runPledgeReminders();
  return Response.json(result);
}
