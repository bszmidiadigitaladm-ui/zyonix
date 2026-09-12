import { cn } from "@/lib/utils";

export function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          role === "user"
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200",
        )}
      >
        {content}
      </div>
    </div>
  );
}
