import React from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HELP_PATH } from "@/lib/help/helpModules";

export default function ModuleTourOverlay({
  open,
  module,
  stepIndex,
  onStepChange,
  onDismiss,
}) {
  if (!module) return null;

  const steps = module.steps || [];
  const total = steps.length;
  const step = steps[stepIndex] || steps[0];
  const isLast = stepIndex >= total - 1;
  const isFirst = stepIndex <= 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss?.();
      }}
    >
      <DialogContent className="max-w-md max-h-[min(90dvh,40rem)] gap-3 sm:gap-4 overflow-y-auto overscroll-contain">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-display text-base sm:text-lg break-words">
            {module.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Tutorial · passo {Math.min(stepIndex + 1, total)} de {total}
          </DialogDescription>
        </DialogHeader>

        {step && (
          <div className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-slate-900 break-words">{step.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed break-words">{step.body}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 justify-center" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                i === stepIndex ? "bg-blue-600" : "bg-slate-300"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <Button
            asChild
            variant="link"
            className="h-auto p-0 text-xs text-slate-600 order-last sm:order-first self-center sm:self-auto"
          >
            <Link to={HELP_PATH} onClick={() => onDismiss?.()}>
              Ver na Ajuda
            </Link>
          </Button>
          <div className="flex flex-col-reverse sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => onStepChange?.(stepIndex - 1)}
              >
                Anterior
              </Button>
            )}
            {!isLast ? (
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onStepChange?.(stepIndex + 1)}
              >
                Seguinte
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onDismiss?.()}
              >
                Entendi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
