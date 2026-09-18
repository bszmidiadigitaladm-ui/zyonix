"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Turnstile } from "@/components/auth/Turnstile";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgot");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      captchaToken: captchaToken ?? undefined,
    });

    setLoading(false);
    // Only surface rate-limit/captcha failures. An unknown address gets the same
    // "check your inbox" screen as a known one, so this form can't be used to
    // discover which emails have accounts.
    if (error && (error.status === 429 || /captcha/i.test(error.message))) {
      setError(error.status === 429 ? t("tooMany") : t("captchaFailed"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <GlowBackdrop />
      <div className="absolute right-6 top-6 z-10">
        <LanguageSwitcher />
      </div>
      <Card className="relative z-10 w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-semibold">{t("sentTitle")}</h1>
            <p className="text-sm text-muted">{t("sentBody", { email })}</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-semibold">{t("title")}</h1>
            <p className="mb-6 text-sm text-muted">{t("subtitle")}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="email"
                required
                placeholder={t("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Turnstile onVerify={setCaptchaToken} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t("submitting") : t("submit")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-accent hover:underline">
                {t("backToLogin")}
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
