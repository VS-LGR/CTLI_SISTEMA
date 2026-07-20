import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Menu padrão de ações por linha de listagem.
 * @param {{
 *   items?: Array<{
 *     key: string,
 *     label: string,
 *     icon?: React.ComponentType<{ size?: number, className?: string }>,
 *     onSelect?: () => void,
 *     disabled?: boolean,
 *     destructive?: boolean,
 *     separatorBefore?: boolean,
 *   }>,
 *   align?: "start" | "center" | "end",
 *   disabled?: boolean,
 *   testId?: string,
 *   className?: string,
 * }} props
 */
export default function ListRowActionsMenu({
  items = [],
  align = "end",
  disabled = false,
  testId,
  className,
}) {
  const visible = (items || []).filter(Boolean);
  if (!visible.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("h-8 whitespace-nowrap", className)}
          data-testid={testId}
        >
          Ações <CaretDown size={12} className="ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.key}>
              {item.separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={item.disabled}
                className={item.destructive ? "text-red-600 focus:text-red-700" : undefined}
                onSelect={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                    return;
                  }
                  item.onSelect?.();
                }}
              >
                {Icon ? <Icon size={16} className="mr-2 shrink-0" /> : null}
                {item.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
