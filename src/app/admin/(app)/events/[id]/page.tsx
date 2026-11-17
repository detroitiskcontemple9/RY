import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getConfig } from "@/lib/config";
import { qrSvg } from "@/lib/qr";
import { Card, PageHeader, btnSecondaryCls } from "@/components/admin";
import { EventForm } from "../EventForm";
import { TierEditor } from "./TierEditor";
import { CopyButton } from "./CopyButton";
import { deleteEvent } from "../../../actions";

export default async function EditEventPage({ params, searchParams }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id));
  if (!event) notFound();
  const tiers = await db
    .select()
    .from(schema.sevaTiers)
    .where(eq(schema.sevaTiers.eventId, id))
    .orderBy(asc(schema.sevaTiers.sortOrder));
  const cfg = getConfig();
  const url = `${cfg.appUrl}/${event.slug}`;
  const qr = await qrSvg(url);

  return (
    <>
      <PageHeader title={event.title}>
        <Link href={`/${event.slug}`} target="_blank" className={btnSecondaryCls}>View page ↗</Link>
      </PageHeader>
      {sp.created && (
        <p className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          Event created. Add seva options below, then set the status to Published when you&apos;re ready.
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold mb-4">Details</h2>
            <EventForm event={event} appUrl={cfg.appUrl} />
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Seva options</h2>
            <p className="text-sm text-muted mb-4">
              Fixed-amount sponsorships shown above the amount buttons, e.g. &ldquo;Feast Sponsor — $501&rdquo;. Optional.
            </p>
            <TierEditor
              eventId={event.id}
              tiers={tiers.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                amount: String(t.amountCents / 100),
                quantityLimit: t.quantityLimit ? String(t.quantityLimit) : "",
                sortOrder: String(t.sortOrder),
              }))}
            />
          </Card>
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <button className="text-sm text-red-700 hover:underline">
              Delete event (events with donations are closed instead, to keep records)
            </button>
          </form>
        </div>

        <Card className="p-5 lg:sticky lg:top-6">
          <h2 className="font-semibold">Share</h2>
          <div className="mt-3 rounded-lg border border-line p-3 bg-white" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-3 text-sm break-all font-medium">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={url} />
            <Link href={`/admin/poster/${event.id}`} target="_blank" className={btnSecondaryCls}>Print QR poster</Link>
            <a href={`/admin/poster/${event.id}/qr.svg`} download={`${event.slug}-qr.svg`} className={btnSecondaryCls}>Download QR</a>
          </div>
          {event.status !== "published" && (
            <p className="mt-3 text-xs text-saffron-800 bg-saffron-50 rounded p-2">
              This event is {event.status}. Publish it before sharing the link.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
