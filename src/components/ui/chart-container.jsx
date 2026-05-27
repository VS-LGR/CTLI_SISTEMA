import React from "react";
import { cn } from "@/lib/utils";
import { useContainerSize } from "@/hooks/useContainerSize";

/**
 * Contentor com altura fixa responsiva para gráficos Recharts.
 * @param {{ className?: string, heightClass?: string, children: (size: { width: number, height: number, ready: boolean }) => React.ReactNode }} props
 */
export function ChartContainer({
  className,
  heightClass = "h-[240px] sm:h-[280px]",
  children,
}) {
  const { ref, width, height, ready } = useContainerSize();

  return (
    <div
      ref={ref}
      className={cn("relative w-full min-w-0 shrink-0", heightClass, className)}
    >
      {!ready ? (
        <div
          className="absolute inset-0 rounded-md bg-slate-100/80 animate-pulse"
          aria-hidden
        />
      ) : (
        children({ width, height, ready })
      )}
    </div>
  );
}
