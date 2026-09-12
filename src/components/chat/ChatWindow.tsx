"use client";

import { useState } from "react";
import { DisclaimerBanner } from "@/components/chat/DisclaimerBanner";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { CrisisInterrupt } from "@/components/chat/CrisisInterrupt";

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
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message, crisis: data.type === "crisis_redirect" },
      ]);
    } catch {
      setError("Something went wrong sending your message.");
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
          <p className="text-sm text-neutral-400">Start a conversation whenever you&apos;re ready.</p>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {limitReached ? (
        <p className="rounded-md border border-neutral-200 p-3 text-sm text-neutral-500 dark:border-neutral-800">
          You&apos;ve reached today&apos;s message limit on the Starter plan. Upgrade for unlimited spiritual
          chat, or come back tomorrow.
        </p>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your heart…"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
