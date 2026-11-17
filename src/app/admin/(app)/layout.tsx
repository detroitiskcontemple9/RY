import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../auth-actions";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-maroon-900 text-white no-print">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <Link href="/admin" className="font-serif font-semibold whitespace-nowrap">
            Seva Admin
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="hidden md:inline text-white/70">{email}</span>
            <form action={signOut}>
              <button className="rounded-md bg-white/10 px-2.5 py-1.5 hover:bg-white/20">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
