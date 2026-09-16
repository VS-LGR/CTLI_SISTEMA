import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PersonnelTopicCountCard({
  code,
  shortLabel,
  nbrRef,
  value,
  filtered = false,
  active = false,
  onClick,
  testId,
}) {
  return (
    <Card
      className={`border-border transition-colors ${
        onClick ? "cursor-pointer hover:border-primary/40 hover:shadow-sm" : ""
      } ${active ? "ring-2 ring-primary border-primary/40 bg-primary/10" : ""}`}
      data-testid={testId}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{code}</div>
        <div className="text-2xl font-display font-bold tracking-tight text-foreground mt-1">
          {value ?? 0}
        </div>
        <div className="text-xs text-foreground/90 mt-1 leading-snug line-clamp-2">
          {shortLabel}
          {filtered && <span className="text-muted-foreground"> (filtrado)</span>}
        </div>
        {nbrRef && (
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug line-clamp-2" title={nbrRef}>
            {nbrRef}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
