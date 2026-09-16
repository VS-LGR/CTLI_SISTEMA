import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash } from "@phosphor-icons/react";

export default function FormRowCard({
  index,
  label,
  children,
  readOnly = false,
  canRemove = true,
  onRemove,
}) {
  const title = label ?? `Item ${index + 1}`;

  return (
    <Card className="border-border shadow-sm min-w-0">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 bg-background/80 border-b border-border">
        <span className="text-sm font-semibold text-foreground/90">{title}</span>
        {!readOnly && canRemove && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 shrink-0"
            onClick={onRemove}
            aria-label={`Remover ${title}`}
          >
            <Trash size={16} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-3 min-w-0">{children}</CardContent>
    </Card>
  );
}
