"use client";

import { useActionState, useState } from "react";
import type { Event } from "@/db/schema";
import { saveEvent, type ActionState } from "../../actions";
import { Field, btnCls, inputCls } from "@/components/admin";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function EventForm({ event, appUrl }: { event?: Event; appUrl: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveEvent, undefined);
  const [title, setTitle] = useState(event?.title ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const host = appUrl.replace(/^https?:\/\//, "");

  return (
    <form action={action} className="space-y-4">
      {event && <input type="hidden" name="id" value={event.id} />}
      <Field label="Title">
        <input
          name="title"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Rath Yatra 2027"
          className={inputCls}
        />
      </Field>
      <Field label="Page link" hint="Short and easy to type — it's printed under the QR code.">
        <div className="flex items-center rounded-lg border border-line bg-white overflow-hidden focus-within:border-saffron-600">
          <span className="pl-3 text-sm text-muted whitespace-nowrap">{host}/</span>
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="rathyatra"
            className="flex-1 min-w-0 px-1 py-2 outline-none"
          />
        </div>
      </Field>
      <Field label="Tagline (optional)">
        <input name="tagline" defaultValue={event?.tagline ?? ""} placeholder="Pull the chariot of Lord Jagannath" className={inputCls} />
      </Field>
      <Field label="Description" hint="Tell devotees what their seva supports. Leave a blank line between paragraphs.">
        <textarea name="description" rows={6} defaultValue={event?.description ?? ""} className={inputCls} />
      </Field>
      <Field label="Banner image link (optional)" hint="Paste a https:// image link. Wide images (3:1) look best.">
        <input name="imageUrl" type="url" defaultValue={event?.imageUrl ?? ""} placeholder="https://…" className={inputCls} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Fundraising goal ($, optional)">
          <input name="goal" inputMode="decimal" defaultValue={event?.goalCents ? String(event.goalCents / 100) : ""} placeholder="25000" className={inputCls} />
        </Field>
        <Field label="Festival date (optional)">
          <input name="eventDate" type="date" defaultValue={event?.eventDate ?? ""} className={inputCls} />
        </Field>
      </div>
      <Field label="Suggested amounts ($)" hint="Up to 6, separated by commas.">
        <input name="presetAmounts" defaultValue={(event?.presetAmounts ?? [51, 101, 251, 501, 1001]).join(", ")} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="allowPledges" defaultChecked={event?.allowPledges ?? true} className="h-4 w-4 accent-saffron-700" />
        Allow pledges (pay later, with email reminders)
      </label>
      <Field label="Status">
        <select name="status" defaultValue={event?.status ?? "draft"} className={inputCls}>
          <option value="draft">Draft — hidden from the public</option>
          <option value="published">Published — live and accepting donations</option>
          <option value="closed">Closed — visible, not accepting donations</option>
        </select>
      </Field>
      {state?.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
      <button disabled={pending} className={btnCls}>
        {pending ? "Saving…" : event ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}
