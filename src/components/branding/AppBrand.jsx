import React from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_LOGO,
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
          src={APP_LOGO}
          alt={APP_NAME}
          className="h-9 w-9 object-cover object-top rounded-md shrink-0"
        />
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("flex flex-col gap-1 min-w-0", className)}>
        <img
          src={APP_LOGO}
          alt={APP_NAME}
          className="h-11 w-auto max-w-full object-contain object-left shrink-0"
        />
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 truncate leading-tight pl-0.5">
          {APP_TAGLINE}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 min-w-0", className)}>
      <img
        src={APP_LOGO}
        alt={APP_NAME}
        className="h-16 sm:h-[4.5rem] w-auto max-w-[min(100%,16rem)] object-contain object-left"
      />
      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
        {APP_TAGLINE}
      </p>
    </div>
  );
}
