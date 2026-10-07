import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import InviteGate from "@/components/InviteGate";
import { BRAND } from "@/lib/constants";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "approved") redirect("/explore");

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-10">
      <p className="mb-8 font-display text-2xl font-bold">{BRAND}</p>
      {profile ? (
        <InviteGate invalid={searchParams.code === "invalid"} />
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold">Set up your profile</h1>
          <p className="mb-8 mt-2 text-ink/75">
            Real photo, real work. This is how people decide whether to say hello.
          </p>
          <ProfileForm userId={user.id} mode="create" />
        </>
      )}
    </main>
  );
}
