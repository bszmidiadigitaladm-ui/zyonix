"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Turnstile } from "@/components/auth/Turnstile";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const t = useTranslations("auth.signup");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  // A team invite link forwards ?next=/team/accept/<token> so a brand-new
  // teammate lands there instead of the solo-plan checkout onboarding.
  const next = searchParams.get("next") || "/onboarding/plan";
  // A Hotmart activation email links here with ?email= pre-filled, since
  // the subscription only activates once the account uses the same address.
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        captchaToken: captchaToken ?? undefined,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is required, there is no session yet.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  if (checkEmail) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <GlowBackdrop />
        <Card className="relative z-10 w-full max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-semibold">{t("checkInboxTitle")}</h1>
          <p className="text-sm text-muted">{t("checkInboxBody", { email, appName: APP_NAME })}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <GlowBackdrop />
      <div className="absolute right-6 top-6 z-10">
        <LanguageSwitcher />
      </div>
      <Card className="relative z-10 w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">{t("title", { appName: APP_NAME })}</h1>
        <p className="mb-6 text-sm text-muted">{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="text"
            required
            placeholder={t("fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            type="email"
            required
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="-mt-1 text-xs text-muted">{t("emailHint")}</p>
          <Input
            type="password"
            required
            minLength={8}
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Turnstile onVerify={setCaptchaToken} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" />
          {tCommon("or")}
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="secondary" onClick={handleGoogle} className="w-full">
          {tCommon("continueWithGoogle")}
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
