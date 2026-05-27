import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const baseClass =
  "flex min-h-[5.5rem] sm:min-h-[6rem] items-center justify-center rounded-lg border-2 border-emerald-500 bg-white px-3 py-4 text-center text-sm font-medium text-slate-800 transition-colors";

export default function DashboardShortcutCard({
  id,
  label,
  to,
  active = false,
  disabledReason = "Destino em definição",
}) {
  if (active && to) {
    return (
      <Link
        to={to}
        className={cn(baseClass, "hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2")}
        data-testid={`dashboard-shortcut-${id}`}
      >
        <span className="text-balance leading-snug">{label}</span>
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-disabled="true"
      title={disabledReason}
      className={cn(baseClass, "opacity-60 cursor-not-allowed")}
      data-testid={`dashboard-shortcut-${id}`}
    >
      <span className="text-balance leading-snug">{label}</span>
    </div>
  );
}
