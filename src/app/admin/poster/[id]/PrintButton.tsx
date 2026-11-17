"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-saffron-700 px-4 py-2 font-semibold text-white">
      Print poster
    </button>
  );
}
