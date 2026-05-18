import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CaretDown } from "@phosphor-icons/react";
import { weightCertLabel } from "@/lib/coletaSchema";

export default function PesoPadraoMultiSelect({ weightCerts, value = [], onChange, placeholder = "Selecionar pesos padrão" }) {
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
    : `${selected.length} conjunto(s) selecionado(s)`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal h-9 text-left">
          <span className="truncate text-sm">{summary}</span>
          <CaretDown size={14} className="shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-2" align="start">
        {weightCerts.length === 0 ? (
          <p className="text-sm text-slate-500 p-2">Cadastre certificados de peso padrão em Cadastros.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-1">
            {weightCerts.map((w) => (
              <label
                key={w.id}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(w.id)}
                  onCheckedChange={() => toggle(w.id)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug">{weightCertLabel(w)}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
