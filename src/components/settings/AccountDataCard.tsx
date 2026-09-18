"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function AccountDataCard({
  email,
  hasActiveSubscription,
}: {
  email: string;
  hasActiveSubscription: boolean;
}) {
  const t = useTranslations("settings.account");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = typedEmail.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_email: typedEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.error === "team_has_members"
            ? t("teamHasMembers")
            : data.error === "rate_limited"
              ? t("rateLimited")
              : t("deleteFailed"),
        );
        setDeleting(false);
        return;
      }

      // Server already ended the session; this clears the client-side copy too.
      await createClient().auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setError(t("deleteFailed"));
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="mt-6 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("exportTitle")}</h2>
          <p className="text-sm text-muted">{t("exportSubtitle")}</p>
        </div>
        <div>
          {/* Plain link: the route replies with Content-Disposition: attachment, so the browser downloads it. */}
          <a
            href="/api/account/export"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-accent/50 hover:bg-surface-raised"
          >
            {t("exportButton")}
          </a>
        </div>
      </Card>

      <Card className="mt-6 flex flex-col gap-3 border-danger/30">
        <div>
          <h2 className="text-lg font-semibold text-danger">{t("deleteTitle")}</h2>
          <p className="text-sm text-muted">{t("deleteSubtitle")}</p>
        </div>

        {hasActiveSubscription && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            {t("subscriptionWarning")}
          </p>
        )}

        {!confirming ? (
          <div>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {t("deleteButton")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor="confirm-email">
              {t("typeEmail", { email })}
            </label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              placeholder={email}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex items-center gap-3">
              <Button variant="danger" onClick={handleDelete} disabled={!canDelete || deleting}>
                {deleting ? t("deleting") : t("confirmDelete")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                  setTypedEmail("");
                  setError(null);
                }}
                disabled={deleting}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
