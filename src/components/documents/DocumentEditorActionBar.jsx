import React from "react";
import { Button } from "@/components/ui/button";

export default function DocumentEditorActionBar({
  primary,
  actions = [],
  className = "",
}) {
  const visibleActions = actions.filter((a) => !a.hidden);
  if (!primary && !visibleActions.length) return null;

  return (
    <div
      className={`sticky bottom-0 z-20 -mx-4 px-4 py-3 mt-6 bg-white/95 backdrop-blur border-t border-slate-200 ${className}`}
    >
      <div className="flex flex-wrap gap-2 max-w-5xl mx-auto">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              type="button"
              variant={action.variant || "outline"}
              size={action.size || "sm"}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={action.className}
            >
              {Icon ? <Icon size={16} className="mr-1.5" /> : null}
              {action.loading ? action.loadingLabel || `${action.label}…` : action.label}
            </Button>
          );
        })}
        {primary ? (
          <Button
            type="button"
            size={primary.size || "sm"}
            onClick={primary.onClick}
            disabled={primary.disabled || primary.loading}
            className={`ml-auto bg-blue-600 hover:bg-blue-700 text-white ${primary.className || ""}`}
          >
            {primary.icon ? <primary.icon size={16} className="mr-1.5" /> : null}
            {primary.loading ? primary.loadingLabel || `${primary.label}…` : primary.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
