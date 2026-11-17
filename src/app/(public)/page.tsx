import Link from "next/link";
import { listPublicEvents } from "@/lib/events";
import { EventBanner } from "@/components/EventBanner";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDate } from "@/lib/dates";
import { getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await listPublicEvents();
  const cfg = getConfig();
  const live = events.filter((e) => e.status === "published");
  const past = events.filter((e) => e.status === "closed");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-maroon-900">Offer your seva</h1>
        <p className="mt-3 text-muted">
          Support the festivals of {cfg.orgName}. Give by Apple Pay, Google Pay, card, or bank — or make a pledge and
          pay later.
        </p>
      </section>

      {live.length === 0 ? (
        <p className="mt-12 text-center text-muted">No campaigns are open right now. Please check back soon. 🙏</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {live.map((e) => (
            <Link
              key={e.id}
              href={`/${e.slug}`}
              className="group rounded-2xl bg-white border border-line overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <EventBanner imageUrl={e.imageUrl} title={e.title} className="h-44" />
              <div className="p-5">
                {e.eventDate && <p className="text-xs uppercase tracking-wide text-saffron-700">{formatDate(e.eventDate)}</p>}
                <h2 className="mt-1 font-serif text-xl font-semibold group-hover:text-saffron-700">{e.title}</h2>
                {e.tagline && <p className="mt-1 text-sm text-muted">{e.tagline}</p>}
                <div className="mt-4">
                  <ProgressBar raised={e.raisedCents} goal={e.goalCents} />
                </div>
                <span className="mt-4 inline-block rounded-lg bg-saffron-700 px-4 py-2 text-sm font-semibold text-white">
                  Donate
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="mt-14">
          <h2 className="font-serif text-xl font-semibold">Past festivals</h2>
          <ul className="mt-3 divide-y divide-line rounded-xl bg-white border border-line">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={`/${e.slug}`} className="flex justify-between px-4 py-3 text-sm hover:bg-saffron-50">
                  <span>{e.title}</span>
                  <span className="text-muted">Closed</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
