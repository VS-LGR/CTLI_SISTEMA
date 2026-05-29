import React from "react";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import { QUOTATION_REQUEST_TYPES } from "@/lib/quotationRequestTypes";
import { cn } from "@/lib/utils";

export default function QuotationRequestTypeSelector({ sections, onToggle }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {QUOTATION_REQUEST_TYPES.map((typeMeta) => {
        const sec = sections.find((s) => s.type === typeMeta.id);
        const selected = !!sec?.is_selected;
        return (
          <button
            key={typeMeta.id}
            type="button"
            onClick={() => onToggle(typeMeta.id, !selected)}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border text-left transition-colors min-w-0",
              selected
                ? "border-blue-500 bg-blue-50/80 ring-1 ring-blue-200"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {selected ? (
              <CheckCircle size={22} weight="fill" className="text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <Circle size={22} className="text-slate-300 shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-medium text-slate-800 leading-snug">{typeMeta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
