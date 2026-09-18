"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Communication } from "@/lib/types/database.types";

const TEMPLATE_TYPES = ["custom", "sunday_bulletin", "event_reminder"] as const;

export function CommunicationsPanel({
  initialCommunications,
  isOwner,
}: {
  initialCommunications: Communication[];
  isOwner: boolean;
}) {
  const t = useTranslations("team.communications");
  const [history, setHistory] = useState(initialCommunications);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateType, setTemplateType] = useState<(typeof TEMPLATE_TYPES)[number]>("custom");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/church/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), template_type: templateType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "no_contacts"
            ? t("noContactsError")
            : data.error === "rate_limited"
              ? t("rateLimitedError")
              : t("genericError"),
        );
        return;
      }
      setHistory((prev) => [data.communication, ...prev]);
      setSubject("");
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {isOwner && (
        <Card>
          <form onSubmit={handleSend} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("templateType")}</label>
              <Select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as (typeof TEMPLATE_TYPES)[number])}
              >
                {TEMPLATE_TYPES.map((tpl) => (
                  <option key={tpl} value={tpl}>
                    {t(`templateType_${tpl}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("subject")}</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("subjectPlaceholder")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("body")}</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder={t("bodyPlaceholder")} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={sending} className="self-start">
              {sending ? t("sending") : t("send")}
            </Button>
          </form>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
        {history.length === 0 ? (
          <EmptyState icon={Mail} title={t("noHistory")} />
        ) : (
          <Card className="flex flex-col divide-y divide-border p-0">
            {history.map((c) => (
              <div key={c.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{c.subject}</p>
                <p className="text-xs text-muted">
                  {new Date(c.created_at).toLocaleDateString()} · {t("recipientCount", { count: c.recipient_count })}
                </p>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
