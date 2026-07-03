import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretDown } from "@phosphor-icons/react";
import { describeWeightComposition } from "@/lib/certificateCalculations/pointCalculations";
import StandardWeightPickerPanel from "@/components/shared/StandardWeightPickerPanel";

export default function PesoPadraoMultiSelect({
  weightItems = [],
  weightCerts,
  value = [],
  onChange,
  placeholder = "Selecionar pesos padrão",
  unit = "g",
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => value || [], [value]);

  const composition = useMemo(
    () => describeWeightComposition(selected, weightItems, { targetUnit: unit }),
    [selected, weightItems, unit],
  );

  const summary = selected.length === 0
    ? placeholder
    : composition.valid && composition.totalDisplay
      ? `${selected.length} peso(s) — V.N. total: ${composition.totalDisplay}`
      : `${selected.length} peso(s) selecionado(s)`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal h-9 text-left">
          <span className="truncate text-sm">{summary}</span>
          <CaretDown size={14} className="shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(36rem,calc(100vw-1.5rem))] p-3"
        align="start"
        side="bottom"
        collisionPadding={12}
      >
        <StandardWeightPickerPanel
          weightItems={weightItems}
          weightCerts={weightCerts}
          value={selected}
          onChange={onChange}
          unit={unit}
          compact
          itemKind="weights"
        />
      </PopoverContent>
    </Popover>
  );
}
