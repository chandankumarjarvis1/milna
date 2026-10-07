"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CITIES,
  GENDER_OPTIONS,
  INTEREST_OPTIONS,
  OPEN_TO_OPTIONS,
} from "@/lib/constants";
import type { Profile } from "@/lib/types";

interface Props {
  userId: string;
  mode: "create" | "edit";
  initial?: Profile | null;
  initialGender?: string | null;
}

function toggle(list: string[], value: string, max?: number): string[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (max && list.length >= max) return list;
  return [...list, value];
}

export default function ProfileForm({ userId, mode, initial, initialGender }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [age, setAge] = useState(initial?.age ? String(initial.age) : "");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [openTo, setOpenTo] = useState<string[]>(initial?.open_to ?? []);
  const [gender, setGender] = useState(initialGender ?? "");
  const [city, setCity] = useState(initial?.city ?? CITIES[0]);
  const [code, setCode] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.photo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }
    setError("");
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 99) {
      setError("Enter an age between 18 and 99.");
      return;
    }
    if (interests.length < 1) {
      setError("Pick at least one interest.");
      return;
    }
    if (openTo.length < 1) {
      setError("Pick at least one thing you are open to.");
      return;
    }
    if (mode === "create" && !photo) {
      setError("Add a clear photo of your face. It builds trust.");
      return;
    }
    if (!gender) {
      setError("Select an option for gender. It is never shown to others.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    let photoUrl = initial?.photo_url ?? null;
    if (photo) {
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, photo, { upsert: true, contentType: photo.type });
      if (upErr) {
        setBusy(false);
        setError(`Photo upload failed: ${upErr.message}`);
        return;
      }
      photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const fields = {
      name: name.trim(),
      age: ageNum,
      headline: headline.trim(),
      bio: bio.trim() || null,
      interests,
      open_to: openTo,
      city,
      photo_url: photoUrl,
    };

    if (mode === "create") {
      let { error: insErr } = await supabase.from("profiles").insert({ id: userId, ...fields });
      if (insErr?.code === "23505") {
        // an earlier attempt saved the profile but failed later; finish it instead of getting stuck
        ({ error: insErr } = await supabase.from("profiles").update(fields).eq("id", userId));
      }
      if (insErr) {
        setBusy(false);
        setError(insErr.message);
        return;
      }
    } else {
      const { error: updErr } = await supabase.from("profiles").update(fields).eq("id", userId);
      if (updErr) {
        setBusy(false);
        setError(updErr.message);
        return;
      }
    }

    const { error: gErr } = await supabase
      .from("profile_private")
      .upsert({ id: userId, gender });
    if (gErr) {
      setBusy(false);
      setError(gErr.message);
      return;
    }

    if (mode === "create") {
      const { data: ok } = await supabase.rpc("redeem_invite", { p_code: code });
      if (!ok) {
        setBusy(false);
        router.replace("/onboarding?code=invalid");
        router.refresh();
        return;
      }
      router.replace("/explore");
    } else {
      router.replace("/me");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your profile photo" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mist text-sm text-ink/60">
            No photo
          </div>
        )}
        <div>
          <label htmlFor="photo" className="btn btn-ghost cursor-pointer">
            {preview ? "Change photo" : "Add photo"}
          </label>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} className="sr-only" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
        <div>
          <label htmlFor="name" className="text-sm font-semibold">Name</label>
          <input id="name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label htmlFor="age" className="text-sm font-semibold">Age</label>
          <input id="age" required inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} className="field mt-1" />
        </div>
      </div>

      <div>
        <label htmlFor="headline" className="text-sm font-semibold">What do you do</label>
        <input id="headline" required minLength={2} maxLength={80} value={headline} onChange={(e) => setHeadline(e.target.value)} className="field mt-1" placeholder="Founder, Digital Growth" />
      </div>

      <div>
        <label htmlFor="bio" className="text-sm font-semibold">One line about you</label>
        <textarea id="bio" maxLength={200} rows={2} value={bio} onChange={(e) => setBio(e.target.value)} className="field mt-1" placeholder="Building a SaaS. Always up for filter coffee." />
        <p className="mt-1 text-xs text-ink/60">{bio.length}/200</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Interests (up to 5)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((o) => (
            <button key={o} type="button" aria-pressed={interests.includes(o)} onClick={() => setInterests(toggle(interests, o, 5))} className={`chip ${interests.includes(o) ? "chip-on" : ""}`}>
              {o}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Open to</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {OPEN_TO_OPTIONS.map((o) => (
            <button key={o} type="button" aria-pressed={openTo.includes(o)} onClick={() => setOpenTo(toggle(openTo, o))} className={`chip ${openTo.includes(o) ? "chip-on" : ""}`}>
              {o}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="text-sm font-semibold">City</label>
          <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className="field mt-1">
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gender" className="text-sm font-semibold">Gender</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="field mt-1">
            <option value="">Select</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/60">Private. Never shown on your profile.</p>
        </div>
      </div>

      {mode === "create" ? (
        <div>
          <label htmlFor="code" className="text-sm font-semibold">Invite code</label>
          <input id="code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="field mt-1 tracking-wide" />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl bg-coral/15 px-4 py-3 text-sm text-coral">{error}</p>
      ) : null}

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Saving" : mode === "create" ? "Join Milna" : "Save changes"}
      </button>
    </form>
  );
}
