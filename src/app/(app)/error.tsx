"use client";

import { ErrorView } from "@/components/errors/ErrorView";

// Lives inside the app layout, so a crash in one page keeps the sidebar and top bar usable.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
