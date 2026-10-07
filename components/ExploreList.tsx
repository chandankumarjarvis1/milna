"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { OPEN_TO_OPTIONS } from "@/lib/constants";
import { lastActive } from "@/lib/format";
import type { Profile } from "@/lib/types";

export interface ConnState {
  id: string;
  status: "pending" | "accepted" | "declined";
  iRequested: boolean;
}

interface Props {
  meId: string;
  profiles: Profile[];
  connections: Record<string, ConnState>; // keyed by the other person's id
}

export default function ExploreList({ meId, profiles, connections }: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const [conns, setConns] = useState(connections);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visible = filter ? profiles.filter((p) => p.open_to.includes(filter)) : profiles;

  async function connect(otherId: string) {
    setBusyId(otherId);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("connections")
      .insert({ requester_id: meId, addressee_id: otherId })
      .select("id, status")
      .single();
    setBusyId(null);
    if (err || !data) {
      setError("Could not send the request. Try again in a moment.");
      return;
    }
    setConns((c) => ({ ...c, [otherId]: { id: data.id, status: "pending", iRequested: true } }));
  }

  return (
    <div>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-2 pb-1">
          <button type="button" aria-pressed={filter === null} onClick={() => setFilter(null)} className={`chip whitespace-nowrap ${filter === null ? "chip-on" : ""}`}>
            Everyone
          </button>
          {OPEN_TO_OPTIONS.map((o) => (
            <button key={o} type="button" aria-pressed={filter === o} onClick={() => setFilter(filter === o ? null : o)} className={`chip whitespace-nowrap ${filter === o ? "chip-on" : ""}`}>
              {o}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-coral/15 px-4 py-3 text-sm text-coral">{error}</p>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink/25 p-8 text-center">
          <p className="font-display text-xl font-bold">
            {profiles.length === 0 ? "You are early" : "No one matches this filter"}
          </p>
          <p className="mt-2 text-ink/70">
            {profiles.length === 0
              ? "Invite three people you would actually want to meet. The city fills up from here."
              : "Clear the filter to see everyone in the city."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10">
          {visible.map((p) => {
            const c = conns[p.id];
            return (
              <li key={p.id} className="flex gap-4 py-5">
                <Avatar name={p.name} url={p.photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="truncate font-display text-xl font-bold">
                      {p.name}
                      {p.age ? <span className="font-sans text-base font-normal text-ink/60">, {p.age}</span> : null}
                    </h2>
                    <span className="shrink-0 text-xs text-ink/55">{lastActive(p.last_active_at)}</span>
                  </div>
                  <p className="text-ink/80">{p.headline}</p>
                  {p.bio ? <p className="mt-1 text-sm text-ink/70">{p.bio}</p> : null}
                  <p className="mt-2 text-sm text-ink/60">
                    Open to {p.open_to.join(", ").toLowerCase()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.interests.map((i) => (
                      <span key={i} className="rounded-full bg-mist px-2.5 py-0.5 text-xs">{i}</span>
                    ))}
                  </div>
                  <div className="mt-3">
                    {!c || c.status === "declined" ? (
                      c?.status === "declined" ? (
                        <span className="text-sm text-ink/55">Not available to connect</span>
                      ) : (
                        <button type="button" onClick={() => connect(p.id)} disabled={busyId === p.id} className="btn btn-accent">
                          {busyId === p.id ? "Sending" : "Connect"}
                        </button>
                      )
                    ) : c.status === "accepted" ? (
                      <Link href={`/talk/${c.id}`} className="btn btn-primary">Open chat</Link>
                    ) : c.iRequested ? (
                      <span className="text-sm font-semibold text-ink/60">Request sent</span>
                    ) : (
                      <Link href="/talk" className="btn btn-ghost">Wants to connect, reply</Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
