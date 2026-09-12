"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const t = useTranslations("common");
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-foreground"
    >
      {t("signOut")}
    </button>
  );
}
