import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretDown } from "@phosphor-icons/react";
import { weightItemLabel } from "@/lib/coletaSchema";

export default function PesoPadraoMultiSelect({
  weightItems = [],
  weightCerts,
  value = [],
  onChange,
  placeholder = "Selecionar pesos padrão",
}) {
  const items = weightItems.length ? weightItems : (weightCerts || []);
  const [open, setOpen] = useState(false);
  const selected = value || [];

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next);
  };

  const summary = selected.length === 0
    ? placeholder
    : `${selected.length} peso(s) selecionado(s)`;

  return (
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
      </PopoverContent>
    </Popover>
  );
}
