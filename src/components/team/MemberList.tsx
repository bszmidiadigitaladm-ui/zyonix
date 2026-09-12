"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  team_role: "owner" | "member" | null;
}

export function MemberList({ members, isOwner }: { members: Member[]; isOwner: boolean }) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    try {
      await fetch("/api/team/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
      {members.map((m) => (
        <li key={m.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <span className="font-medium">{m.full_name ?? m.email}</span>{" "}
            <span className="text-xs text-neutral-500">{m.team_role}</span>
          </div>
          {isOwner && m.team_role !== "owner" && (
            <button
              onClick={() => handleRemove(m.id)}
              disabled={removingId === m.id}
              className="text-xs font-medium text-red-600 underline disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
