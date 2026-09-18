import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/auth";
import { runUserAction, userActionSchema } from "@/lib/admin/user-actions";

export async function POST(request: Request, { params }: RouteContext<"/api/admin/users/[id]">) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = userActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_request" }, { status: 400 });
  }

  try {
    const result = await runUserAction(auth.ctx, id, parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    console.error("Admin user action failed", err);
    const auditFailure = err instanceof Error && err.message === "audit_log_failed";
    return NextResponse.json(
      { error: auditFailure ? "Could not write the audit log, so nothing was changed" : "Action failed" },
      { status: 500 },
    );
  }
}
