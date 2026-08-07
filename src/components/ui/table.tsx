import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={["w-full text-sm", className].join(" ")} {...props} />;
}

export function Thead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={["border-b-2 border-divider text-left", className].join(" ")}
      {...props}
    />
  );
}

export function Th({
  num = false,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return (
    <th
      className={[
        "py-3 pr-4 text-[11px] font-semibold tracking-[0.1em] text-foreground/55 uppercase",
        num ? "text-right" : "text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function Td({
  num = false,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return (
    <td
      className={["py-3 pr-4", num ? "text-right" : "text-left", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
