import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const buttonClass =
  "flex items-center justify-center w-full min-h-[5.5rem] sm:min-h-[6rem] h-auto py-4 px-3 whitespace-normal font-display font-medium text-slate-900";

export default function DashboardShortcutCard({
  id,
  label,
  to,
  active = false,
  disabledReason = "Destino em definição",
}) {
  return (
    <Card className="border-slate-200 shadow-sm min-w-0" data-testid={`dashboard-shortcut-${id}`}>
      <CardContent className="p-3 sm:p-4">
        {active && to ? (
          <Button asChild variant="outline" className={buttonClass}>
            <Link to={to}>
              <span className="text-balance leading-snug text-center">{label}</span>
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled
            title={disabledReason}
            className={cn(buttonClass, "text-slate-500")}
          >
            <span className="text-balance leading-snug text-center">{label}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
