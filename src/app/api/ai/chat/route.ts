import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, isBillable } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/credits/config";
import { generateSpiritualChatReply, type ChatTurn } from "@/lib/openai/chat";
import { checkSelfHarmModeration } from "@/lib/openai/moderation";
import { matchesCrisisKeywords } from "@/lib/safety/crisis-keywords";
import { CRISIS_RESOURCES, CRISIS_REDIRECT_MESSAGE } from "@/lib/safety/crisis-resources";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

const HISTORY_TURNS = 10;

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { message } = parsed.data;

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const limits = await getPlanLimits(subscription.plan_code);

  // Spiritual chat is gated by a daily message cap, not the shared credit
  // pool — Starter gets a cap, Creator/Church Pro get unlimited (null cap).
  if (limits.spiritual_chat_daily_cap !== null) {
    const { count } = await supabase
      .from("spiritual_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", startOfTodayUtc());

    if ((count ?? 0) >= limits.spiritual_chat_daily_cap) {
      return NextResponse.json({ error: "daily_limit_reached" }, { status: 429 });
    }
  }

  let { data: conversation } = await supabase
    .from("spiritual_chat_conversations")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: created, error: createError } = await supabase
      .from("spiritual_chat_conversations")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (createError) {
      return NextResponse.json({ error: "conversation_create_failed" }, { status: 500 });
    }
    conversation = created;
  }

  // --- Crisis detection: runs before any normal reply is generated. ---
  const [moderation, keywordMatch] = await Promise.all([
    checkSelfHarmModeration(message),
    Promise.resolve(matchesCrisisKeywords(message)),
  ]);

  const crisisTriggered = moderation.selfHarmFlagged === true || keywordMatch;

  if (crisisTriggered) {
    const detectionSource =
      moderation.selfHarmFlagged === true && keywordMatch
        ? "both"
        : moderation.selfHarmFlagged === true
          ? "openai_moderation"
          : "keyword_fallback";

    const { data: userMessage, error: userMsgError } = await supabase
      .from("spiritual_chat_messages")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: message,
        is_crisis_flagged: true,
        moderation_categories: moderation.categories as unknown as Record<string, unknown> | null,
      })
      .select()
      .single();

    if (userMsgError) {
      return NextResponse.json({ error: "message_save_failed" }, { status: 500 });
    }

    await supabase.from("spiritual_chat_messages").insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: "assistant",
      content: CRISIS_REDIRECT_MESSAGE,
      is_crisis_flagged: true,
    });

    await supabase
      .from("spiritual_chat_conversations")
      .update({ status: "crisis_flagged" })
      .eq("id", conversation.id);

    // crisis_flags has zero RLS grants for authenticated/anon — service role only.
    const admin = createAdminClient();
    await admin.from("crisis_flags").insert({
      user_id: user.id,
      conversation_id: conversation.id,
      message_id: userMessage.id,
      detection_source: detectionSource,
      severity: "high",
    });

    return NextResponse.json({
      type: "crisis_redirect",
      message: CRISIS_REDIRECT_MESSAGE,
      resources: CRISIS_RESOURCES,
    });
  }

  // --- Normal flow ---
  const { data: recentMessages } = await supabase
    .from("spiritual_chat_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);

  const history: ChatTurn[] = (recentMessages ?? [])
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: "user", content: message });

  try {
    const reply = await generateSpiritualChatReply(history);

    await supabase.from("spiritual_chat_messages").insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: "user",
      content: message,
    });

    await supabase.from("spiritual_chat_messages").insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: "assistant",
      content: reply,
    });

    await supabase
      .from("spiritual_chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    const admin = createAdminClient();
    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      team_id: profile.team_id,
      plan_code: subscription.plan_code,
      feature: "spiritual_chat",
      model: "gpt-4.1-mini",
    });

    return NextResponse.json({ type: "normal", message: reply });
  } catch (err) {
    console.error("Spiritual chat generation failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
