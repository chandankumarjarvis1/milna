import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Ticket from "@/components/Ticket";
import { BRAND, TAGLINE } from "@/lib/constants";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/explore");

  const sample = new Date();
  sample.setDate(sample.getDate() + 3);
  sample.setHours(17, 30, 0, 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8 md:px-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl font-bold">{BRAND}</span>
        <Link href="/login" className="btn btn-ghost">
          Log in
        </Link>
      </header>

      <section className="grid flex-1 items-center gap-12 py-14 md:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] md:text-6xl">
            {TAGLINE}
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink/75">
            Find people in Patna who are building something. Say hello, then pick a
            cafe and meet them in real life.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn btn-primary">
              Join with an invite code
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink/60">Invite only. Patna first.</p>
        </div>

        <div className="mx-auto w-full max-w-sm md:rotate-2">
          <Ticket
            withName="Aman"
            cafeName="Your cafe"
            area="Boring Road"
            meetAt={sample.toISOString()}
          />
        </div>
      </section>
    </main>
  );
}
