"use client";

import { useActionState } from "react";
import { addAdmin, type ActionState } from "../../actions";
import { btnCls, inputCls } from "@/components/admin";

export function AddAdminForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAdmin, undefined);
  return (
    <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input name="email" type="email" required placeholder="email@example.com" className={inputCls} />
      <input name="name" placeholder="Name (optional)" className={inputCls} />
      <button disabled={pending} className={btnCls}>Add</button>
      {state?.error && <p className="text-xs text-red-700 sm:col-span-3">{state.error}</p>}
      {state?.ok && <p className="text-xs text-green-700 sm:col-span-3">{state.ok}</p>}
    </form>
  );
}
