"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChurchContact } from "@/lib/types/database.types";

export function ContactsManager({
  initialContacts,
  isOwner,
}: {
  initialContacts: ChurchContact[];
  isOwner: boolean;
}) {
  const t = useTranslations("team.contacts");
  const [contacts, setContacts] = useState(initialContacts);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/church/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "contact_exists"
            ? t("alreadyExists")
            : data.error === "contact_limit_reached"
              ? t("limitReached")
              : data.error === "rate_limited"
                ? t("rateLimited")
                : t("genericError"),
        );
        return;
      }
      setContacts((prev) => [...prev, data.contact]);
      setName("");
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/church/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      {isOwner && (
        <Card>
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">{t("name")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">{t("email")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {t("add")}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </Card>
      )}

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title={t("noContacts")} />
      ) : (
        <Card className="flex flex-col divide-y divide-border p-0">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted">{c.email}</p>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:border-danger/50 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
