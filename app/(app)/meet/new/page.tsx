import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MeetForm from "@/components/MeetForm";
import type { Cafe, Connection } from "@/lib/types";

export default async function NewMeetPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const connectionId = searchParams.c;
  if (!connectionId) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data: conn } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id, status, created_at")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn || (conn as Connection).status !== "accepted") notFound();
  const c = conn as Connection;
  const otherId = c.requester_id === meId ? c.addressee_id : c.requester_id;

  const [{ data: other }, { data: me }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", otherId).maybeSingle(),
    supabase.from("profiles").select("city").eq("id", meId).single(),
  ]);
  if (!other) notFound();

  const { data: cafes } = await supabase
    .from("cafes")
    .select("id, name, city, area, address, opens, closes, tags")
    .eq("city", me?.city ?? "Patna")
    .order("name");

  return (
    <section>
      <Link href={`/talk/${connectionId}`} className="text-sm font-semibold text-ink/70">Back to chat</Link>
      <h1 className="mt-3 font-display text-4xl font-bold">Plan a meet with {other.name}</h1>
      <div className="mt-8">
        <MeetForm connectionId={connectionId} meId={meId} otherName={other.name} cafes={(cafes ?? []) as Cafe[]} />
      </div>
    </section>
  );
}
