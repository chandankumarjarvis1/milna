import { createClient } from "@/lib/supabase/server";
import ExploreList, { type ConnState } from "@/components/ExploreList";
import type { Connection, Profile } from "@/lib/types";

export default async function ExplorePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data: me } = await supabase.from("profiles").select("city").eq("id", meId).single();
  const city = me?.city ?? "Patna";

  const [{ data: people }, { data: conns }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, age, headline, bio, interests, open_to, city, photo_url, status, last_active_at")
      .eq("status", "approved")
      .eq("city", city)
      .neq("id", meId)
      .order("last_active_at", { ascending: false })
      .limit(100),
    supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status, created_at"),
  ]);

  const map: Record<string, ConnState> = {};
  for (const c of (conns ?? []) as Connection[]) {
    const otherId = c.requester_id === meId ? c.addressee_id : c.requester_id;
    map[otherId] = { id: c.id, status: c.status, iRequested: c.requester_id === meId };
  }

  return (
    <section>
      <h1 className="font-display text-4xl font-bold">{city}</h1>
      <p className="mt-1 text-ink/70">People in your city who are open to meeting.</p>
      <div className="mt-6">
        <ExploreList meId={meId} profiles={(people ?? []) as Profile[]} connections={map} />
      </div>
    </section>
  );
}
