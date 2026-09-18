import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";

// Never indexed, and kept out of the app's own navigation.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Layouts don't re-run on client-side navigation, so every page below
  // repeats this check; this one covers the first paint and the shell.
  const ctx = await requireAdminPage();

  return (
    <div className="flex min-h-screen">
      <AdminNav email={ctx.email} />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
