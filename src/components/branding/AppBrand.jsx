import React from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_LOGO_MARK,
  APP_LOGO_SQUARE,
} from "@/lib/appBranding";
import { cn } from "@/lib/utils";

/**
 * @param {{ variant?: "login" | "sidebar" | "sidebar-collapsed", className?: string }} props
 */
export default function AppBrand({ variant = "login", className }) {
  if (variant === "sidebar-collapsed") {
    return (
      <div className={cn("flex justify-center py-1", className)}>
        <img
          src={APP_LOGO_MARK}
          alt={APP_NAME}
          className="h-9 w-9 rounded-md object-cover shrink-0"
        />
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        <img
          src={APP_LOGO_MARK}
          alt=""
          aria-hidden
          className="h-9 w-9 rounded-md object-cover shrink-0"
        />
        <div className="min-w-0">
          <div className="font-display font-bold text-lg tracking-tight truncate text-white">
            {APP_NAME}
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 truncate leading-tight">
            {APP_TAGLINE}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 min-w-0", className)}>
      <img
        src={APP_LOGO_SQUARE}
        alt=""
        aria-hidden
        className="h-11 w-11 sm:h-12 sm:w-12 rounded-lg object-cover shrink-0 shadow-sm border border-slate-200/80"
      />
      <div className="min-w-0 pt-0.5">
        <div className="font-display font-bold text-xl sm:text-2xl tracking-tight text-slate-900 leading-none">
          {APP_NAME}
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug max-w-[14rem] sm:max-w-none">
          {APP_TAGLINE}
        </div>
      </div>
    </div>
  );
}
