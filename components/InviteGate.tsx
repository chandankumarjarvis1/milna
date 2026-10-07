"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InviteGate({ invalid }: { invalid: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(invalid ? "That code is invalid or already used up. Check it and try again." : "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data: ok } = await supabase.rpc("redeem_invite", { p_code: code });
    setBusy(false);
    if (!ok) {
      setError("That code is invalid or already used up. Check it and try again.");
      return;
    }
    router.replace("/explore");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="font-display text-3xl font-bold">One last step</h1>
      <p className="mt-2 text-ink/75">Your profile is saved. Enter your invite code to get in.</p>
      <label htmlFor="code" className="mt-6 block text-sm font-semibold">Invite code</label>
      <input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="field mt-1 tracking-wide" />
      {error ? (
        <p role="alert" className="mt-3 text-sm text-coral">{error}</p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full">
        {busy ? "Checking" : "Enter Milna"}
      </button>
    </form>
  );
}
