export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-[50%] border-2 border-neutral-300 border-t-accent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDuration: "0.8s" }}
    />
  );
}
