import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireAdminForMfa } from "@/lib/admin/auth";
import { Card } from "@/components/ui/Card";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";
import { MfaSetup } from "@/components/admin/MfaSetup";

export const metadata: Metadata = { title: "Admin verification", robots: { index: false, follow: false } };

export default async function AdminMfaPage() {
  const ctx = await requireAdminForMfa();
  if (ctx.aal === "aal2") redirect("/admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <GlowBackdrop />
      <Card className="relative z-10 w-full max-w-sm">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={22} className="text-accent" />
          <h1 className="text-xl font-semibold">Admin verification</h1>
        </div>
        <MfaSetup hasFactor={ctx.hasFactor} />
      </Card>
    </div>
  );
}
