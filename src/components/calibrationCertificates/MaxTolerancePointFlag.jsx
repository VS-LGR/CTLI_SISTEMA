import React from "react";
import { Warning } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MAX_TOLERANCE_ALERT_ROW_CLASS,
  MAX_TOLERANCE_ALERT_VALUE_CLASS,
  formatMaxTolerancePointLabel,
} from "@/lib/certificateCalculations/pointMaxToleranceVerification";

export function maxToleranceRowClass(isAlert, extra = "") {
  return cn(isAlert && MAX_TOLERANCE_ALERT_ROW_CLASS, extra);
}

export function maxToleranceValueClass(isAlert, extra = "") {
  return cn(isAlert && MAX_TOLERANCE_ALERT_VALUE_CLASS, extra);
}

export function MaxTolerancePointLabel({ pointNumber, isAlert = false, className = "" }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", isAlert && "font-semibold text-amber-950", className)}>
      {isAlert && (
        <Warning size={14} weight="fill" className="text-amber-600 shrink-0" aria-hidden />
      )}
      <span>P{pointNumber}</span>
      {isAlert && (
        <Badge
          variant="outline"
          className="text-[9px] px-1 py-0 h-4 border-amber-400 bg-amber-100 text-amber-900 font-medium"
        >
          Tol. máx.
        </Badge>
      )}
    </span>
  );
}

export function MaxToleranceAlertBanner({ pointResults = [], className = "" }) {
  const alerts = (pointResults || []).filter((p) => p.result === "alerta");
  if (!alerts.length) return null;

  const summary = alerts
    .map((p) => `${formatMaxTolerancePointLabel(p)} (P${p.pointNumber})`)
    .join(", ");

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950",
        className,
      )}
      role="alert"
    >
      <p className="font-semibold flex items-center gap-2">
        <Warning size={18} weight="fill" className="text-amber-600 shrink-0" />
        Pesagem(ns) acima da tolerância máxima: {summary}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-amber-900/90 pl-6 list-disc">
        {alerts.map((p) => {
          const tv = p.testValue != null ? String(p.testValue).replace(".", ",") : "—";
          const tol = p.toleranceMax != null ? String(p.toleranceMax).replace(".", ",") : "—";
          const load = formatMaxTolerancePointLabel(p);
          return (
            <li key={p.pointNumber}>
              <strong>{load}</strong> (P{p.pointNumber}) — |E+U| = {tv} &gt; tolerância máx. {tol}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
