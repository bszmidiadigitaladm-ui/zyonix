import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { APP_NAME } from "@/lib/config";

// Bounds memory for accounts with very long histories; anything past this is
// available on request via support.
const ROW_LIMIT = 10000;

/**
 * Everything the given user has created or that is tied to them, as one
 * portable object (LGPD art. 18 V / GDPR art. 20).
 *
 * Every query filters by the user's id explicitly, so it is correct with
 * either client: the user's own (RLS is then a second lock — the self-service
 * route) or the service role (an admin fulfilling a verified data request).
 * Rows a teammate merely shared with the user are deliberately not included.
 */
export async function buildAccountExport(
  client: SupabaseClient<Database>,
  user: { id: string; email?: string | null; created_at?: string },
) {
  const uid = user.id;

  const [
    profile,
    subscriptions,
    artGenerations,
    socialPosts,
    videos,
    devotionalNotes,
    messageOutlines,
    chatConversations,
    chatMessages,
    readingPlans,
    readingProgress,
    bibleFavorites,
    quizSessions,
    prayerRequests,
    badges,
    usageLog,
  ] = await Promise.all([
    client.from("profiles").select("*").eq("id", uid).maybeSingle(),
    client.from("subscriptions").select("*").eq("owner_id", uid).limit(ROW_LIMIT),
    client.from("bible_art_generations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("social_post_generations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("video_generations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("devotional_notes").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("message_outlines").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("spiritual_chat_conversations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("spiritual_chat_messages").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("user_reading_plans").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("reading_progress").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("bible_favorites").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("quiz_sessions").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("prayer_requests").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("user_badges").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    client.from("ai_usage_log").select("*").eq("user_id", uid).limit(ROW_LIMIT),
  ]);

  // Church workspace data belongs to the team, so only its owner exports it.
  let church: Record<string, unknown> | undefined;
  const teamId = profile.data?.team_id;
  if (teamId && profile.data?.team_role === "owner") {
    const [team, contacts, events, communications, finances] = await Promise.all([
      client.from("teams").select("*").eq("id", teamId).maybeSingle(),
      client.from("church_contacts").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
      client.from("church_events").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
      client.from("communications").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
      client.from("financial_transactions").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
    ]);
    church = {
      team: team.data,
      contacts: contacts.data ?? [],
      events: events.data ?? [],
      communications: communications.data ?? [],
      finances: finances.data ?? [],
    };
  }

  return {
    exported_at: new Date().toISOString(),
    service: APP_NAME,
    account: { id: uid, email: user.email, created_at: user.created_at },
    profile: profile.data,
    subscriptions: subscriptions.data ?? [],
    content: {
      bible_art: artGenerations.data ?? [],
      social_posts: socialPosts.data ?? [],
      videos: videos.data ?? [],
      devotional_notes: devotionalNotes.data ?? [],
      message_outlines: messageOutlines.data ?? [],
    },
    spiritual_chat: {
      conversations: chatConversations.data ?? [],
      messages: chatMessages.data ?? [],
    },
    prayer_journal: prayerRequests.data ?? [],
    bible: {
      reading_plans: readingPlans.data ?? [],
      reading_progress: readingProgress.data ?? [],
      favorites: bibleFavorites.data ?? [],
    },
    games: { quiz_sessions: quizSessions.data ?? [], badges: badges.data ?? [] },
    usage_log: usageLog.data ?? [],
    ...(church ? { church } : {}),
  };
}

/** Standard download response headers for an export file. */
export function exportFilename(): string {
  return `${APP_NAME.toLowerCase()}-data-${new Date().toISOString().slice(0, 10)}.json`;
}
