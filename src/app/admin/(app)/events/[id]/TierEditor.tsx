"use client";

import { useActionState } from "react";
import { deleteTier, saveTier, type ActionState } from "../../../actions";
import { btnCls, btnSecondaryCls, inputCls } from "@/components/admin";

type TierRow = {
  id: string;
  name: string;
  description: string | null;
  amount: string;
  quantityLimit: string;
  sortOrder: string;
};

export function TierEditor({ eventId, tiers }: { eventId: string; tiers: TierRow[] }) {
  return (
    <div className="space-y-3">
      {tiers.map((t) => (
        <TierForm key={t.id} eventId={eventId} tier={t} />
      ))}
      <details className="rounded-lg border border-dashed border-line p-3" open={tiers.length === 0}>
        <summary className="cursor-pointer text-sm font-medium text-saffron-700">+ Add seva option</summary>
        <div className="mt-3">
          <TierForm eventId={eventId} />
        </div>
      </details>
    </div>
  );
}

function TierForm({ eventId, tier }: { eventId: string; tier?: TierRow }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTier, undefined);
  return (
    <div className={tier ? "rounded-lg border border-line p-3" : ""}>
      <form action={action} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_70px]">
        <input type="hidden" name="eventId" value={eventId} />
        {tier && <input type="hidden" name="tierId" value={tier.id} />}
        <input name="name" required defaultValue={tier?.name} placeholder="Seva name, e.g. Feast Sponsor" className={inputCls} />
        <input name="amount" required inputMode="decimal" defaultValue={tier?.amount} placeholder="Amount $" className={inputCls} />
        <input name="quantityLimit" inputMode="numeric" defaultValue={tier?.quantityLimit} placeholder="Limit (opt.)" className={inputCls} />
        <input name="sortOrder" inputMode="numeric" defaultValue={tier?.sortOrder ?? "0"} title="Order" className={inputCls} />
        <input
          name="description"
          defaultValue={tier?.description ?? ""}
          placeholder="Short description (optional)"
          className={`${inputCls} sm:col-span-3`}
        />
        <button disabled={pending} className={btnCls}>{tier ? "Save" : "Add"}</button>
      </form>
      <div className="flex items-center gap-3 mt-1">
        {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
        {state?.ok && <span className="text-xs text-green-700">{state.ok}</span>}
        {tier && (
          <form action={deleteTier} className="ml-auto">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="tierId" value={tier.id} />
            <button className={`${btnSecondaryCls} text-red-700 text-xs`}>Remove</button>
          </form>
        )}
      </div>
    </div>
  );
}
