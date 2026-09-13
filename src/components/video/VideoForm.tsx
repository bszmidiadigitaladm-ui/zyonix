"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { VideoGeneration } from "@/lib/types/database.types";

const DURATIONS = [2, 4, 6, 8, 10];
const POLL_INTERVAL_MS = 4000;

export function VideoForm() {
  const t = useTranslations("video");
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<VideoGeneration | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function schedulePoll(id: string) {
    pollTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/ai/video/${id}/status`);
      const data = await res.json().catch(() => null);
      if (!data?.generation) return;

      setGeneration(data.generation);
      if (data.generation.status === "processing") {
        schedulePoll(id);
      } else {
        router.refresh();
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) {
      setError(t("enterPrompt"));
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), duration_seconds: duration }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error === "insufficient_credits" ? t("outOfCredits") : t("resultPlaceholder"));
        return;
      }

      setGeneration(data.generation);
      schedulePoll(data.generation.id);
    } catch {
      setError(t("resultPlaceholder"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("prompt")}</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder={t("promptPlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("duration")}</label>
          <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} {t("seconds")}
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? t("generating") : t("generate")}
        </Button>
      </form>

      <Card className="flex items-center justify-center border-dashed p-4">
        {generation ? (
          generation.status === "succeeded" && generation.video_url ? (
            <div className="flex flex-col items-center gap-3">
              <video src={generation.video_url} controls className="max-h-[480px] rounded-lg" />
              <a
                href={generation.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-accent hover:underline"
              >
                {t("download")}
              </a>
            </div>
          ) : generation.status === "failed" ? (
            <p className="text-sm text-danger">{t("statusFailed")}</p>
          ) : (
            <p className="text-sm text-muted">{t("statusProcessing")}</p>
          )
        ) : (
          <p className="text-sm text-muted">{t("resultPlaceholder")}</p>
        )}
      </Card>
    </div>
  );
}
