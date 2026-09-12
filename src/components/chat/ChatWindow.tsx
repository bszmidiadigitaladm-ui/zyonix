"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DisclaimerBanner } from "@/components/chat/DisclaimerBanner";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { CrisisInterrupt } from "@/components/chat/CrisisInterrupt";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  crisis?: boolean;
}

export function ChatWindow({
  initialMessages,
  dailyLimitReached,
}: {
  initialMessages: DisplayMessage[];
  dailyLimitReached: boolean;
}) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(dailyLimitReached);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (res.status === 429 && data.error === "daily_limit_reached") {
        setLimitReached(true);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? tCommon("somethingWentWrong"));
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, crisis: data.type === "crisis_redirect" },
      ]);
    } catch {
      setError(t("genericError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DisclaimerBanner />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
        {messages.map((m, i) =>
          m.crisis ? (
            <CrisisInterrupt key={i} message={m.content} />
          ) : (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ),
        )}
        {messages.length === 0 && (
          <p className="text-sm text-muted">{t("startConversation")}</p>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {limitReached ? (
        <Card className="text-sm text-muted">{t("limitReached")}</Card>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            className="flex-1"
          />
          <Button type="submit" disabled={sending}>
            {t("send")}
          </Button>
        </form>
      )}
    </div>
  );
}
