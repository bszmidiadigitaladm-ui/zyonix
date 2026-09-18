"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/** TOTP second factor for administrators: enroll an authenticator app once, then verify a code each session. */
export function MfaSetup({ hasFactor }: { hasFactor: boolean }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnroll() {
    setError(null);
    setLoading(true);
    const supabase = createClient();

    // An abandoned earlier attempt leaves an unverified factor behind; clear it first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Zyonix admin ${new Date().toISOString().slice(0, 16)}`,
    });
    setLoading(false);
    if (error || !data) {
      setError(error?.message ?? "Could not start setup. Is MFA (TOTP) enabled in Supabase Auth?");
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    let factorId = enrollment?.factorId;
    if (!factorId) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      factorId = factors?.totp?.[0]?.id;
    }
    if (!factorId) {
      setLoading(false);
      setError("No authenticator found. Set one up first.");
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setLoading(false);
      setError(challengeError?.message ?? "Could not start verification");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
    setLoading(false);
    if (verifyError) {
      setError("That code didn't work. Check the code and your phone's clock, then try again.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  const showCodeForm = hasFactor || enrollment;

  return (
    <div className="flex flex-col gap-4">
      {!showCodeForm && (
        <>
          <p className="text-sm text-muted">
            Admin access requires a second factor. Set up an authenticator app (Google Authenticator, 1Password, Authy…)
            to continue.
          </p>
          <Button onClick={startEnroll} disabled={loading}>
            {loading ? "Preparing…" : "Set up authenticator"}
          </Button>
        </>
      )}

      {enrollment && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from Supabase, nothing to optimize */}
          <img src={enrollment.qrCode} alt="Authenticator QR code" width={180} height={180} className="rounded-lg bg-white p-2" />
          <p className="text-xs text-muted">
            Can&apos;t scan? Enter this key manually: <span className="font-mono break-all text-foreground">{enrollment.secret}</span>
          </p>
        </div>
      )}

      {showCodeForm && (
        <form onSubmit={verify} className="flex flex-col gap-3">
          {hasFactor && !enrollment && <p className="text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>}
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center font-mono tracking-[0.4em]"
            required
          />
          <Button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
