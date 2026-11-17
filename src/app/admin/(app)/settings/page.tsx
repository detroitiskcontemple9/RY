import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { bootstrapAdminEmails, getConfig } from "@/lib/config";
import { Card, PageHeader } from "@/components/admin";
import { removeAdmin } from "../../actions";
import { AddAdminForm } from "./AddAdminForm";

export default async function SettingsPage() {
  const me = await requireAdmin();
  const db = await getDb();
  const admins = await db.select().from(schema.admins).orderBy(asc(schema.admins.email));
  const bootstrap = bootstrapAdminEmails();
  const cfg = getConfig();

  const checks: [string, boolean, string][] = [
    ["Database (Neon)", Boolean(process.env.DATABASE_URL), "DATABASE_URL secret"],
    ["Stripe payments", Boolean(process.env.STRIPE_SECRET_KEY), "STRIPE_SECRET_KEY secret"],
    ["Stripe webhook", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "STRIPE_WEBHOOK_SECRET secret"],
    ["Email (Resend)", Boolean(process.env.RESEND_API_KEY), "RESEND_API_KEY secret"],
    ["Session security", Boolean(process.env.SESSION_SECRET), "SESSION_SECRET secret"],
    ["Pledge reminder job", Boolean(process.env.CRON_SECRET), "CRON_SECRET secret"],
    ["Temple EIN", cfg.orgEin !== "00-0000000", "ORG_EIN variable"],
  ];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card className="p-5">
          <h2 className="font-semibold">Admins</h2>
          <p className="text-sm text-muted">These people can sign in with an emailed link.</p>
          <ul className="mt-4 divide-y divide-line text-sm">
            {bootstrap.map((e) => (
              <li key={e} className="py-2 flex justify-between">
                <span>{e}</span>
                <span className="text-xs text-muted">owner (ADMIN_EMAILS)</span>
              </li>
            ))}
            {admins.map((a) => (
              <li key={a.email} className="py-2 flex justify-between items-center">
                <span>
                  {a.email}
                  {a.name && <span className="text-muted"> · {a.name}</span>}
                </span>
                {a.email !== me && (
                  <form action={removeAdmin}>
                    <input type="hidden" name="email" value={a.email} />
                    <button className="text-xs text-red-700 hover:underline">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <AddAdminForm />
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Setup status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {checks.map(([label, ok, hint]) => (
              <li key={label} className="flex items-center justify-between gap-2">
                <span>{ok ? "✅" : "⚠️"} {label}</span>
                {!ok && <span className="text-xs text-muted">set {hint}</span>}
              </li>
            ))}
          </ul>
          <h3 className="font-semibold mt-6">Receipt details</h3>
          <dl className="mt-2 text-sm grid grid-cols-[130px_1fr] gap-y-1">
            <dt className="text-muted">Legal name</dt><dd>{cfg.orgLegalName}</dd>
            <dt className="text-muted">EIN</dt><dd>{cfg.orgEin}</dd>
            <dt className="text-muted">Address</dt><dd>{cfg.orgAddress || "—"}</dd>
            <dt className="text-muted">Zelle</dt><dd>{cfg.zelleRecipient || "—"}</dd>
            <dt className="text-muted">Emails from</dt><dd className="break-all">{cfg.emailFrom}</dd>
            <dt className="text-muted">Fee estimate</dt><dd>{cfg.feePercent}% + {cfg.feeFixedCents}¢</dd>
          </dl>
          <p className="mt-3 text-xs text-muted">These are set in wrangler.jsonc (vars). See the README.</p>
        </Card>
      </div>
    </>
  );
}
