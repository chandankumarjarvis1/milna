import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import Ticket from "@/components/Ticket";
import RequestActions from "@/components/RequestActions";
import { messageTime } from "@/lib/format";
import type { Cafe, Connection, Meet, Message, Profile } from "@/lib/types";

export default async function TalkPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data: connData } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id, status, created_at")
    .neq("status", "declined")
    .order("created_at", { ascending: false });
  const conns = (connData ?? []) as Connection[];

  const otherIds = conns.map((c) => (c.requester_id === meId ? c.addressee_id : c.requester_id));
  const connIds = conns.map((c) => c.id);

  const [{ data: profs }, { data: msgs }, { data: meetData }, { data: cafeData }] = await Promise.all([
    otherIds.length
      ? supabase.from("profiles").select("id, name, headline, photo_url").in("id", otherIds)
      : Promise.resolve({ data: [] }),
    connIds.length
      ? supabase
          .from("messages")
          .select("id, connection_id, sender_id, body, created_at")
          .in("connection_id", connIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
    connIds.length
      ? supabase
          .from("meets")
          .select("id, connection_id, proposer_id, cafe_id, meet_at, status, created_at")
          .in("connection_id", connIds)
          .eq("status", "confirmed")
          .gte("meet_at", new Date().toISOString())
          .order("meet_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from("cafes").select("id, name, area"),
  ]);

  const byId = new Map<string, Pick<Profile, "id" | "name" | "headline" | "photo_url">>();
  for (const p of (profs ?? []) as Pick<Profile, "id" | "name" | "headline" | "photo_url">[]) {
    byId.set(p.id, p);
  }
  const lastMsg = new Map<string, Message>();
  for (const m of (msgs ?? []) as Message[]) {
    if (!lastMsg.has(m.connection_id)) lastMsg.set(m.connection_id, m);
  }
  const cafeById = new Map<string, Pick<Cafe, "id" | "name" | "area">>();
  for (const c of (cafeData ?? []) as Pick<Cafe, "id" | "name" | "area">[]) cafeById.set(c.id, c);

  const otherOf = (c: Connection) => byId.get(c.requester_id === meId ? c.addressee_id : c.requester_id);

  const incoming = conns.filter((c) => c.status === "pending" && c.addressee_id === meId && otherOf(c));
  const sent = conns.filter((c) => c.status === "pending" && c.requester_id === meId && otherOf(c));
  const chats = conns.filter((c) => c.status === "accepted" && otherOf(c));
  const meets = (meetData ?? []) as Meet[];

  const empty = incoming.length + sent.length + chats.length + meets.length === 0;

  return (
    <section>
      <h1 className="font-display text-4xl font-bold">Talk</h1>

      {empty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/25 p-8 text-center">
          <p className="font-display text-xl font-bold">No conversations yet</p>
          <p className="mt-2 text-ink/70">Find someone interesting and send a connect request.</p>
          <Link href="/explore" className="btn btn-accent mt-5">Go to Explore</Link>
        </div>
      ) : null}

      {meets.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold">Your meets</h2>
          <div className="mt-4 space-y-5">
            {meets.map((m) => {
              const conn = conns.find((c) => c.id === m.connection_id);
              const other = conn ? otherOf(conn) : undefined;
              const cafe = cafeById.get(m.cafe_id);
              if (!other || !cafe) return null;
              return (
                <Ticket
                  key={m.id}
                  withName={other.name}
                  cafeName={cafe.name}
                  area={cafe.area}
                  meetAt={m.meet_at}
                  footer={
                    <Link href={`/talk/${m.connection_id}`} className="text-sm font-semibold underline">
                      Open chat
                    </Link>
                  }
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {incoming.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold">Wants to connect</h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {incoming.map((c) => {
              const o = otherOf(c)!;
              return (
                <li key={c.id} className="flex items-center gap-4 py-4">
                  <Avatar name={o.name} url={o.photo_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{o.name}</p>
                    <p className="mb-2 truncate text-sm text-ink/70">{o.headline}</p>
                    <RequestActions connectionId={c.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {chats.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold">Chats</h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {chats.map((c) => {
              const o = otherOf(c)!;
              const last = lastMsg.get(c.id);
              return (
                <li key={c.id}>
                  <Link href={`/talk/${c.id}`} className="flex items-center gap-4 py-4">
                    <Avatar name={o.name} url={o.photo_url} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-semibold">{o.name}</p>
                        {last ? <span className="shrink-0 text-xs text-ink/55">{messageTime(last.created_at)}</span> : null}
                      </div>
                      <p className="truncate text-sm text-ink/70">
                        {last ? `${last.sender_id === meId ? "You: " : ""}${last.body}` : "Say hello to start the chat"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {sent.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold">Waiting for a reply</h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {sent.map((c) => {
              const o = otherOf(c)!;
              return (
                <li key={c.id} className="flex items-center gap-4 py-3">
                  <Avatar name={o.name} url={o.photo_url} size={44} />
                  <p className="truncate">{o.name}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
