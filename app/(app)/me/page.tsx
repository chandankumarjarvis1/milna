import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import SignOut from "@/components/SignOut";
import BlockedList, { type BlockedPerson } from "@/components/BlockedList";
import type { Profile } from "@/lib/types";

export default async function MePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const [{ data: profile }, { data: priv }, { data: blocked }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, age, headline, bio, interests, open_to, city, photo_url, status, last_active_at")
      .eq("id", meId)
      .single(),
    supabase.from("profile_private").select("gender").eq("id", meId).maybeSingle(),
    supabase.rpc("my_blocks"),
  ]);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold">Your profile</h1>
        <SignOut />
      </div>
      <p className="mb-8 mt-1 text-ink/70">This is what people see in Explore. Gender stays private.</p>
      <ProfileForm
        userId={meId}
        mode="edit"
        initial={profile as Profile}
        initialGender={priv?.gender ?? null}
      />
      <BlockedList meId={meId} initial={(blocked ?? []) as BlockedPerson[]} />
    </section>
  );
}
