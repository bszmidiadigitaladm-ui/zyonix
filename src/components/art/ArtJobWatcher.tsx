"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ART_JOB_STARTED_EVENT, fetchArtJobs } from "@/lib/art/client";

const STORAGE_KEY = "zyonix-art-watch";
const POLL_MS = 5000;

type Notice = { id: string; kind: "ready" | "failed" };

function loadIds(): string[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveIds(ids: string[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage blocked: the notice just won't survive a page reload
  }
}

/**
 * Lives in the app layout. High-quality art is generated in the background, so
 * this keeps checking those jobs on any page and shows a notice when one is done.
 */
export function ArtJobWatcher() {
  const t = useTranslations("art");
  const router = useRouter();
  // Nothing rendered depends on the ids, so reading storage here can't cause a
  // hydration mismatch; it only decides whether to start polling.
  const [ids, setIds] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadIds()));
  const [notices, setNotices] = useState<Notice[]>([]);
  const idsRef = useRef<string[]>(ids);

  function updateIds(next: string[]) {
    idsRef.current = next;
    saveIds(next);
    setIds(next);
  }

  useEffect(() => {
    function onStarted(e: Event) {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (id && !idsRef.current.includes(id)) updateIds([...idsRef.current, id]);
    }
    window.addEventListener(ART_JOB_STARTED_EVENT, onStarted);
    return () => window.removeEventListener(ART_JOB_STARTED_EVENT, onStarted);
  }, []);

  const watching = ids.length > 0;
  useEffect(() => {
    if (!watching) return;

    async function check() {
      const jobs = await fetchArtJobs();
      if (!jobs) return;

      const finished: Notice[] = [];
      const stillRunning: string[] = [];
      for (const id of idsRef.current) {
        const job = jobs.find((j) => j.id === id);
        if (!job || job.status === "failed") {
          // A job that vanished from the list is treated as failed too.
          finished.push({ id, kind: "failed" });
        } else if (job.status === "completed") {
          finished.push({ id, kind: "ready" });
        } else {
          stillRunning.push(id);
        }
      }

      if (finished.length > 0) {
        updateIds(stillRunning);
        setNotices((prev) => [...prev, ...finished]);
        if (finished.some((n) => n.kind === "ready")) router.refresh();
      }
    }

    const timer = setInterval(check, POLL_MS);
    void check();
    return () => clearInterval(timer);
  }, [watching, router]);

  if (notices.length === 0) return null;

  const dismiss = (id: string) => setNotices((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2" role="status">
      {notices.map((n) => (
        <div
          key={n.id}
          className="rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]"
        >
          <p className="text-sm font-medium">{n.kind === "ready" ? t("notifyReady") : t("notifyFailed")}</p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            {n.kind === "ready" && (
              <Link
                href="/art/gallery"
                onClick={() => dismiss(n.id)}
                className="font-medium text-accent hover:underline"
              >
                {t("notifyView")}
              </Link>
            )}
            <button type="button" onClick={() => dismiss(n.id)} className="text-muted hover:text-foreground">
              {t("notifyDismiss")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
