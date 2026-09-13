import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/credits/config";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatWindow } from "@/components/chat/ChatWindow";

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export default async function ChatPage() {
  const { user, subscription } = await requireOnboardedUser();
  const t = await getTranslations("chat");
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("spiritual_chat_conversations")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialMessages: { role: "user" | "assistant"; content: string; crisis?: boolean }[] = [];

  if (conversation) {
    const { data: messages } = await supabase
      .from("spiritual_chat_messages")
      .select("role, content, is_crisis_flagged")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(50);

    initialMessages = (messages ?? [])
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        crisis: m.is_crisis_flagged && m.role === "assistant",
      }));
  }

  const limits = await getPlanLimits(subscription!.plan_code);
  let dailyLimitReached = false;

  if (limits.spiritual_chat_daily_cap !== null) {
    const { count } = await supabase
      .from("spiritual_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", startOfTodayUtc());

    dailyLimitReached = (count ?? 0) >= limits.spiritual_chat_daily_cap;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <PageHeader icon={MessageCircle} title={t("title")} />
      <ChatWindow initialMessages={initialMessages} dailyLimitReached={dailyLimitReached} />
    </div>
  );
}
