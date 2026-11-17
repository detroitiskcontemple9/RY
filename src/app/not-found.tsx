import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-5xl">🙏</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">This campaign may have ended or the link may be mistyped.</p>
      <Link href="/" className="mt-6 rounded-xl bg-saffron-700 px-5 py-3 font-semibold text-white">See current festivals</Link>
    </div>
  );
}
