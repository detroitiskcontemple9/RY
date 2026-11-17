"use client";

import { useActionState, useState } from "react";
import { feeToCover, formatUSD, parseDollarsToCents } from "@/lib/money";
import { payPledge, type FormState } from "../../[slug]/actions";

export function PayPledgeForm(props: {
  token: string;
  balanceCents: number;
  feePercent: number;
  feeFixedCents: number;
  zelleRecipient: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(payPledge, undefined);
  const [amount, setAmount] = useState((props.balanceCents / 100).toFixed(2).replace(/\.00$/, ""));
  const [coverFees, setCoverFees] = useState(true);
  const cents = parseDollarsToCents(amount);
  const valid = Number.isFinite(cents) && cents >= 100 && cents <= props.balanceCents;
  const fee = valid && coverFees ? feeToCover(cents, props.feePercent, props.feeFixedCents) : 0;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={props.token} />
      <label className="block">
        <span className="text-sm font-medium">Amount to pay now</span>
        <div className="relative mt-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-line py-3 pl-7 pr-3 text-lg outline-none focus:border-saffron-600"
          />
        </div>
        <span className="text-xs text-muted">You can pay in parts — pay the rest later with the same link.</span>
      </label>
      <label className="flex items-start gap-3 rounded-xl bg-saffron-50 p-3 cursor-pointer">
        <input
          type="checkbox"
          name="coverFees"
          checked={coverFees}
          onChange={(e) => setCoverFees(e.target.checked)}
          className="mt-1 h-4 w-4 accent-saffron-700"
        />
        <span className="text-sm">
          Add {valid ? <b>{formatUSD(feeToCover(cents, props.feePercent, props.feeFixedCents), { cents: true })}</b> : "a little"} to cover
          card fees. <span className="text-muted">Optional.</span>
        </span>
      </label>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <button
        disabled={!valid || pending}
        className="w-full rounded-xl bg-saffron-700 py-3.5 text-white font-semibold text-lg hover:bg-saffron-800 disabled:opacity-50"
      >
        {pending ? "Please wait…" : valid ? `Pay ${formatUSD(cents + fee, { cents: (cents + fee) % 100 !== 0 })}` : "Pay"}
      </button>
      <p className="text-center text-xs text-muted">Apple Pay, Google Pay, card, or bank account.</p>
      {props.zelleRecipient && (
        <p className="text-center text-xs text-muted">
          Paying by Zelle? Send to <b className="text-ink">{props.zelleRecipient}</b> with your name in the memo — the temple will
          mark it received.
        </p>
      )}
    </form>
  );
}
