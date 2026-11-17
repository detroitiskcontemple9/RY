"use client";

import { useActionState, useState } from "react";
import { feeToCover, formatUSD, parseDollarsToCents } from "@/lib/money";
import { submitGift, type FormState } from "./actions";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  remaining: number | null;
};

export function DonateForm(props: {
  slug: string;
  presets: number[];
  tiers: Tier[];
  allowPledges: boolean;
  feePercent: number;
  feeFixedCents: number;
  minDueDate: string;
  defaultDueDate: string;
  zelleRecipient: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitGift, undefined);
  const [mode, setMode] = useState<"donate" | "pledge">("donate");
  const [tierId, setTierId] = useState<string | null>(null);
  const [preset, setPreset] = useState<number | null>(props.presets[1] ?? props.presets[0] ?? null);
  const [custom, setCustom] = useState("");
  const [coverFees, setCoverFees] = useState(true);

  const tier = props.tiers.find((t) => t.id === tierId);
  const amountCents = tier
    ? tier.amountCents
    : custom
      ? parseDollarsToCents(custom)
      : preset != null
        ? preset * 100
        : NaN;
  const valid = Number.isFinite(amountCents) && amountCents >= 100;
  const fee = valid && coverFees && mode === "donate" ? feeToCover(amountCents, props.feePercent, props.feeFixedCents) : 0;
  const total = valid ? amountCents + fee : 0;

  return (
    <form action={action} className="rounded-2xl bg-white border border-line shadow-sm lg:sticky lg:top-20">
      <input type="hidden" name="slug" value={props.slug} />
      <input type="hidden" name="mode" value={mode} />
      {tier && <input type="hidden" name="tierId" value={tier.id} />}
      {!tier && valid && <input type="hidden" name="amount" value={(amountCents / 100).toFixed(2)} />}
      {/* Honeypot for bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {props.allowPledges && (
        <div className="grid grid-cols-2 p-1.5 m-4 mb-0 rounded-xl bg-saffron-50" role="tablist">
          {(["donate", "pledge"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === m ? "bg-white shadow text-saffron-800" : "text-muted"
              }`}
            >
              {m === "donate" ? "Give now" : "Pledge, pay later"}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-5">
        {props.tiers.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold mb-2">Sponsor a seva</legend>
            <div className="space-y-2">
              {props.tiers.map((t) => {
                const soldOut = t.remaining === 0;
                const selected = tierId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => setTierId(selected ? null : t.id)}
                    className={`w-full text-left rounded-xl border px-3.5 py-3 transition ${
                      selected
                        ? "border-saffron-600 bg-saffron-50 ring-1 ring-saffron-600"
                        : "border-line hover:border-saffron-400"
                    } ${soldOut ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{t.name}</span>
                      <span className="font-semibold text-saffron-800">{formatUSD(t.amountCents)}</span>
                    </div>
                    {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
                    {t.remaining != null && (
                      <p className="text-xs mt-1 text-saffron-700">{soldOut ? "Fully sponsored 🙏" : `${t.remaining} left`}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset disabled={!!tier} className={tier ? "opacity-40" : ""}>
          <legend className="text-sm font-semibold mb-2">{props.tiers.length ? "Or choose an amount" : "Choose an amount"}</legend>
          <div className="grid grid-cols-3 gap-2">
            {props.presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPreset(p);
                  setCustom("");
                }}
                className={`rounded-xl border py-3 font-semibold transition ${
                  !custom && preset === p && !tier
                    ? "border-saffron-600 bg-saffron-700 text-white"
                    : "border-line hover:border-saffron-400"
                }`}
              >
                ${p.toLocaleString()}
              </button>
            ))}
            <label className="col-span-3 relative block">
              <span className="sr-only">Other amount</span>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input
                inputMode="decimal"
                placeholder="Other amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className={`w-full rounded-xl border py-3 pl-7 pr-3 outline-none focus:border-saffron-600 ${
                  custom ? "border-saffron-600" : "border-line"
                }`}
              />
            </label>
          </div>
        </fieldset>

        <div className="space-y-3">
          <Field name="name" label="Full name" autoComplete="name" required />
          <Field name="email" label="Email (for your receipt)" type="email" autoComplete="email" required />
          <Field name="phone" label="Phone (optional)" type="tel" autoComplete="tel" />
          {mode === "donate" ? (
            <Field name="dedication" label="In honor / memory of (optional)" placeholder="e.g. In memory of my grandmother" />
          ) : (
            <label className="block">
              <span className="text-sm font-medium">I will pay by</span>
              <input
                type="date"
                name="dueDate"
                required
                min={props.minDueDate}
                defaultValue={props.defaultDueDate}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-saffron-600"
              />
              <span className="text-xs text-muted">We&apos;ll email you a reminder with a link to pay.</span>
            </label>
          )}
        </div>

        {mode === "donate" && (
          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-xl bg-saffron-50 p-3 cursor-pointer">
              <input
                type="checkbox"
                name="coverFees"
                checked={coverFees}
                onChange={(e) => setCoverFees(e.target.checked)}
                className="mt-1 h-4 w-4 accent-saffron-700"
              />
              <span className="text-sm">
                Add {valid ? <b>{formatUSD(feeToCover(amountCents, props.feePercent, props.feeFixedCents), { cents: true })}</b> : "a little"} to
                cover card fees, so 100% of my gift reaches the temple.{" "}
                <span className="text-muted">Optional.</span>
              </span>
            </label>
            <label className="flex items-center gap-3 px-3 text-sm text-muted cursor-pointer">
              <input type="checkbox" name="anonymous" className="h-4 w-4 accent-saffron-700" />
              Keep my name private on public lists
            </label>
          </div>
        )}

        {state?.error && (
          <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || pending}
          className="w-full rounded-xl bg-saffron-700 py-3.5 text-white font-semibold text-lg shadow-sm hover:bg-saffron-800 disabled:opacity-50 transition"
        >
          {pending
            ? "Please wait…"
            : mode === "donate"
              ? valid
                ? `Donate ${formatUSD(total, { cents: total % 100 !== 0 })}`
                : "Donate"
              : valid
                ? `Pledge ${formatUSD(amountCents)}`
                : "Pledge"}
        </button>

        {mode === "donate" ? (
          <p className="text-center text-xs text-muted">
            Next: pay with Apple Pay, Google Pay, card, or bank account (lowest fees).
          </p>
        ) : (
          <p className="text-center text-xs text-muted">No payment now. Pay any time before your date.</p>
        )}

        {props.zelleRecipient && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer text-center">Prefer Zelle?</summary>
            <p className="mt-2 text-center">
              Send to <b className="text-ink">{props.zelleRecipient}</b> and put your name and the festival in the memo.
            </p>
          </details>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-saffron-600"
      />
    </label>
  );
}
