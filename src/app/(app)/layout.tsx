import { requireOnboardedUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";
import { ArtJobWatcher } from "@/components/art/ArtJobWatcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, subscription } = await requireOnboardedUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar showTeam={Boolean(profile.team_id)} />
      <div className="flex flex-1 flex-col">
        <TopBar profile={profile} subscription={subscription} />
        <main className="flex-1 p-6">{children}</main>
        <ArtJobWatcher />
      </div>
    </div>
  );
}
