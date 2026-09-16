import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PersonnelEnvKpiCard({ label, value, hint, icon: Icon, tint = "blue", testId }) {
  const tones = {
    blue: "bg-primary/10 text-primary border-primary/20",
    slate: "bg-background text-foreground/90 border-border",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <Card className="border-border" data-testid={testId}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            <div className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground mt-1.5">
              {value ?? 0}
            </div>
            {hint && <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{hint}</p>}
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
