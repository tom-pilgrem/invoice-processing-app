import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent border-accent text-background hover:bg-accent-600 hover:border-accent-600 active:bg-accent-700 active:border-accent-700",
  secondary:
    "bg-transparent border-divider text-foreground hover:bg-neutral-100 active:bg-neutral-200",
  ghost:
    "bg-transparent border-transparent text-accent hover:text-accent-700 active:text-accent-800",
};

export function Button({
  variant = "primary",
  block = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-start gap-2 border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variantClasses[variant],
        block ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
