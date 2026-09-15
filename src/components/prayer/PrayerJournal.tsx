"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, RotateCcw, Trash2, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PrayerRequest } from "@/lib/types/database.types";

export function PrayerJournal({ initialRequests }: { initialRequests: PrayerRequest[] }) {
  const t = useTranslations("prayer");
  const [requests, setRequests] = useState(initialRequests);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequests((prev) => [data.request, ...prev]);
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id: string, isAnswered: boolean) {
    const res = await fetch(`/api/prayer/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_answered: isAnswered }),
    });
    const data = await res.json();
    if (res.ok) {
      setRequests((prev) => prev.map((r) => (r.id === id ? data.request : r)));
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/prayer/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const active = requests.filter((r) => !r.is_answered);
  const answered = requests.filter((r) => r.is_answered);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <label className="text-sm font-medium">{t("newRequest")}</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={t("newRequestPlaceholder")}
          />
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? t("adding") : t("add")}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {t("active")} <span className="text-sm font-normal text-muted">({active.length})</span>
        </h2>
        {active.length === 0 ? (
          <EmptyState icon={HandHeart} title={t("noActive")} />
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((r) => (
              <Card key={r.id} className="flex items-start justify-between gap-4 p-4">
                <p className="flex-1 text-sm">{r.content}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(r.id, true)}
                    title={t("markAnswered")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-accent/50 hover:text-accent"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    title={t("delete")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-danger/50 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {answered.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            {t("answered")} <span className="text-sm font-normal text-muted">({answered.length})</span>
          </h2>
          <div className="flex flex-col gap-3">
            {answered.map((r) => (
              <Card key={r.id} className="flex items-start justify-between gap-4 p-4 opacity-70">
                <p className="flex-1 text-sm line-through decoration-accent/50">{r.content}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(r.id, false)}
                    title={t("markActive")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-accent/50 hover:text-accent"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    title={t("delete")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-danger/50 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
