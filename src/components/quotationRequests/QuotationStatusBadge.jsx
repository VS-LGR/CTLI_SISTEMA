import React from "react";
import { getStatusBadgeClass, getStatusDisplayLabel } from "@/lib/quotationRequestStatusStyles";
import { cn } from "@/lib/utils";

export default function QuotationStatusBadge({ status, className, size = "default" }) {
  const sizeClass = size === "sm"
    ? "text-xs px-2 py-0.5"
    : "text-sm px-3 py-1";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold whitespace-nowrap",
        sizeClass,
        getStatusBadgeClass(status),
        className,
      )}
    >
      {getStatusDisplayLabel(status)}
    </span>
  );
}
