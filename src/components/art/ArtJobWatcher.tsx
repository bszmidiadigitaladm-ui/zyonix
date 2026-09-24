"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ART_JOB_STARTED_EVENT, fetchArtJobs } from "@/lib/art/client";
import { fetchPosterJobs } from "@/lib/posters/client";

const STORAGE_KEY = "zyonix-art-watch";
const POLL_MS = 5000;

type JobKind = "art" | "poster";
// A tracked job is stored as "<kind>:<id>". Ids saved before posters existed have
// no prefix and are Bible art.
type TrackedJob = string;
type Notice = { id: string; kind: "ready" | "failed"; job: JobKind };

function parseTracked(entry: TrackedJob): { kind: JobKind; id: string } {
  const [prefix, ...rest] = entry.split(":");
  if (rest.length > 0 && (prefix === "art" || prefix === "poster")) return { kind: prefix, id: rest.join(":") };
  return { kind: "art", id: entry };
}

function loadIds(): TrackedJob[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveIds(ids: TrackedJob[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage blocked: the notice just won't survive a page reload
  }
}

/**
 * Lives in the app layout. Slow images (high-quality art, poster templates) are
 * generated in the background, so this keeps checking those jobs on any page and
 * shows a notice when one is done.
 */
export function ArtJobWatcher() {
  const tArt = useTranslations("art");
  const tTemplates = useTranslations("templates");
  const router = useRouter();
  // Nothing rendered depends on the ids, so reading storage here can't cause a
  // hydration mismatch; it only decides whether to start polling.
  const [ids, setIds] = useState<TrackedJob[]>(() => (typeof window === "undefined" ? [] : loadIds()));
  const [notices, setNotices] = useState<Notice[]>([]);
  const idsRef = useRef<TrackedJob[]>(ids);

  function updateIds(next: TrackedJob[]) {
    idsRef.current = next;
    saveIds(next);
    setIds(next);
  }

  useEffect(() => {
    function onStarted(e: Event) {
      const detail = (e as CustomEvent<{ id?: string; kind?: JobKind }>).detail;
      if (!detail?.id) return;
      const entry = `${detail.kind ?? "art"}:${detail.id}`;
      if (!idsRef.current.includes(entry)) updateIds([...idsRef.current, entry]);
    }
    window.addEventListener(ART_JOB_STARTED_EVENT, onStarted);
    return () => window.removeEventListener(ART_JOB_STARTED_EVENT, onStarted);
  }, []);

  const watching = ids.length > 0;
  useEffect(() => {
    if (!watching) return;

    async function check() {
      const tracked = idsRef.current.map(parseTracked);
      const [artJobs, posterJobs] = await Promise.all([
        tracked.some((j) => j.kind === "art") ? fetchArtJobs() : Promise.resolve([]),
        tracked.some((j) => j.kind === "poster") ? fetchPosterJobs() : Promise.resolve([]),
      ]);
      // A failed request says nothing about the jobs, so wait for the next poll.
      if (!artJobs || !posterJobs) return;

      const finished: Notice[] = [];
      const stillRunning: TrackedJob[] = [];
      for (const { kind, id } of tracked) {
        const job = (kind === "art" ? artJobs : posterJobs).find((j) => j.id === id);
        if (!job || job.status === "failed") {
          // A job that vanished from the list is treated as failed too.
          finished.push({ id, kind: "failed", job: kind });
        } else if (job.status === "completed") {
          finished.push({ id, kind: "ready", job: kind });
        } else {
          stillRunning.push(`${kind}:${id}`);
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
      {notices.map((n) => {
        const isPoster = n.job === "poster";
        const message =
          n.kind === "ready"
            ? isPoster
              ? tTemplates("notifyReady")
              : tArt("notifyReady")
            : isPoster
              ? tTemplates("notifyFailed")
              : tArt("notifyFailed");
        return (
          <div
            key={n.id}
            className="rounded-2xl border border-accent/40 bg-surface-raised p-4 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]"
          >
            <p className="text-sm font-medium">{message}</p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              {n.kind === "ready" && (
                <Link
                  href={isPoster ? "/templates/mine" : "/art/gallery"}
                  onClick={() => dismiss(n.id)}
                  className="font-medium text-accent hover:underline"
                >
                  {isPoster ? tTemplates("notifyView") : tArt("notifyView")}
                </Link>
              )}
              <button type="button" onClick={() => dismiss(n.id)} className="text-muted hover:text-foreground">
                {tArt("notifyDismiss")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
