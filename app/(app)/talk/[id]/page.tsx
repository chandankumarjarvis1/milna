import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatThread, { type MeetView } from "@/components/ChatThread";
import type { Connection, Message } from "@/lib/types";

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data: conn } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!conn || (conn as Connection).status !== "accepted") notFound();
  const c = conn as Connection;
  const otherId = c.requester_id === meId ? c.addressee_id : c.requester_id;

  const [{ data: other }, { data: msgs }, { data: meetRows }] = await Promise.all([
    supabase.from("profiles").select("id, name").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, connection_id, sender_id, body, created_at")
      .eq("connection_id", c.id)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("meets")
      .select("id, proposer_id, meet_at, status, cafes(name, area)")
      .eq("connection_id", c.id)
      .in("status", ["proposed", "confirmed"])
      .order("created_at", { ascending: false }),
  ]);

  if (!other) notFound(); // other person blocked you or was removed

  const messages = (msgs ?? []) as Message[];
  const senders = new Set(messages.map((m) => m.sender_id));

  type MeetRow = {
    id: string;
    proposer_id: string;
    meet_at: string;
    status: MeetView["status"];
    cafes: { name: string; area: string | null } | { name: string; area: string | null }[] | null;
  };
  const meets: MeetView[] = ((meetRows ?? []) as unknown as MeetRow[]).map((m) => {
    const cafe = Array.isArray(m.cafes) ? m.cafes[0] : m.cafes;
    return {
      id: m.id,
      proposer_id: m.proposer_id,
      meet_at: m.meet_at,
      status: m.status,
      cafeName: cafe?.name ?? "Cafe",
      cafeArea: cafe?.area ?? null,
    };
  });

  return (
    <ChatThread
      connectionId={c.id}
      meId={meId}
      otherId={otherId}
      otherName={other.name}
      initialMessages={messages}
      initialMeets={meets}
      canPlanMeet={senders.size === 2}
    />
  );
}
