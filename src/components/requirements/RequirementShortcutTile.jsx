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
        "group flex min-h-[4.5rem] items-center gap-3 rounded-xl border bg-white px-3.5 py-3 shadow-sm transition-all",
        "hover:border-slate-300 hover:shadow-md",
        active
          ? "border-blue-300 bg-blue-50/80 text-blue-900 ring-1 ring-blue-200"
          : "border-slate-200 text-slate-700",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
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
          active ? "text-blue-600" : "text-slate-400 group-hover:translate-x-0.5",
        )}
        aria-hidden
      />
    </Link>
  );
}
