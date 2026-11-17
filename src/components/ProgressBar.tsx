import { formatUSD } from "@/lib/money";

export function ProgressBar({ raised, goal, count }: { raised: number; goal: number | null; count?: number }) {
  const pct = goal ? Math.min(100, Math.round((raised / goal) * 100)) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p>
          <span className="text-2xl font-semibold text-saffron-800">{formatUSD(raised)}</span>
          {goal ? <span className="text-muted"> raised of {formatUSD(goal)}</span> : <span className="text-muted"> raised</span>}
        </p>
        {pct != null && <span className="text-sm font-medium text-saffron-700">{pct}%</span>}
      </div>
      {goal ? (
        <div className="mt-2 h-2.5 rounded-full bg-saffron-100 overflow-hidden" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-700" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {count != null && count > 0 && (
        <p className="mt-2 text-sm text-muted">
          {count} {count === 1 ? "devotee has" : "devotees have"} offered seva
        </p>
      )}
    </div>
  );
}
