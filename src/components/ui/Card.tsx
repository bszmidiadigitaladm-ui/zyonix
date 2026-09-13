import { cn } from "@/lib/utils";

type CardProps<T extends React.ElementType> = {
  as?: T;
} & React.ComponentPropsWithoutRef<T>;

export function Card<T extends React.ElementType = "div">({
  as,
  className,
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={cn(
        "rounded-2xl border border-border bg-gradient-to-b from-surface-raised/70 to-surface p-6",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_12px_32px_-20px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    />
  );
}
