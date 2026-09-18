import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAccountExport, exportFilename } from "@/lib/account/export";

// Fulfils a verified data-subject access/portability request (LGPD art. 18 II
// and V) on the user's behalf. This reads the person's full content, so it is
// POST-only (never cached or prefetched), needs a written reason such as the
// request reference, and is logged before any data is read.
const bodySchema = z.object({ reason: z.string().trim().min(5).max(500) });

export async function POST(request: Request, { params }: RouteContext<"/api/admin/users/[id]/export">) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A reason (e.g. the request reference) is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: authUser, error } = await admin.auth.admin.getUserById(id);
  if (error || !authUser.user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  try {
    await logAdminAction(auth.ctx, {
      action: "user.export_data",
      targetUserId: id,
      targetEmail: authUser.user.email ?? null,
      reason: parsed.data.reason,
    });
  } catch {
    return NextResponse.json({ error: "Could not write the audit log, so nothing was exported" }, { status: 500 });
  }

  const payload = await buildAccountExport(admin, authUser.user);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
