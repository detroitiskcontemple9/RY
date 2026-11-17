import Link from "next/link";
import { getConfig } from "@/lib/config";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const cfg = getConfig();
  return (
    <>
      <header className="bg-white/80 backdrop-blur border-b border-line sticky top-0 z-10 no-print">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold text-saffron-800">
            <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-saffron-700 text-white text-sm">
              ॐ
            </span>
            {cfg.orgName} Seva
          </Link>
          {cfg.orgWebsite && (
            <a href={cfg.orgWebsite} className="text-sm text-muted hover:text-saffron-700">
              Temple website
            </a>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-white text-xs text-muted no-print">
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-1">
          <p>
            {cfg.orgLegalName} is a 501(c)(3) nonprofit · EIN {cfg.orgEin}. Donations are tax-deductible to the extent
            allowed by law.
          </p>
          {cfg.orgAddress && <p>{cfg.orgAddress}</p>}
          <p>Payments are processed securely by Stripe. We never see or store your card details.</p>
        </div>
      </footer>
    </>
  );
}
