"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cafe } from "@/lib/types";

interface Props {
  connectionId: string;
  meId: string;
  otherName: string;
  cafes: Cafe[];
}

const TIMES: { value: string; label: string }[] = [];
for (let h = 9; h <= 21; h++) {
  for (const m of [0, 30]) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    TIMES.push({ value: `${hh}:${mm}`, label: `${hour12}:${mm} ${h >= 12 ? "PM" : "AM"}` });
  }
}

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function MeetForm({ connectionId, meId, otherName, cafes }: Props) {
  const router = useRouter();
  const minDate = useMemo(() => todayIST(), []);
  const [cafeId, setCafeId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cafeId) {
      setError("Pick a cafe.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    const meetAt = new Date(`${date}T${time}:00+05:30`);
    if (meetAt.getTime() <= Date.now()) {
      setError("Pick a time in the future.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("meets").insert({
      connection_id: connectionId,
      proposer_id: meId,
      cafe_id: cafeId,
      meet_at: meetAt.toISOString(),
    });
    setBusy(false);
    if (err) {
      setError(
        "Could not send the proposal. Both of you need to have sent a message first, and you can only have one active meet."
      );
      return;
    }
    router.replace(`/talk/${connectionId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset>
        <legend className="font-display text-2xl font-bold">Where</legend>
        <p className="mt-1 text-sm text-ink/70">First meets happen in public cafes only.</p>
        {cafes.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-ink/25 p-6 text-ink/70">
            No cafes are listed for your city yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cafes.map((c) => (
              <li key={c.id}>
                <label
                  className={`block cursor-pointer rounded-2xl border p-4 ${
                    cafeId === c.id ? "border-ink bg-white" : "border-ink/20 bg-white/50"
                  }`}
                >
                  <input type="radio" name="cafe" value={c.id} checked={cafeId === c.id} onChange={() => setCafeId(c.id)} className="sr-only" />
                  <span className="block font-display text-lg font-bold">{c.name}</span>
                  <span className="block text-sm text-ink/70">
                    {[c.area, c.opens && c.closes ? `${c.opens} to ${c.closes}` : null].filter(Boolean).join(", ")}
                  </span>
                  {c.tags.length > 0 ? (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <span key={t} className="rounded-full bg-mist px-2.5 py-0.5 text-xs">{t.replace("-", " ")}</span>
                      ))}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div>
        <h2 className="font-display text-2xl font-bold">When</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="text-sm font-semibold">Date</label>
            <input id="date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label htmlFor="time" className="text-sm font-semibold">Time</label>
            <select id="time" value={time} onChange={(e) => setTime(e.target.value)} className="field mt-1">
              {TIMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-coral/15 px-4 py-3 text-sm text-coral">{error}</p> : null}

      <button type="submit" disabled={busy || cafes.length === 0} className="btn btn-primary w-full">
        {busy ? "Sending" : `Propose to ${otherName}`}
      </button>
    </form>
  );
}
