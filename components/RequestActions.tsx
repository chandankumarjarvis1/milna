"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RequestActions({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(status: "accepted" | "declined") {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.from("connections").update({ status }).eq("id", connectionId);
    if (err) {
      setBusy(false);
      setError("Could not update the request. Try again.");
      return;
    }
    if (status === "accepted") {
      router.push(`/talk/${connectionId}`);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => respond("accepted")} className="btn btn-primary">
          Accept
        </button>
        <button type="button" disabled={busy} onClick={() => respond("declined")} className="btn btn-ghost">
          Decline
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-coral">{error}</p> : null}
    </div>
  );
}
