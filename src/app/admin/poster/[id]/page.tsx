import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { qrSvg } from "@/lib/qr";
import { formatDate } from "@/lib/dates";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "QR poster", robots: { index: false } };

// Letter-size printable poster: print it, or open on an iPad at the donation table.
export default async function PosterPage({ params }: PageProps<"/admin/poster/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id));
  if (!event) notFound();
  const cfg = getConfig();
  const url = `${cfg.appUrl}/${event.slug}`;
  const qr = await qrSvg(url, { margin: 0, color: "#3d1a10" });
  const shortUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <div className="no-print w-full bg-saffron-50 border-b border-line p-3 flex justify-center gap-3 text-sm">
        <PrintButton />
        <span className="self-center text-muted">Tip: on an iPad, open this page full-screen at the donation table.</span>
      </div>
      <div className="w-full max-w-[8.5in] flex-1 flex flex-col items-center justify-between text-center px-10 py-12 print:py-8">
        <div>
          <p className="text-saffron-700 font-semibold tracking-[0.2em] uppercase text-sm">{cfg.orgName}</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold text-maroon-900 leading-tight">{event.title}</h1>
          {event.tagline && <p className="mt-3 text-xl text-muted">{event.tagline}</p>}
          {event.eventDate && <p className="mt-2 text-lg text-saffron-800">{formatDate(event.eventDate)}</p>}
        </div>

        <div className="my-8">
          <p className="font-serif text-3xl text-maroon-900 mb-6">Scan to offer your seva</p>
          <div className="mx-auto w-[3.8in] h-[3.8in] p-4 rounded-3xl border-4 border-saffron-600" dangerouslySetInnerHTML={{ __html: qr.replace("<svg", '<svg width="100%" height="100%"') }} />
          <p className="mt-5 text-2xl font-semibold text-maroon-900">{shortUrl}</p>
        </div>

        <div>
          <div className="flex flex-wrap justify-center gap-3 text-lg">
            {["Apple Pay", "Google Pay", "Card", "Bank"].map((m) => (
              <span key={m} className="rounded-full bg-saffron-50 border border-saffron-200 px-4 py-1.5 text-saffron-800 font-medium">{m}</span>
            ))}
          </div>
          {cfg.zelleRecipient && <p className="mt-4 text-lg text-muted">Zelle: <b className="text-ink">{cfg.zelleRecipient}</b></p>}
          <p className="mt-4 text-sm text-muted">
            {cfg.orgLegalName} is a 501(c)(3) nonprofit · EIN {cfg.orgEin} · Tax receipt emailed instantly
          </p>
        </div>
      </div>
    </div>
  );
}
