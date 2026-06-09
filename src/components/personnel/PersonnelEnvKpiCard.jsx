import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PersonnelEnvKpiCard({ label, value, hint, icon: Icon, tint = "blue", testId }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <Card className="border-slate-200" data-testid={testId}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
            <div className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 mt-1.5">
              {value ?? 0}
            </div>
            {hint && <p className="text-xs text-slate-500 mt-1.5 leading-snug">{hint}</p>}
          </div>
          {Icon && (
            <div className={`p-2 rounded-md border shrink-0 ${tones[tint]}`}>
              <Icon size={18} weight="duotone" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
