import React from "react";
import {
  APP_NAME,
  APP_LOGO,
  APP_LOGO_WIDE,
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
          className="h-9 w-9 object-contain rounded-md shrink-0 bg-black"
        />
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("flex flex-col gap-1 min-w-0", className)}>
        <img
          src={APP_LOGO_WIDE}
          alt={APP_NAME}
          className="h-11 w-auto max-w-full object-contain object-left shrink-0"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 min-w-0", className)}>
      <div className="inline-flex max-w-full rounded-lg bg-black px-3 py-2">
        <img
          src={APP_LOGO_WIDE}
          alt={APP_NAME}
          className="h-14 sm:h-16 w-auto max-w-[min(100%,16rem)] object-contain object-left"
        />
      </div>
    </div>
  );
}
