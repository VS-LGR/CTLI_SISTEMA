import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { statusLabel } from "@/lib/quotationRequestTypes";
import {
  QUOTATION_FLOW_STEPS,
  getQuotationFlowStepIndex,
  getQuotationNextStatusActions,
  getQuotationStatusHelp,
} from "@/lib/quotationRequestStatusFlow";
import { cn } from "@/lib/utils";

export default function QuotationRequestStatusPanel({
  status,
  isNew,
  onTransition,
  disabled = false,
  compact = false,
  bare = false,
}) {
  const currentStep = getQuotationFlowStepIndex(status);
  const help = getQuotationStatusHelp(status);
  const actions = getQuotationNextStatusActions(status);

  const inner = (
    <div className={bare ? "space-y-5" : "p-5 space-y-5"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estado atual</span>
        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 text-sm font-semibold">
          {statusLabel(status)}
        </span>
      </div>
      {help && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">{help}</p>
      )}
      {!compact && (
        <nav aria-label="Fluxo da solicitação" className="min-w-0 overflow-x-auto pb-1">
          <ol className="flex items-center gap-0 min-w-max sm:min-w-0 sm:flex-wrap">
            {QUOTATION_FLOW_STEPS.map((step, i) => {
              const isActive = step.statuses.includes(status);
              const isPast = i < currentStep;
              return (
                <li key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex flex-col items-center text-center px-1 sm:px-2 max-w-[4.5rem] sm:max-w-none",
                    isActive && "text-blue-700",
                    isPast && !isActive && "text-slate-600",
                    !isPast && !isActive && "text-slate-400",
                  )}>
                    <span className={cn(
                      "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold border-2 shrink-0",
                      isActive && "border-blue-600 bg-blue-600 text-white",
                      isPast && !isActive && "border-slate-400 bg-slate-100 text-slate-700",
                      !isPast && !isActive && "border-slate-200 bg-white text-slate-400",
                    )}>
                      {i + 1}
                    </span>
                    <span className="mt-1 text-[10px] sm:text-xs leading-tight font-medium">{step.label}</span>
                  </div>
                  {i < QUOTATION_FLOW_STEPS.length - 1 && (
                    <div className={cn("h-0.5 w-4 sm:w-6 mx-0.5 shrink-0", i < currentStep ? "bg-slate-400" : "bg-slate-200")} aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      {!isNew && actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.target}
              type="button"
              size="sm"
              variant={a.variant === "destructive" ? "destructive" : a.variant === "primary" ? "default" : "outline"}
              disabled={disabled}
              onClick={() => onTransition?.(a.target)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  if (bare) return inner;
  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">{inner}</CardContent>
    </Card>
  );
}
