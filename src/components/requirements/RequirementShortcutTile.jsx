import React from "react";
import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function RequirementShortcutTile({
  to,
  label,
  icon: Icon,
  active = false,
  testId,
}) {
  return (
    <Link
      to={to}
      data-testid={testId}
      data-active={active ? "true" : "false"}
      className={cn(
        "group flex min-h-[4.5rem] items-center gap-3 rounded-xl border bg-card px-3.5 py-3 shadow-sm transition-all",
        "hover:border-border hover:shadow-md",
        active
          ? "border-primary/40 bg-primary/10 text-foreground ring-1 ring-primary/30"
          : "border-border text-foreground/90",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-muted",
        )}
        aria-hidden
      >
        {Icon && <Icon size={20} weight="duotone" />}
      </span>
      <span className="min-w-0 flex-1 font-medium text-sm leading-snug text-balance">
        {label}
      </span>
      <CaretRight
        size={18}
        className={cn(
          "shrink-0 transition-transform",
          active ? "text-primary" : "text-muted-foreground group-hover:translate-x-0.5",
        )}
        aria-hidden
      />
    </Link>
  );
}
