import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventPage } from "@/lib/events";
import { getConfig } from "@/lib/config";
import { formatDate, todayIn, addDays } from "@/lib/dates";
import { EventBanner } from "@/components/EventBanner";
import { ProgressBar } from "@/components/ProgressBar";
import { DonateForm } from "./DonateForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventPage(slug);
  if (!data || data.event.status === "draft") return {};
  const { event } = data;
  return {
    title: event.title,
    description: event.tagline ?? undefined,
    openGraph: { title: event.title, description: event.tagline ?? undefined, images: event.imageUrl ? [event.imageUrl] : undefined },
  };
}

export default async function EventPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const data = await getEventPage(slug);
  if (!data || data.event.status === "draft") notFound();
  const { event, tiers, raisedCents, donorCount } = data;
  const cfg = getConfig();
  const today = todayIn(cfg.timezone);
  const defaultDue = event.eventDate && event.eventDate > today ? event.eventDate : addDays(today, 30);

  return (
    <div className="mx-auto max-w-5xl sm:px-4 sm:py-8">
      <div className="sm:rounded-2xl overflow-hidden">
        <EventBanner imageUrl={event.imageUrl} title={event.title} className="h-48 sm:h-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] px-4 sm:px-0 -mt-6 sm:mt-6 relative">
        <div className="space-y-6 order-1">
          <div className="rounded-2xl bg-white border border-line p-5 sm:p-6 shadow-sm">
            {event.eventDate && (
              <p className="text-xs uppercase tracking-wide text-saffron-700">{formatDate(event.eventDate)}</p>
            )}
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-maroon-900">{event.title}</h1>
            {event.tagline && <p className="mt-2 text-muted">{event.tagline}</p>}
            <div className="mt-5">
              <ProgressBar raised={raisedCents} goal={event.goalCents} count={donorCount} />
            </div>
          </div>

          {event.description && (
            <div className="rounded-2xl bg-white border border-line p-5 sm:p-6 hidden lg:block">
              <Description text={event.description} />
            </div>
          )}
        </div>

        <div className="order-2 lg:row-span-2">
          {event.status === "published" ? (
            <DonateForm
              slug={event.slug}
              presets={event.presetAmounts}
              tiers={tiers.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                amountCents: t.amountCents,
                remaining: t.remaining,
              }))}
              allowPledges={event.allowPledges}
              feePercent={cfg.feePercent}
              feeFixedCents={cfg.feeFixedCents}
              minDueDate={today}
              defaultDueDate={defaultDue}
              zelleRecipient={cfg.zelleRecipient}
            />
          ) : (
            <div className="rounded-2xl bg-white border border-line p-6 text-center">
              <p className="font-semibold">This campaign is closed.</p>
              <p className="mt-1 text-sm text-muted">Thank you to everyone who offered seva. 🙏</p>
            </div>
          )}
        </div>

        {event.description && (
          <div className="rounded-2xl bg-white border border-line p-5 order-3 lg:hidden">
            <Description text={event.description} />
          </div>
        )}
      </div>
      <div className="h-10" />
    </div>
  );
}

function Description({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}
