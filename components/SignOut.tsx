"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOut() {
  const router = useRouter();
  async function out() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={out} className="btn btn-ghost">
      Log out
    </button>
  );
}
