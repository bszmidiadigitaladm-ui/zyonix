import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { APP_NAME } from "@/lib/config";

// Bounds memory for accounts with very long histories; anything past this is
// available on request via support.
const ROW_LIMIT = 10000;

// Data-portability export (LGPD/GDPR): everything the signed-in user has
// created or that is tied to them, as one JSON file. Runs on the user's own
// Supabase client and filters by user id explicitly — RLS is a second lock,
// and rows a teammate shared with them are deliberately not included.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`account:export:${user.id}`, 5, 3600);
  if (limited) return limited;

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
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("owner_id", uid).limit(ROW_LIMIT),
    supabase.from("bible_art_generations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("social_post_generations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("video_generations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("devotional_notes").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("message_outlines").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("spiritual_chat_conversations").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("spiritual_chat_messages").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("user_reading_plans").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("reading_progress").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("bible_favorites").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("quiz_sessions").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("prayer_requests").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("user_badges").select("*").eq("user_id", uid).limit(ROW_LIMIT),
    supabase.from("ai_usage_log").select("*").eq("user_id", uid).limit(ROW_LIMIT),
  ]);

  // Church workspace data belongs to the team, so only its owner exports it.
  let church: Record<string, unknown> | undefined;
  const teamId = profile.data?.team_id;
  if (teamId && profile.data?.team_role === "owner") {
    const [team, contacts, events, communications, finances] = await Promise.all([
      supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
      supabase.from("church_contacts").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
      supabase.from("church_events").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
      supabase.from("communications").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
      supabase.from("financial_transactions").select("*").eq("team_id", teamId).limit(ROW_LIMIT),
    ]);
    church = {
      team: team.data,
      contacts: contacts.data ?? [],
      events: events.data ?? [],
      communications: communications.data ?? [],
      finances: finances.data ?? [],
    };
  }

  const payload = {
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

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${APP_NAME.toLowerCase()}-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
