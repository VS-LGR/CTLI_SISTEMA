import React from "react";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import { QUOTATION_REQUEST_TYPES } from "@/lib/quotationRequestTypes";
import { cn } from "@/lib/utils";

export default function QuotationRequestTypeSelector({ sections, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {QUOTATION_REQUEST_TYPES.map((typeMeta) => {
        const sec = sections.find((s) => s.type === typeMeta.id);
        const selected = !!sec?.is_selected;
        return (
          <button
            key={typeMeta.id}
            type="button"
            onClick={() => onSelect(typeMeta.id)}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border text-left transition-colors min-w-0",
              selected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-border hover:bg-accent",
            )}
          >
            {selected ? (
              <CheckCircle size={22} weight="fill" className="text-primary shrink-0 mt-0.5" />
            ) : (
              <Circle size={22} className="text-muted-foreground shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-medium text-foreground leading-snug">{typeMeta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
