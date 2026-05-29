import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import QuotationStatusBadge from "@/components/quotationRequests/QuotationStatusBadge";
import {
  QUOTATION_FLOW_STEPS,
  getQuotationFlowStepIndex,
  getQuotationNextStatusActions,
  getQuotationStatusHelp,
} from "@/lib/quotationRequestStatusFlow";
import { cn } from "@/lib/utils";

/**
 * @param {"full"|"compact"|"inline"} layout
 * - inline: badge + ação principal (cabeçalho do editor)
 * - compact: badge + ajuda + botões (dialog)
 * - full: stepper + ações (aba Status)
 */
export default function QuotationRequestStatusPanel({
  status,
  isNew,
  onTransition,
  disabled = false,
  layout = "full",
}) {
  const currentStep = getQuotationFlowStepIndex(status);
  const help = getQuotationStatusHelp(status);
  const actions = getQuotationNextStatusActions(status);
  const primary = actions.find((a) => a.variant !== "destructive");
  const secondary = actions.filter((a) => a !== primary);

  if (layout === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <QuotationStatusBadge status={status} />
        {!isNew && primary && (
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-8"
            disabled={disabled}
            onClick={() => onTransition?.(primary.target)}
          >
            {primary.label}
          </Button>
        )}
        {!isNew && secondary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {secondary.map((a) => (
              <Button
                key={a.target}
                type="button"
                size="sm"
                variant={a.variant === "destructive" ? "destructive" : "outline"}
                className="h-8 text-xs"
                disabled={disabled}
                onClick={() => onTransition?.(a.target)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
        {isNew && (
          <span className="text-xs text-slate-500">Salve para alterar o status</span>
        )}
      </div>
    );
  }

  const stepper = (
    <nav aria-label="Fluxo da solicitação" className="min-w-0 overflow-x-auto pb-1 -mx-1 px-1">
      <ol className="flex items-stretch gap-0 min-w-max">
        {QUOTATION_FLOW_STEPS.map((step, i) => {
          const isActive = step.statuses.includes(status);
          const isPast = i < currentStep;
          const isDecision = step.id === "decisao";
          return (
            <li key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex flex-col items-center text-center px-2 py-1 min-w-[4.5rem] sm:min-w-[5.5rem]",
                  isActive && "text-blue-700",
                  isPast && !isActive && "text-slate-600",
                  !isPast && !isActive && "text-slate-400",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 shrink-0 transition-colors",
                    isActive && "border-blue-600 bg-blue-600 text-white shadow-sm",
                    isPast && !isActive && "border-emerald-500 bg-emerald-50 text-emerald-700",
                    !isPast && !isActive && "border-slate-200 bg-white text-slate-400",
                  )}
                >
                  {isPast && !isActive ? "✓" : i + 1}
                </span>
                <span className="mt-1.5 text-[10px] sm:text-xs leading-tight font-medium max-w-[5rem]">
                  {step.label}
                </span>
                {isActive && isDecision && (
                  <span className="mt-0.5 text-[9px] text-blue-600 font-normal">atual</span>
                )}
              </div>
              {i < QUOTATION_FLOW_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-3 sm:w-5 shrink-0 self-center mb-5",
                    i < currentStep ? "bg-emerald-400" : "bg-slate-200",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );

  const actionButtons = !isNew && actions.length > 0 && (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Próximo passo</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a, idx) => (
          <Button
            key={a.target}
            type="button"
            size="sm"
            variant={
              a.variant === "destructive"
                ? "destructive"
                : idx === 0
                  ? "default"
                  : "outline"
            }
            className={idx === 0 && a.variant !== "destructive" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            disabled={disabled}
            onClick={() => onTransition?.(a.target)}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );

  if (layout === "compact") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <QuotationStatusBadge status={status} />
        </div>
        {help && (
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 leading-relaxed">
            {help}
          </p>
        )}
        {actionButtons}
      </div>
    );
  }

  return (
    <Card className="border-slate-200 overflow-hidden">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estado da solicitação</p>
            <QuotationStatusBadge status={status} />
          </div>
        </div>
        {help && (
          <p className="text-sm text-slate-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2.5 leading-relaxed">
            {help}
          </p>
        )}
        {stepper}
        {actionButtons}
      </CardContent>
    </Card>
  );
}
