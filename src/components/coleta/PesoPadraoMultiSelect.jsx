import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretDown } from "@phosphor-icons/react";
import { weightItemLabel } from "@/lib/coletaSchema";
import { describeWeightComposition } from "@/lib/certificateCalculations/pointCalculations";

export default function PesoPadraoMultiSelect({
  weightItems = [],
  weightCerts,
  value = [],
  onChange,
  placeholder = "Selecionar pesos padrão",
  unit = "g",
}) {
  const items = weightItems.length ? weightItems : (weightCerts || []);
  const [open, setOpen] = useState(false);
  const selected = value || [];

  const composition = useMemo(
    () => describeWeightComposition(selected, weightItems, { targetUnit: unit }),
    [selected, weightItems, unit],
  );

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next);
  };

  const summary = selected.length === 0
    ? placeholder
    : composition.valid && composition.totalDisplay
      ? `${selected.length} peso(s) — V.N. total: ${composition.totalDisplay}`
      : `${selected.length} peso(s) selecionado(s)`;

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal h-9 text-left">
            <span className="truncate text-sm">{summary}</span>
            <CaretDown size={14} className="shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-2" align="start">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 p-2">Cadastre pesos padrão em Cadastros → Pesos padrão (identificação).</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {items.map((w) => (
                <label
                  key={w.id}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.includes(w.id)}
                    onCheckedChange={() => toggle(w.id)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-snug">{weightItemLabel(w)}</span>
                </label>
              ))}
            </div>
          )}
          {composition.valid && selected.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-0.5">
              {composition.parts.length > 1 && (
                <p>
                  <span className="font-medium">Composição:</span>{" "}
                  <span className="font-mono">{composition.compositionDisplay}</span>
                </p>
              )}
              <p>
                <span className="font-medium">V.N. total:</span>{" "}
                <span className="font-mono font-semibold">{composition.totalDisplay}</span>
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
