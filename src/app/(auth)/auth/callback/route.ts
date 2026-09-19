import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both the OAuth (PKCE) redirect and the email-confirmation link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding/plan";

  // Supabase reports provider/signup problems (e.g. "Database error saving new
  // user", "Signups not allowed") as ?error_description=… instead of a code.
  let reason = searchParams.get("error_description") ?? searchParams.get("error") ?? "missing_code";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    reason = error.message;
  }

  // Keep the cause: it used to be dropped, which made failed sign-ins undiagnosable.
  console.error("Auth callback failed", { reason, hadCode: Boolean(code), errorCode: searchParams.get("error_code") });
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(reason.slice(0, 200))}`,
  );
}
