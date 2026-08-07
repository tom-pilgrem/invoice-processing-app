import { HTMLAttributes } from "react";

type Variant = "neutral" | "accent" | "outline";

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  neutral: "bg-neutral-100 text-neutral-800",
  accent: "bg-accent-100 text-accent-800",
  outline: "border border-divider text-foreground/80 bg-transparent",
};

export function Tag({ variant = "neutral", className = "", ...props }: TagProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function StatusDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={["inline-block h-2 w-2 shrink-0 bg-accent", className].join(" ")}
      aria-hidden="true"
    />
  );
}
