import Link from "next/link";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="font-serif text-2xl font-semibold">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white border border-line ${className}`}>{children}</div>;
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "rounded-lg bg-saffron-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-saffron-800"
          : "rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:bg-saffron-50"
      }
    >
      {children}
    </Link>
  );
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  fulfilled: "bg-green-100 text-green-800",
  published: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  open: "bg-blue-100 text-blue-800",
  pending: "bg-gray-100 text-gray-700",
  draft: "bg-gray-100 text-gray-700",
  closed: "bg-gray-100 text-gray-700",
  cancelled: "bg-gray-100 text-gray-500",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
};

export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100"}`}>
      {label ?? status}
    </span>
  );
}

export const inputCls = "w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-saffron-600 bg-white";
export const btnCls = "rounded-lg bg-saffron-700 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-800 disabled:opacity-50";
export const btnSecondaryCls = "rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-saffron-50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
