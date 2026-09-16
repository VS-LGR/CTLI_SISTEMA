import React from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_LOGO,
} from "@/lib/appBranding";
import { cn } from "@/lib/utils";

/**
 * Marca QUATI — apenas o símbolo em `APP_LOGO`. O nome é tipografia.
 *
 * @param {{ variant?: "login" | "sidebar" | "sidebar-collapsed" | "header", className?: string }} props
 */
export default function AppBrand({ variant = "login", className }) {
  if (variant === "sidebar-collapsed") {
    return (
      <div className={cn("flex justify-center py-1", className)}>
        <img
          src={APP_LOGO}
          alt={APP_NAME}
          className="h-9 w-9 object-contain rounded-md shrink-0 bg-black"
        />
      </div>
    );
  }

  if (variant === "header") {
    return (
      <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
        <img
          src={APP_LOGO}
          alt=""
          className="h-9 w-9 object-contain rounded-md shrink-0 bg-black"
        />
        <div className="min-w-0">
          <div className="font-display text-[15px] font-extrabold tracking-[0.18em] text-foreground leading-none">
            {APP_NAME}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate">
            {APP_TAGLINE}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
        <img
          src={APP_LOGO}
          alt=""
          className="h-9 w-9 object-contain rounded-md shrink-0 bg-black"
        />
        <div className="min-w-0">
          <div className="font-display text-[15px] font-extrabold tracking-[0.18em] text-white leading-none">
            {APP_NAME}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-orange-300/80 truncate">
            {APP_TAGLINE}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-5 min-w-0", className)}>
      <img
        src={APP_LOGO}
        alt={APP_NAME}
        className="h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 object-contain rounded-2xl bg-black ring-1 ring-white/10 shadow-[0_0_40px_rgba(249,115,22,0.18)]"
      />
      <div className="min-w-0">
        <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-[0.22em] text-white leading-none">
          {APP_NAME}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.38em] text-orange-400">
          {APP_TAGLINE}
        </p>
      </div>
    </div>
  );
}
