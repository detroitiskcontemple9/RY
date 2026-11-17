import { redirect } from "next/navigation";
import { getSessionEmail } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getSessionEmail()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-line p-6 shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-saffron-700 text-white flex items-center justify-center text-xl">ॐ</div>
        <h1 className="mt-4 text-center font-serif text-2xl font-semibold">Seva Admin</h1>
        <p className="mt-1 text-center text-sm text-muted">We&apos;ll email you a one-time sign-in link.</p>
        {sp.error === "expired" && (
          <p className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            That link has expired or was already used. Please request a new one.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
