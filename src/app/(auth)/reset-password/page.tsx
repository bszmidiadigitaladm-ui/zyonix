"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";

// Landing page of the emailed recovery link. /auth/callback has already traded
// the link's code for a session by the time this renders, and the proxy sends
// anyone without a session to /login, so there's no separate token handling here.
export default function ResetPasswordPage() {
  const t = useTranslations("auth.reset");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // A reset usually means the old password may be compromised — end every
    // other session that could still be signed in with it.
    await supabase.auth.signOut({ scope: "others" });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <GlowBackdrop />
      <Card className="relative z-10 w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-muted">{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("newPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("confirmPassword")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
