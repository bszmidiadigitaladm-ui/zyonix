import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MessageForm } from "@/components/message/MessageForm";
import { OutlineDisplay } from "@/components/message/OutlineDisplay";
import type { MessageOutline } from "@/lib/openai/text";

export default async function MessagePage() {
  const { profile } = await requireOnboardedUser();
  const t = await getTranslations("message");
  const supabase = await createClient();

  const query = supabase
    .from("message_outlines")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: history } = profile.team_id
    ? await query.or(`user_id.eq.${profile.id},team_id.eq.${profile.team_id}`)
    : await query.eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <MessageForm />

      {history && history.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold">{t("history")}</h2>
          <div className="flex flex-col gap-4">
            {history.map((item) => (
              <details key={item.id} className="group">
                <summary className="cursor-pointer rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-surface-raised">
                  {item.topic}
                  <span className="ml-2 text-xs text-muted">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </summary>
                <div className="mt-3">
                  <OutlineDisplay outline={item.outline as unknown as MessageOutline} />
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
