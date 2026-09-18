import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database.types";
import type { AdminContext } from "@/lib/admin/auth";

export interface AuditEntry {
  action: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  reason?: string | null;
  details?: Json;
}

/**
 * Records an administrative access or action. Callers write the entry BEFORE
 * doing the thing, and abandon the action if this throws — an admin operation
 * must never happen without leaving a trace.
 */
export async function logAdminAction(ctx: AdminContext, entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_audit_log").insert({
    admin_id: ctx.userId,
    admin_email: ctx.email,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    target_email: entry.targetEmail ?? null,
    reason: entry.reason ?? null,
    details: entry.details ?? null,
  });
  if (error) {
    console.error("Admin audit log write failed", error);
    throw new Error("audit_log_failed");
  }
}
