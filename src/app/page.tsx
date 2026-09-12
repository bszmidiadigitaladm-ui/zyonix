import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">{APP_NAME}</h1>
      <p className="max-w-md text-sm text-neutral-500">
        Bible art, devotionals, and spiritual support for Christian creators.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Start free trial
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
