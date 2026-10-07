import { createClient } from "@/lib/supabase/server";
import type { Cafe } from "@/lib/types";

export default async function CafesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("city").eq("id", user!.id).single();
  const city = me?.city ?? "Patna";

  const [{ data: cafes }, { data: stats }] = await Promise.all([
    supabase
      .from("cafes")
      .select("id, name, city, area, address, opens, closes, tags")
      .eq("city", city)
      .order("name"),
    supabase.rpc("cafe_stats"),
  ]);

  const counts = new Map<string, number>();
  for (const s of (stats ?? []) as { cafe_id: string; meets_this_week: number }[]) {
    counts.set(s.cafe_id, Number(s.meets_this_week));
  }

  const list = (cafes ?? []) as Cafe[];

  return (
    <section>
      <h1 className="font-display text-4xl font-bold">Cafes in {city}</h1>
      <p className="mt-1 text-ink/70">
        Public places chosen for first meets. Counts show confirmed meets this week, never names.
      </p>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/25 p-8 text-center">
          <p className="font-display text-xl font-bold">No cafes listed yet</p>
          <p className="mt-2 text-ink/70">Cafes are added by the Milna team. Check back soon.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-ink/10">
          {list.map((c) => {
            const n = counts.get(c.id) ?? 0;
            return (
              <li key={c.id} className="py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold">{c.name}</h2>
                  <p className="shrink-0 text-sm font-semibold">
                    {n === 0 ? "No meets yet this week" : `${n} ${n === 1 ? "meet" : "meets"} this week`}
                  </p>
                </div>
                <p className="mt-1 text-ink/75">
                  {[c.area, c.opens && c.closes ? `Open ${c.opens} to ${c.closes}` : null].filter(Boolean).join(", ")}
                </p>
                {c.address ? <p className="text-sm text-ink/60">{c.address}</p> : null}
                {c.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full bg-mist px-2.5 py-0.5 text-xs">{t.replace("-", " ")}</span>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
