import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { statusLabel } from "@/lib/purchaseOrderTypes";
import {
  PURCHASE_ORDER_FLOW_STEPS,
  getFlowStepIndex,
  getNextStatusActions,
  getStatusHelp,
} from "@/lib/purchaseOrderStatusFlow";
import { cn } from "@/lib/utils";

export default function PurchaseOrderStatusPanel({
  status,
  isNew,
  onTransition,
  disabled = false,
}) {
  const currentStep = getFlowStepIndex(status);
  const help = getStatusHelp(status);
  const actions = getNextStatusActions(status);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estado atual</span>
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 text-sm font-semibold">
            {statusLabel(status)}
          </span>
        </div>

        {help && (
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            {help}
          </p>
        )}

        <nav aria-label="Fluxo do pedido" className="min-w-0 overflow-x-auto pb-1">
          <ol className="flex items-center gap-0 min-w-max sm:min-w-0 sm:flex-wrap">
            {PURCHASE_ORDER_FLOW_STEPS.map((step, i) => {
              const isActive = step.statuses.includes(status);
              const isPast = i < currentStep;
              return (
                <li key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex flex-col items-center text-center px-1 sm:px-2 max-w-[4.5rem] sm:max-w-none",
                      isActive && "text-blue-700",
                      isPast && !isActive && "text-slate-600",
                      !isPast && !isActive && "text-slate-400",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold border-2 shrink-0",
                        isActive && "border-blue-600 bg-blue-600 text-white",
                        isPast && !isActive && "border-slate-400 bg-slate-100 text-slate-700",
                        !isPast && !isActive && "border-slate-200 bg-white text-slate-400",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="mt-1 text-[10px] sm:text-xs leading-tight font-medium">{step.label}</span>
                  </div>
                  {i < PURCHASE_ORDER_FLOW_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-4 sm:w-6 mx-0.5 shrink-0",
                        i < currentStep ? "bg-slate-400" : "bg-slate-200",
                      )}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {isNew ? (
          <p className="text-sm text-slate-500">Guarde o pedido para alterar o status.</p>
        ) : actions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Próximo passo</p>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.target}
                  type="button"
                  size="sm"
                  variant={
                    action.variant === "destructive"
                      ? "destructive"
                      : action.variant === "secondary"
                        ? "outline"
                        : "default"
                  }
                  className={action.variant === "primary" ? "bg-blue-600 hover:bg-blue-700" : undefined}
                  disabled={disabled}
                  onClick={() => onTransition?.(action.target)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Não há transições disponíveis neste estado.</p>
        )}
      </CardContent>
    </Card>
  );
}
