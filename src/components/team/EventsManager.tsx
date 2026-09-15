"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChurchEvent } from "@/lib/types/database.types";

export function EventsManager({
  initialEvents,
  isOwner,
}: {
  initialEvents: ChurchEvent[];
  isOwner: boolean;
}) {
  const t = useTranslations("team.events");
  const [events, setEvents] = useState(initialEvents);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [reminderDays, setReminderDays] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [generatingFlyerId, setGeneratingFlyerId] = useState<string | null>(null);
  const [flyerError, setFlyerError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/church/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          event_date: eventDate,
          reminder_days_before: reminderDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEvents((prev) => [...prev, data.event].sort((a, b) => a.event_date.localeCompare(b.event_date)));
        setTitle("");
        setDescription("");
        setEventDate("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/church/events/${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleGenerateFlyer(id: string) {
    setFlyerError(null);
    setGeneratingFlyerId(id);
    try {
      const res = await fetch(`/api/church/events/${id}/flyer`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setEvents((prev) => prev.map((e) => (e.id === id ? data.event : e)));
      } else {
        setFlyerError(t("flyerFailed"));
      }
    } catch {
      setFlyerError(t("flyerFailed"));
    } finally {
      setGeneratingFlyerId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {isOwner && (
        <Card>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("eventTitle")}</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("eventTitlePlaceholder")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("description")}</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t("date")}</label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t("reminderDaysBefore")}</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="self-start">
              {t("add")}
            </Button>
          </form>
        </Card>
      )}

      {flyerError && <p className="text-sm text-danger">{flyerError}</p>}

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("noEvents")} />
      ) : (
        <Card className="flex flex-col divide-y divide-border p-0">
          {events.map((e) => (
            <div key={e.id} className="flex flex-col gap-3 px-5 py-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted">
                    {e.event_date}
                    {e.description ? ` · ${e.description}` : ""}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(e.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:border-danger/50 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-3">
                  {e.flyer_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.flyer_image_url}
                      alt={e.title}
                      className="h-20 w-16 shrink-0 rounded-md border border-border object-cover"
                    />
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={generatingFlyerId === e.id}
                    onClick={() => handleGenerateFlyer(e.id)}
                    className="gap-1.5"
                  >
                    <Sparkles size={14} />
                    {generatingFlyerId === e.id
                      ? t("generatingFlyer")
                      : e.flyer_image_url
                        ? t("regenerateFlyer")
                        : t("generateFlyer")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
