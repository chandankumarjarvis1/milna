"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";

export interface BlockedPerson {
  blocked_id: string;
  name: string;
  photo_url: string | null;
}

export default function BlockedList({ meId, initial }: { meId: string; initial: BlockedPerson[] }) {
  const router = useRouter();
  const [people, setPeople] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (people.length === 0) return null;

  async function unblock(id: string) {
    setBusyId(id);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", meId)
      .eq("blocked_id", id);
    setBusyId(null);
    if (err) {
      setError("Could not unblock. Try again.");
      return;
    }
    setPeople((prev) => prev.filter((p) => p.blocked_id !== id));
    router.refresh();
  }

  return (
    <div className="mt-12">
      <h2 className="font-display text-2xl font-bold">Blocked</h2>
      <p className="mt-1 text-sm text-ink/70">
        Blocked people cannot see you or message you. Unblocking restores any chat you had.
      </p>
      <ul className="mt-2 divide-y divide-ink/10">
        {people.map((p) => (
          <li key={p.blocked_id} className="flex items-center gap-4 py-3">
            <Avatar name={p.name} url={p.photo_url} size={44} />
            <p className="min-w-0 flex-1 truncate">{p.name}</p>
            <button type="button" disabled={busyId === p.blocked_id} onClick={() => unblock(p.blocked_id)} className="btn btn-ghost">
              {busyId === p.blocked_id ? "Unblocking" : "Unblock"}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="mt-2 text-sm text-coral">{error}</p> : null}
    </div>
  );
}
