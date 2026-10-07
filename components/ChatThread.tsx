"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { messageTime, meetDate } from "@/lib/format";
import type { Message } from "@/lib/types";

export interface MeetView {
  id: string;
  proposer_id: string;
  meet_at: string;
  status: "proposed" | "confirmed" | "declined" | "cancelled";
  cafeName: string;
  cafeArea: string | null;
}

interface Props {
  connectionId: string;
  meId: string;
  otherId: string;
  otherName: string;
  initialMessages: Message[];
  initialMeets: MeetView[];
  canPlanMeet: boolean;
}

export default function ChatThread({
  connectionId,
  meId,
  otherId,
  otherName,
  initialMessages,
  initialMeets,
  canPlanMeet,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [meets, setMeets] = useState<MeetView[]>(initialMeets);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const iSent = messages.some((m) => m.sender_id === meId);
  const theySent = messages.some((m) => m.sender_id === otherId);
  const planUnlocked = canPlanMeet || (iSent && theySent);

  useEffect(() => {
    const channel = supabase
      .channel(`conn-${connectionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `connection_id=eq.${connectionId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, connectionId]);

  useEffect(() => {
    async function loadMeets() {
      const { data } = await supabase
        .from("meets")
        .select("id, proposer_id, meet_at, status, cafes(name, area)")
        .eq("connection_id", connectionId)
        .in("status", ["proposed", "confirmed"])
        .order("created_at", { ascending: false });
      if (!data) return;
      type Row = {
        id: string;
        proposer_id: string;
        meet_at: string;
        status: MeetView["status"];
        cafes: { name: string; area: string | null } | { name: string; area: string | null }[] | null;
      };
      setMeets(
        (data as unknown as Row[]).map((m) => {
          const cafe = Array.isArray(m.cafes) ? m.cafes[0] : m.cafes;
          return {
            id: m.id,
            proposer_id: m.proposer_id,
            meet_at: m.meet_at,
            status: m.status,
            cafeName: cafe?.name ?? "Cafe",
            cafeArea: cafe?.area ?? null,
          };
        })
      );
    }

    const channel = supabase
      .channel(`meets-${connectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meets", filter: `connection_id=eq.${connectionId}` },
        () => {
          loadMeets();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, connectionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ connection_id: connectionId, sender_id: meId, body })
      .select("id, connection_id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (err || !data) {
      setError("Message not sent. Try again.");
      return;
    }
    setText("");
    setMessages((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data as Message]));
  }

  async function respondMeet(id: string, status: "confirmed" | "declined" | "cancelled") {
    setError("");
    const { error: err } = await supabase.from("meets").update({ status }).eq("id", id);
    if (err) {
      setError("Could not update the meet. Try again.");
      return;
    }
    setMeets((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    router.refresh();
  }

  async function block() {
    if (!window.confirm(`Block ${otherName}? You will no longer see each other.`)) return;
    const { error: err } = await supabase.from("blocks").insert({ blocker_id: meId, blocked_id: otherId });
    if (err) {
      setError("Could not block this person. Try again.");
      return;
    }
    router.replace("/talk");
    router.refresh();
  }

  async function report(e: React.FormEvent) {
    e.preventDefault();
    const { error: err } = await supabase
      .from("reports")
      .insert({ reporter_id: meId, reported_id: otherId, reason: reason.trim() });
    if (err) {
      setError("Report not sent. Write at least a few words and try again.");
      return;
    }
    setReporting(false);
    setReason("");
    setMenu(false);
    setError("");
    window.alert("Report sent. We will review it.");
  }

  const activeMeets = meets.filter((m) => m.status === "proposed" || m.status === "confirmed");

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center justify-between">
        <Link href="/talk" className="text-sm font-semibold text-ink/70">Back</Link>
        <h1 className="font-display text-2xl font-bold">{otherName}</h1>
        <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} className="text-sm font-semibold text-ink/70">
          More
        </button>
      </div>

      {menu ? (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={block} className="btn btn-ghost">Block</button>
          <button type="button" onClick={() => setReporting(true)} className="btn btn-ghost">Report</button>
        </div>
      ) : null}

      {reporting ? (
        <form onSubmit={report} className="mt-3 rounded-2xl bg-mist/70 p-4">
          <label htmlFor="reason" className="text-sm font-semibold">What happened</label>
          <textarea id="reason" required minLength={3} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="field mt-1" />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn btn-primary">Send report</button>
            <button type="button" onClick={() => setReporting(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      ) : null}

      {activeMeets.map((m) => {
        const { weekday, day, time } = meetDate(m.meet_at);
        const mine = m.proposer_id === meId;
        return (
          <div key={m.id} className="mt-4 rounded-2xl border border-ink/20 bg-marigold/25 p-4">
            <p className="font-display text-lg font-bold">
              {m.status === "confirmed" ? "Meet confirmed" : mine ? "Meet proposed, waiting for a reply" : `${otherName} proposed a meet`}
            </p>
            <p className="mt-1 text-sm">
              {m.cafeName}{m.cafeArea ? `, ${m.cafeArea}` : ""} on {weekday}, {day}, {time}
            </p>
            <div className="mt-3 flex gap-2">
              {m.status === "proposed" && !mine ? (
                <>
                  <button type="button" onClick={() => respondMeet(m.id, "confirmed")} className="btn btn-primary">Confirm</button>
                  <button type="button" onClick={() => respondMeet(m.id, "declined")} className="btn btn-ghost">Decline</button>
                </>
              ) : null}
              {m.status === "confirmed" && !mine ? (
                <button type="button" onClick={() => respondMeet(m.id, "declined")} className="btn btn-ghost">Cannot make it</button>
              ) : null}
              {mine ? (
                <button type="button" onClick={() => respondMeet(m.id, "cancelled")} className="btn btn-ghost">Cancel meet</button>
              ) : null}
            </div>
          </div>
        );
      })}

      <ol className="mt-6 flex-1 space-y-2">
        {messages.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-ink/25 p-6 text-center text-ink/70">
            Say hello. A line about what you do is a good start.
          </li>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "bg-ink text-paper" : "bg-white/80"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[11px] ${mine ? "text-paper/60" : "text-ink/50"}`}>{messageTime(m.created_at)}</p>
              </div>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ol>

      <div className="sticky bottom-20 mt-4 bg-paper pt-2">
        {activeMeets.length === 0 ? (
          planUnlocked ? (
            <Link href={`/meet/new?c=${connectionId}`} className="btn btn-accent mb-3 w-full">Plan a meet</Link>
          ) : (
            <p className="mb-3 text-center text-sm text-ink/60">
              Plan a meet unlocks after you both send a message.
            </p>
          )
        ) : null}

        {error ? <p role="alert" className="mb-2 text-sm text-coral">{error}</p> : null}

        <form onSubmit={send} className="flex gap-2">
          <label htmlFor="msg" className="sr-only">Message</label>
          <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} autoComplete="off" className="field" placeholder="Write a message" />
          <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
}
