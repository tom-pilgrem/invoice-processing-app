import { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-foreground/70"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "w-full border border-divider bg-surface px-3 py-2 text-sm text-foreground",
        "placeholder:text-foreground/40 focus:border-accent-500 focus:outline-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function CheckboxDot({
  label,
  hideLabel = false,
  wrapperClassName = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hideLabel?: boolean;
  wrapperClassName?: string;
}) {
  return (
    <label className={["inline-flex items-center gap-2 text-sm", wrapperClassName].join(" ")}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="inline-block h-3.5 w-3.5 shrink-0 border-2 border-divider peer-checked:border-accent peer-checked:bg-accent" />
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
    </label>
  );
}
