"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/constants";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const linkError = params.get("error") === "link";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold">Check your email</h1>
        <p className="mt-3 text-ink/75">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="font-display text-3xl font-bold">Log in or join</h1>
      <p className="mt-2 text-ink/75">
        Enter your email. We will send you a link, no password needed.
      </p>

      {linkError ? (
        <p role="alert" className="mt-4 rounded-xl bg-coral/15 px-4 py-3 text-sm text-coral">
          That link expired or was already used. Request a new one below.
        </p>
      ) : null}

      <label htmlFor="email" className="mt-6 block text-sm font-semibold">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field mt-1"
        placeholder="you@company.com"
      />

      {state === "error" ? (
        <p role="alert" className="mt-3 text-sm text-coral">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={state === "sending"} className="btn btn-primary mt-5 w-full">
        {state === "sending" ? "Sending link" : "Email me a link"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 font-display text-2xl font-bold">
        {BRAND}
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
