import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, status, last_active_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || me.status !== "approved") redirect("/onboarding");

  // throttle: write last_active_at at most every 5 minutes
  if (Date.now() - new Date(me.last_active_at).getTime() > 5 * 60 * 1000) {
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  const { count } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 pb-28 pt-6">
      {children}
      <Nav pendingRequests={count ?? 0} />
    </div>
  );
}
