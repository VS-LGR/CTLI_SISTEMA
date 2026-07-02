import React, { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { weightItemCertStatus } from "@/lib/cadastroListUtils";
import { describeWeightComposition } from "@/lib/certificateCalculations/pointCalculations";
import {
  WEIGHT_PICKER_SORT_OPTIONS,
  filterAndSortWeightItems,
} from "@/lib/pesoPadraoPickerUtils";

function WeightPickerCard({
  item,
  checked,
  disabled,
  weightCerts,
  onToggle,
}) {
  const st = weightItemCertStatus(item, weightCerts);
  const nominal = item.nominal_value
    ? `${item.nominal_value} ${item.unit || "g"}`.trim()
    : "—";

  return (
    <label
      className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors min-w-0 ${
        checked
          ? "border-blue-300 bg-blue-50/60"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p className="font-mono text-sm font-medium text-slate-900 truncate" title={item.identification}>
            {item.identification || "—"}
          </p>
          {st.vigente != null && (
            <Badge
              className={`shrink-0 font-normal text-[10px] ${
                st.vigente
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-red-100 text-red-800 hover:bg-red-100"
              }`}
            >
              {st.vigente ? "OK" : "Venc."}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-600">
          V.N. <span className="font-mono font-medium text-slate-800">{nominal}</span>
        </p>
      </div>
    </label>
  );
}

/**
 * Painel compacto de seleção de pesos padrão (coleta, certificado).
 */
export default function StandardWeightPickerPanel({
  weightItems = [],
  weightCerts = [],
  value = [],
  onChange,
  disabled = false,
  unit = "g",
  compact = false,
  emptyMessage = "Cadastre pesos padrão em Cadastros → Pesos padrão (identificação).",
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("nominal_asc");
  const selected = useMemo(() => value || [], [value]);

  const visibleItems = useMemo(
    () => filterAndSortWeightItems(weightItems, { query, sortKey }),
    [weightItems, query, sortKey],
  );

  const composition = useMemo(
    () => describeWeightComposition(selected, weightItems, { targetUnit: unit }),
    [selected, weightItems, unit],
  );

  const toggle = (id) => {
    if (disabled) return;
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next);
  };

  const clearSelection = () => {
    if (disabled || !selected.length) return;
    onChange([]);
  };

  if (!weightItems.length) {
    return (
      <p className="text-sm text-slate-500 p-3 border rounded-md bg-slate-50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={`space-y-3 min-w-0 ${compact ? "" : "rounded-lg border border-slate-200 bg-slate-50/50 p-3"}`}>
      <div className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:items-center"}`}>
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar identificação ou valor nominal…"
            className="h-9 pl-9 text-sm bg-white"
            disabled={disabled}
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          disabled={disabled}
          className="h-9 w-full sm:w-[13.5rem] shrink-0 rounded-md border border-input bg-white px-2 text-xs shadow-sm"
          aria-label="Ordenar pesos"
        >
          {WEIGHT_PICKER_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {visibleItems.length} de {weightItems.length} peso(s)
          {selected.length > 0 && (
            <span className="text-slate-700 font-medium"> · {selected.length} selecionado(s)</span>
          )}
        </span>
        {selected.length > 0 && !disabled && (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
            Limpar seleção
          </Button>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg bg-white">
          Nenhum peso corresponde à pesquisa.
        </p>
      ) : (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? "xl:grid-cols-2" : "lg:grid-cols-3"} gap-2 overflow-y-auto pr-0.5 ${
            compact ? "max-h-[min(16rem,50vh)]" : "max-h-[min(14rem,42vh)]"
          }`}
        >
          {visibleItems.map((w) => (
            <WeightPickerCard
              key={w.id}
              item={w}
              checked={selected.includes(w.id)}
              disabled={disabled}
              weightCerts={weightCerts}
              onToggle={() => toggle(w.id)}
            />
          ))}
        </div>
      )}

      {composition.valid && selected.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 space-y-1">
          {composition.parts.length > 1 && (
            <p>
              <span className="font-medium text-slate-800">Composição (V.N.):</span>{" "}
              <span className="font-mono">{composition.compositionDisplay}</span>
            </p>
          )}
          <p>
            <span className="font-medium text-slate-800">V.N. total:</span>{" "}
            <span className="font-mono font-semibold">{composition.totalDisplay}</span>
          </p>
        </div>
      )}
    </div>
  );
}
