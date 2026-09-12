import { cn } from "@/lib/utils";

export function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          role === "user"
            ? "bg-accent text-accent-foreground"
            : "bg-surface-raised text-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}
