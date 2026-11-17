"use client";

import { useActionState } from "react";
import { requestLoginLink, type LoginState } from "../../auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestLoginLink, undefined);
  if (state?.sent) {
    return (
      <div className="mt-6 text-center text-sm">
        <p className="font-medium">Check your email.</p>
        <p className="text-muted mt-1">If that address is an admin, a sign-in link is on its way.</p>
        {state.devLink && (
          <a href={state.devLink} className="mt-4 block rounded-lg bg-saffron-50 p-3 text-saffron-800 underline break-all">
            Dev mode: click to sign in
          </a>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="mt-6 space-y-3">
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="w-full rounded-xl border border-line px-3 py-2.5 outline-none focus:border-saffron-600"
      />
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-saffron-700 py-2.5 text-white font-semibold disabled:opacity-50">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
