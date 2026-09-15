// Hand-written until `supabase gen types typescript` is run against a real
// project (see README.md) — keep in sync with supabase/migrations/*.sql.
//
// IMPORTANT: every table's Row/Insert/Update below must stay a fully inlined
// object literal, never a reference to a named interface/type alias. Supabase's
// query builder resolves column types through deeply nested conditional types
// keyed off the *literal* shape at each Tables[table] position; routing a Row
// through an indirection (`Row: SomeInterface`) makes that resolution collapse
// to `never` on every `.select()`/`.eq()`/etc. This matches what the real
// codegen output always does — inline everything, never share a Row interface.

export type PlanCode = "starter" | "creator" | "church_pro";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";
export type TeamRole = "owner" | "member";
export type ReminderSlot = "morning" | "afternoon" | "evening";
export type CreditType = "image" | "text" | "video";
export type ChatRole = "user" | "assistant" | "system";
export type ChatMessageType = "normal" | "crisis_redirect";
export type ConversationStatus = "active" | "crisis_flagged" | "closed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          team_id: string | null;
          team_role: TeamRole | null;
          daily_reminder_enabled: boolean;
          reminder_slot: ReminderSlot;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          team_id?: string | null;
          team_role?: TeamRole | null;
          daily_reminder_enabled?: boolean;
          reminder_slot?: ReminderSlot;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          team_id?: string | null;
          team_role?: TeamRole | null;
          daily_reminder_enabled?: boolean;
          reminder_slot?: ReminderSlot;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          code: PlanCode;
          display_name: string;
          stripe_price_id: string;
          monthly_price_usd: number;
          is_team_plan: boolean;
          sort_order: number;
        };
        Insert: {
          code: PlanCode;
          display_name: string;
          stripe_price_id: string;
          monthly_price_usd: number;
          is_team_plan?: boolean;
          sort_order: number;
        };
        Update: {
          code?: PlanCode;
          display_name?: string;
          stripe_price_id?: string;
          monthly_price_usd?: number;
          is_team_plan?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      plan_limits: {
        Row: {
          plan_code: PlanCode;
          image_credits_per_cycle: number;
          text_credits_per_cycle: number;
          video_credits_per_cycle: number;
          spiritual_chat_daily_cap: number | null;
          max_output_resolution: string;
          watermark: boolean;
          allow_carousel_export: boolean;
          allow_seasonal_templates: boolean;
          max_team_seats: number | null;
          updated_at: string;
        };
        Insert: {
          plan_code: PlanCode;
          image_credits_per_cycle: number;
          text_credits_per_cycle: number;
          video_credits_per_cycle?: number;
          spiritual_chat_daily_cap?: number | null;
          max_output_resolution: string;
          watermark?: boolean;
          allow_carousel_export?: boolean;
          allow_seasonal_templates?: boolean;
          max_team_seats?: number | null;
          updated_at?: string;
        };
        Update: {
          plan_code?: PlanCode;
          image_credits_per_cycle?: number;
          text_credits_per_cycle?: number;
          video_credits_per_cycle?: number;
          spiritual_chat_daily_cap?: number | null;
          max_output_resolution?: string;
          watermark?: boolean;
          allow_carousel_export?: boolean;
          allow_seasonal_templates?: boolean;
          max_team_seats?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          team_id: string | null;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          plan_code: PlanCode;
          status: SubscriptionStatus;
          trial_end: string | null;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          team_id?: string | null;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          plan_code: PlanCode;
          status: SubscriptionStatus;
          trial_end?: string | null;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          team_id?: string | null;
          stripe_subscription_id?: string;
          stripe_customer_id?: string;
          plan_code?: PlanCode;
          status?: SubscriptionStatus;
          trial_end?: string | null;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credits_balance: {
        Row: {
          id: string;
          owner_id: string;
          is_team: boolean;
          subscription_id: string;
          image_credits_remaining: number;
          text_credits_remaining: number;
          video_credits_remaining: number;
          cycle_start: string;
          cycle_end: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          is_team?: boolean;
          subscription_id: string;
          image_credits_remaining?: number;
          text_credits_remaining?: number;
          video_credits_remaining?: number;
          cycle_start: string;
          cycle_end: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          is_team?: boolean;
          subscription_id?: string;
          image_credits_remaining?: number;
          text_credits_remaining?: number;
          video_credits_remaining?: number;
          cycle_start?: string;
          cycle_end?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_log: {
        Row: {
          id: number;
          user_id: string;
          team_id: string | null;
          plan_code: PlanCode;
          feature: "bible_art" | "post_caption" | "devotional" | "spiritual_chat" | "message_outline" | "video";
          provider: string;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          image_count: number | null;
          estimated_cost_usd: number | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          team_id?: string | null;
          plan_code: PlanCode;
          feature: "bible_art" | "post_caption" | "devotional" | "spiritual_chat" | "message_outline" | "video";
          provider?: string;
          model: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          image_count?: number | null;
          estimated_cost_usd?: number | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          team_id?: string | null;
          plan_code?: PlanCode;
          feature?: "bible_art" | "post_caption" | "devotional" | "spiritual_chat" | "message_outline" | "video";
          provider?: string;
          model?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          image_count?: number | null;
          estimated_cost_usd?: number | null;
          request_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bible_art_generations: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          verse_reference: string | null;
          theme: string | null;
          style: string;
          output_format: "square" | "story";
          prompt_used: string;
          image_url: string;
          thumbnail_url: string | null;
          resolution: string;
          watermarked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          verse_reference?: string | null;
          theme?: string | null;
          style: string;
          output_format: "square" | "story";
          prompt_used: string;
          image_url: string;
          thumbnail_url?: string | null;
          resolution: string;
          watermarked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string | null;
          verse_reference?: string | null;
          theme?: string | null;
          style?: string;
          output_format?: "square" | "story";
          prompt_used?: string;
          image_url?: string;
          thumbnail_url?: string | null;
          resolution?: string;
          watermarked?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      social_post_generations: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          template_id: string | null;
          format: "feed" | "story" | "carousel";
          caption_text: string | null;
          verse_reference: string | null;
          export_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          template_id?: string | null;
          format: "feed" | "story" | "carousel";
          caption_text?: string | null;
          verse_reference?: string | null;
          export_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string | null;
          template_id?: string | null;
          format?: "feed" | "story" | "carousel";
          caption_text?: string | null;
          verse_reference?: string | null;
          export_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      seasonal_templates: {
        Row: {
          id: string;
          occasion: string;
          name: string;
          preview_url: string;
          asset_url: string;
          is_exclusive: boolean;
          media_type: "image" | "video";
          created_at: string;
        };
        Insert: {
          id?: string;
          occasion: string;
          name: string;
          preview_url: string;
          asset_url: string;
          is_exclusive?: boolean;
          media_type?: "image" | "video";
          created_at?: string;
        };
        Update: {
          id?: string;
          occasion?: string;
          name?: string;
          preview_url?: string;
          asset_url?: string;
          is_exclusive?: boolean;
          media_type?: "image" | "video";
          created_at?: string;
        };
        Relationships: [];
      };
      video_generations: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          prompt: string;
          duration_seconds: number;
          status: "pending" | "processing" | "succeeded" | "failed";
          video_url: string | null;
          thumbnail_url: string | null;
          runway_job_id: string | null;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          prompt: string;
          duration_seconds: number;
          status?: "pending" | "processing" | "succeeded" | "failed";
          video_url?: string | null;
          thumbnail_url?: string | null;
          runway_job_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string | null;
          prompt?: string;
          duration_seconds?: number;
          status?: "pending" | "processing" | "succeeded" | "failed";
          video_url?: string | null;
          thumbnail_url?: string | null;
          runway_job_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      devotionals: {
        Row: {
          id: string;
          publish_date: string;
          title: string;
          body: string;
          scripture_reference: string | null;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          publish_date: string;
          title: string;
          body: string;
          scripture_reference?: string | null;
          audio_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          publish_date?: string;
          title?: string;
          body?: string;
          scripture_reference?: string | null;
          audio_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      devotional_notes: {
        Row: {
          id: string;
          user_id: string;
          devotional_id: string;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          devotional_id: string;
          note: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          devotional_id?: string;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_outlines: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          topic: string;
          audience: string;
          duration_minutes: number;
          style: string;
          tone: string;
          outline: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          topic: string;
          audience: string;
          duration_minutes: number;
          style: string;
          tone: string;
          outline: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string | null;
          topic?: string;
          audience?: string;
          duration_minutes?: number;
          style?: string;
          tone?: string;
          outline?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      spiritual_chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          status: ConversationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          status?: ConversationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      spiritual_chat_messages: {
        Row: {
          id: number;
          conversation_id: string;
          user_id: string;
          role: ChatRole;
          content: string;
          is_crisis_flagged: boolean;
          moderation_categories: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          conversation_id: string;
          user_id: string;
          role: ChatRole;
          content: string;
          is_crisis_flagged?: boolean;
          moderation_categories?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          conversation_id?: string;
          user_id?: string;
          role?: ChatRole;
          content?: string;
          is_crisis_flagged?: boolean;
          moderation_categories?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      crisis_flags: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          message_id: number;
          detection_source: "openai_moderation" | "keyword_fallback" | "both";
          severity: "high" | "medium";
          reviewed: boolean;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          message_id: number;
          detection_source: "openai_moderation" | "keyword_fallback" | "both";
          severity: "high" | "medium";
          reviewed?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          message_id?: number;
          detection_source?: "openai_moderation" | "keyword_fallback" | "both";
          severity?: "high" | "medium";
          reviewed?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          subscription_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          subscription_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          subscription_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          invited_by: string;
          token: string;
          status: "pending" | "accepted" | "expired";
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          email: string;
          invited_by: string;
          token: string;
          status?: "pending" | "accepted" | "expired";
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          email?: string;
          invited_by?: string;
          token?: string;
          status?: "pending" | "accepted" | "expired";
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      bible_translations: {
        Row: { code: string; language: "en" | "es"; name: string; license: string };
        Insert: { code: string; language: "en" | "es"; name: string; license?: string };
        Update: { code?: string; language?: "en" | "es"; name?: string; license?: string };
        Relationships: [];
      };
      bible_books: {
        Row: { code: string; testament: "ot" | "nt"; sort_order: number; chapter_count: number };
        Insert: { code: string; testament: "ot" | "nt"; sort_order: number; chapter_count: number };
        Update: { code?: string; testament?: "ot" | "nt"; sort_order?: number; chapter_count?: number };
        Relationships: [];
      };
      bible_verses: {
        Row: {
          id: number;
          translation_code: string;
          book_code: string;
          chapter: number;
          verse: number;
          text: string;
        };
        Insert: {
          id?: number;
          translation_code: string;
          book_code: string;
          chapter: number;
          verse: number;
          text: string;
        };
        Update: {
          id?: number;
          translation_code?: string;
          book_code?: string;
          chapter?: number;
          verse?: number;
          text?: string;
        };
        Relationships: [];
      };
      reading_plans: {
        Row: { id: string; duration_days: number; sort_order: number };
        Insert: { id: string; duration_days: number; sort_order: number };
        Update: { id?: string; duration_days?: number; sort_order?: number };
        Relationships: [];
      };
      reading_plan_days: {
        Row: { id: number; plan_id: string; day_number: number; readings: Record<string, unknown>[] };
        Insert: { id?: number; plan_id: string; day_number: number; readings: Record<string, unknown>[] };
        Update: { id?: number; plan_id?: string; day_number?: number; readings?: Record<string, unknown>[] };
        Relationships: [];
      };
      user_reading_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          current_day: number;
          started_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          current_day?: number;
          started_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          current_day?: number;
          started_at?: string;
        };
        Relationships: [];
      };
      reading_progress: {
        Row: { id: number; user_id: string; book_code: string; chapter: number; completed_at: string };
        Insert: { id?: number; user_id: string; book_code: string; chapter: number; completed_at?: string };
        Update: { id?: number; user_id?: string; book_code?: string; chapter?: number; completed_at?: string };
        Relationships: [];
      };
      bible_favorites: {
        Row: {
          id: string;
          user_id: string;
          book_code: string;
          chapter: number;
          verse: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_code: string;
          chapter: number;
          verse?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_code?: string;
          chapter?: number;
          verse?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bible_study_resources: {
        Row: {
          id: string;
          category: "map" | "timeline" | "context";
          title: string;
          body: string;
          image_url: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          category: "map" | "timeline" | "context";
          title: string;
          body: string;
          image_url?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          category?: "map" | "timeline" | "context";
          title?: string;
          body?: string;
          image_url?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          category: "old_testament" | "new_testament" | "people" | "miracles" | "general";
          difficulty: "easy" | "medium" | "hard";
          question: string;
          options: string[];
          correct_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: "old_testament" | "new_testament" | "people" | "miracles" | "general";
          difficulty: "easy" | "medium" | "hard";
          question: string;
          options: string[];
          correct_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: "old_testament" | "new_testament" | "people" | "miracles" | "general";
          difficulty?: "easy" | "medium" | "hard";
          question?: string;
          options?: string[];
          correct_index?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          total_questions: number;
          display_name: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          total_questions: number;
          display_name: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          total_questions?: number;
          display_name?: string;
          completed_at?: string;
        };
        Relationships: [];
      };
      church_contacts: {
        Row: { id: string; team_id: string; name: string; email: string; created_at: string };
        Insert: { id?: string; team_id: string; name: string; email: string; created_at?: string };
        Update: { id?: string; team_id?: string; name?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      church_events: {
        Row: {
          id: string;
          team_id: string;
          title: string;
          description: string | null;
          event_date: string;
          reminder_days_before: number;
          reminder_sent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          title: string;
          description?: string | null;
          event_date: string;
          reminder_days_before?: number;
          reminder_sent?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          title?: string;
          description?: string | null;
          event_date?: string;
          reminder_days_before?: number;
          reminder_sent?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      communications: {
        Row: {
          id: string;
          team_id: string;
          sent_by: string;
          subject: string;
          body: string;
          template_type: "custom" | "sunday_bulletin" | "event_reminder";
          recipient_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          sent_by: string;
          subject: string;
          body: string;
          template_type?: "custom" | "sunday_bulletin" | "event_reminder";
          recipient_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          sent_by?: string;
          subject?: string;
          body?: string;
          template_type?: "custom" | "sunday_bulletin" | "event_reminder";
          recipient_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: { code: string; name: string; description: string; icon_key: string };
        Insert: { code: string; name: string; description: string; icon_key: string };
        Update: { code?: string; name?: string; description?: string; icon_key?: string };
        Relationships: [];
      };
      user_badges: {
        Row: { id: string; user_id: string; badge_code: string; earned_at: string };
        Insert: { id?: string; user_id: string; badge_code: string; earned_at?: string };
        Update: { id?: string; user_id?: string; badge_code?: string; earned_at?: string };
        Relationships: [];
      };
      financial_transactions: {
        Row: {
          id: string;
          team_id: string;
          type: "income" | "expense";
          amount_usd: number;
          category: string;
          description: string | null;
          occurred_on: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          type: "income" | "expense";
          amount_usd: number;
          category: string;
          description?: string | null;
          occurred_on: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          type?: "income" | "expense";
          amount_usd?: number;
          category?: string;
          description?: string | null;
          occurred_on?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      prayer_requests: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          is_answered: boolean;
          answered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          is_answered?: boolean;
          answered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          is_answered?: boolean;
          answered_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_credit: {
        Args: { p_owner_id: string; p_credit_type: string; p_amount?: number };
        Returns: { success: boolean; remaining: number }[];
      };
      refund_credit: {
        Args: { p_owner_id: string; p_credit_type: string; p_amount?: number };
        Returns: undefined;
      };
      reset_credits: {
        Args: { p_subscription_id: string; p_cycle_start: string; p_cycle_end: string };
        Returns: undefined;
      };
      get_leaderboard: {
        Args: { p_limit?: number };
        Returns: { display_name: string; best_score: number }[];
      };
      get_random_quiz_questions: {
        Args: { p_count?: number };
        Returns: {
          id: string;
          category: "old_testament" | "new_testament" | "people" | "miracles" | "general";
          difficulty: "easy" | "medium" | "hard";
          question: string;
          options: string[];
          correct_index: number;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience aliases for use throughout the app — derived from Database via
// indexed access (safe), never fed back into it (see note at top of file).
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type PlanLimits = Database["public"]["Tables"]["plan_limits"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type CreditsBalance = Database["public"]["Tables"]["credits_balance"]["Row"];
export type AiUsageLog = Database["public"]["Tables"]["ai_usage_log"]["Row"];
export type BibleArtGeneration = Database["public"]["Tables"]["bible_art_generations"]["Row"];
export type SocialPostGeneration = Database["public"]["Tables"]["social_post_generations"]["Row"];
export type SeasonalTemplate = Database["public"]["Tables"]["seasonal_templates"]["Row"];
export type Devotional = Database["public"]["Tables"]["devotionals"]["Row"];
export type DevotionalNote = Database["public"]["Tables"]["devotional_notes"]["Row"];
export type MessageOutlineRow = Database["public"]["Tables"]["message_outlines"]["Row"];
export type VideoGeneration = Database["public"]["Tables"]["video_generations"]["Row"];
export type QuizQuestion = Database["public"]["Tables"]["quiz_questions"]["Row"];
export type QuizSession = Database["public"]["Tables"]["quiz_sessions"]["Row"];
export type PrayerRequest = Database["public"]["Tables"]["prayer_requests"]["Row"];
export type ChurchContact = Database["public"]["Tables"]["church_contacts"]["Row"];
export type ChurchEvent = Database["public"]["Tables"]["church_events"]["Row"];
export type Communication = Database["public"]["Tables"]["communications"]["Row"];
export type FinancialTransaction = Database["public"]["Tables"]["financial_transactions"]["Row"];
export type Badge = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type BibleTranslation = Database["public"]["Tables"]["bible_translations"]["Row"];
export type BibleBookRow = Database["public"]["Tables"]["bible_books"]["Row"];
export type BibleVerseRow = Database["public"]["Tables"]["bible_verses"]["Row"];
export type ReadingPlan = Database["public"]["Tables"]["reading_plans"]["Row"];
export type ReadingPlanDay = Database["public"]["Tables"]["reading_plan_days"]["Row"];
export type UserReadingPlan = Database["public"]["Tables"]["user_reading_plans"]["Row"];
export type ReadingProgress = Database["public"]["Tables"]["reading_progress"]["Row"];
export type BibleFavorite = Database["public"]["Tables"]["bible_favorites"]["Row"];
export type BibleStudyResource = Database["public"]["Tables"]["bible_study_resources"]["Row"];
export type SpiritualChatConversation =
  Database["public"]["Tables"]["spiritual_chat_conversations"]["Row"];
export type SpiritualChatMessage = Database["public"]["Tables"]["spiritual_chat_messages"]["Row"];
export type CrisisFlag = Database["public"]["Tables"]["crisis_flags"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInvite = Database["public"]["Tables"]["team_invites"]["Row"];
