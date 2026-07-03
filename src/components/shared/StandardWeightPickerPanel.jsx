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
  WEIGHT_PICKER_KIND_OPTIONS,
  filterAndSortWeightItems,
  isLoadBatchItem,
} from "@/lib/pesoPadraoPickerUtils";
import { loadBatchMaterialLabel } from "@/lib/standardWeightItemUtils";

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
  const isLot = isLoadBatchItem(item);
  const materialLabel = isLot ? loadBatchMaterialLabel(item.load_batch_material_preset) : "";

  return (
    <label
      className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors min-w-0 ${
        checked
          ? isLot
            ? "border-amber-300 bg-amber-50/70"
            : "border-blue-300 bg-blue-50/60"
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
          <div className="flex shrink-0 items-center gap-1">
            {isLot && (
              <Badge className="font-normal text-[10px] bg-amber-100 text-amber-900 hover:bg-amber-100">
                Lote
              </Badge>
            )}
            {!isLot && st.vigente != null && (
              <Badge
                className={`font-normal text-[10px] ${
                  st.vigente
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-red-100 text-red-800 hover:bg-red-100"
                }`}
              >
                {st.vigente ? "OK" : "Venc."}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600">
          {isLot ? "Vc" : "V.N."}{" "}
          <span className="font-mono font-medium text-slate-800">{nominal}</span>
        </p>
        {materialLabel && (
          <p className="text-[10px] text-slate-500 truncate" title={materialLabel}>
            Material: {materialLabel}
          </p>
        )}
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
  /** "all" | "weights" | "load_batches" — quando fixo, oculta seletor de tipo */
  itemKind = "weights",
  allowKindFilter = false,
  singleSelect = false,
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("nominal_asc");
  const [kindFilter, setKindFilter] = useState(itemKind === "all" ? "all" : itemKind);
  const effectiveKind = allowKindFilter ? kindFilter : itemKind;
  const selected = useMemo(() => value || [], [value]);

  const poolItems = useMemo(
    () => filterAndSortWeightItems(weightItems, { query: "", sortKey: "nominal_asc", kind: effectiveKind }),
    [weightItems, effectiveKind],
  );

  const visibleItems = useMemo(
    () => filterAndSortWeightItems(weightItems, { query, sortKey, kind: effectiveKind }),
    [weightItems, query, sortKey, effectiveKind],
  );

  const composition = useMemo(
    () => describeWeightComposition(selected, weightItems, { targetUnit: unit }),
    [selected, weightItems, unit],
  );

  const toggle = (id) => {
    if (disabled) return;
    if (singleSelect) {
      onChange(selected.includes(id) ? [] : [id]);
      return;
    }
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next);
  };

  const clearSelection = () => {
    if (disabled || !selected.length) return;
    onChange([]);
  };

  if (!poolItems.length && !weightItems.length) {
    return (
      <p className="text-sm text-slate-500 p-3 border rounded-md bg-slate-50">
        {emptyMessage}
      </p>
    );
  }

  if (!poolItems.length) {
    const kindLabel = effectiveKind === "load_batches" ? "lotes de carga" : "pesos padrão";
    return (
      <p className="text-sm text-slate-500 p-3 border rounded-md bg-slate-50">
        Nenhum {kindLabel} cadastrado. Cadastre em Cadastros → Pesos padrão.
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
        {allowKindFilter && (
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            disabled={disabled}
            className="h-9 w-full sm:w-[10.5rem] shrink-0 rounded-md border border-input bg-white px-2 text-xs shadow-sm"
            aria-label="Filtrar tipo"
          >
            {WEIGHT_PICKER_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {visibleItems.length} de {poolItems.length}{" "}
          {effectiveKind === "load_batches" ? "lote(s)" : "peso(s)"}
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

      {composition.valid && selected.length > 0 && effectiveKind !== "load_batches" && (
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
