import React, { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Texto truncado com tooltip do conteúdo completo quando há overflow ou label explícito.
 */
export default function EllipsisTooltip({
  label,
  children,
  className,
  as: Component = "span",
  side = "top",
  onlyWhenTruncated = true,
}) {
  const ref = useRef(null);
  const [truncated, setTruncated] = useState(false);
  const content = children ?? label;
  const tooltipText = label ?? (typeof children === "string" ? children : "");

  useEffect(() => {
    const el = ref.current;
    if (!el || !onlyWhenTruncated) return undefined;
    const check = () => {
      setTruncated(el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
    };
    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [content, onlyWhenTruncated]);

  const showTooltip = Boolean(tooltipText) && (!onlyWhenTruncated || truncated || tooltipText !== content);

  if (!showTooltip) {
    return (
      <Component ref={ref} className={cn("truncate min-w-0", className)}>
        {content}
      </Component>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Component ref={ref} className={cn("truncate min-w-0 cursor-default", className)}>
          {content}
        </Component>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
