import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretDown } from "@phosphor-icons/react";
import { labelsFromOptionItems } from "@/lib/personnelConstants";

export default function MultiSelectStandardOptions({
  label,
  options = [],
  value = [],
  onChange,
  disabled = false,
  placeholder = "Selecionar…",
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = useMemo(() => labelsFromOptionItems(value), [value]);

  const toggle = (opt) => {
    const exists = value.some((v) => (v.id && v.id === opt.id) || v.label === opt.label);
    if (exists) {
      onChange(value.filter((v) => !((v.id && v.id === opt.id) || v.label === opt.label)));
    } else {
      onChange([...value, { id: opt.id, label: opt.label }]);
    }
  };

  return (
    <div className="space-y-1 min-w-0">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between h-10 font-normal text-left"
          >
            <span className="truncate text-sm">
              {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
            </span>
            <CaretDown size={14} className="shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,28rem)] p-2 max-h-64 overflow-y-auto" align="start">
          {options.length === 0 && (
            <p className="text-xs text-slate-500 p-2">Nenhuma opção cadastrada.</p>
          )}
          {options.map((opt) => {
            const checked = value.some((v) => (v.id && v.id === opt.id) || v.label === opt.label);
            return (
              <label
                key={opt.id || opt.label}
                className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer text-sm"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(opt)} />
                <span className="break-words">{opt.label}</span>
              </label>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
