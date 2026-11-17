"use client";

import { useActionState } from "react";
import { recordManualDonation, type ActionState } from "../../../actions";
import { Field, btnCls, inputCls } from "@/components/admin";

export function ManualDonationForm({
  events,
  pledge,
}: {
  events: { id: string; title: string }[];
  pledge?: { id: string; label: string; donorName: string; donorEmail: string; donorPhone: string | null; balance: string };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordManualDonation, undefined);
  return (
    <form action={action} className="space-y-4">
      {pledge ? (
        <>
          <input type="hidden" name="pledgeId" value={pledge.id} />
          <p className="rounded-lg bg-saffron-50 p-3 text-sm">{pledge.label}</p>
        </>
      ) : (
        <Field label="Event">
          <select name="eventId" className={inputCls} defaultValue={events[0]?.id}>
            <option value="">General donation (no event)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Amount ($)">
          <input name="amount" required inputMode="decimal" defaultValue={pledge?.balance} className={inputCls} />
        </Field>
        <Field label="Method">
          <select name="method" defaultValue="zelle" className={inputCls}>
            <option value="zelle">Zelle</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="card">Card (Stripe app / Tap to Pay)</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      <Field label="Donor name">
        <input name="donorName" required defaultValue={pledge?.donorName} className={inputCls} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email (optional)">
          <input name="donorEmail" type="email" defaultValue={pledge?.donorEmail} className={inputCls} />
        </Field>
        <Field label="Phone (optional)">
          <input name="donorPhone" defaultValue={pledge?.donorPhone ?? ""} className={inputCls} />
        </Field>
      </div>
      <Field label="Note (optional)" hint="e.g. check number or Zelle confirmation">
        <input name="note" className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sendReceipt" defaultChecked className="h-4 w-4 accent-saffron-700" />
        Email a tax receipt (if email given)
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <button disabled={pending} className={btnCls}>{pending ? "Saving…" : "Record donation"}</button>
    </form>
  );
}
