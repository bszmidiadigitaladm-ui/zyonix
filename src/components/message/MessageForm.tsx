"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { OutlineDisplay } from "@/components/message/OutlineDisplay";
import type { MessageOutline } from "@/lib/openai/text";

const STYLES = ["expository", "topical", "narrative", "devotional"] as const;
const TONES = ["encouraging", "challenging", "reflective", "celebratory"] as const;

export function MessageForm() {
  const t = useTranslations("message");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [duration, setDuration] = useState(20);
  const [style, setStyle] = useState<(typeof STYLES)[number]>("topical");
  const [tone, setTone] = useState<(typeof TONES)[number]>("encouraging");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<MessageOutline | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !audience.trim()) {
      setError(t("enterTopicAndAudience"));
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          audience: audience.trim(),
          duration_minutes: duration,
          style,
          tone,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error === "insufficient_credits" ? t("outOfCredits") : tCommon("somethingWentWrong"));
        return;
      }

      setOutline(data.outline.outline);
      router.refresh();
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("topic")}</label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={2}
            placeholder={t("topicPlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("audience")}</label>
          <Input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder={t("audiencePlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("duration")}</label>
          <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} {t("minutes")}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("style")}</label>
          <Select value={style} onChange={(e) => setStyle(e.target.value as (typeof STYLES)[number])}>
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {t(`style_${s}`)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("tone")}</label>
          <Select value={tone} onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}>
            {TONES.map((tn) => (
              <option key={tn} value={tn}>
                {t(`tone_${tn}`)}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? t("generating") : t("generate")}
        </Button>
      </form>

      {outline ? (
        <OutlineDisplay outline={outline} />
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border p-8 text-sm text-muted">
          {t("resultPlaceholder")}
        </div>
      )}
    </div>
  );
}
