import React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const cadastroFilterFieldClass =
  "h-10 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300";

/**
 * Barra de busca padronizada (estilo Coleta).
 * @param {{ query: string, onQueryChange: (v: string) => void, placeholder?: string, year?: string, years?: string[], onYearChange?: (v: string) => void, yearLabel?: string, filteredCount?: number, totalCount?: number, onClear?: () => void, testIdPrefix?: string }} props
 */
export default function CadastroListFilterBar({
  query,
  onQueryChange,
  placeholder = "Buscar…",
  year,
  years,
  onYearChange,
  yearLabel = "Ano (calibração)",
  filteredCount,
  totalCount,
  onClear,
  testIdPrefix = "cadastro",
}) {
  const showFooter =
    filteredCount != null
    && totalCount != null
    && (query?.trim() || (year && year !== "all"));

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm"
      data-testid={`${testIdPrefix}-filters`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className={`${cadastroFilterFieldClass} pl-10`}
            data-testid={`${testIdPrefix}-filter-search`}
          />
        </div>
        {years && onYearChange && (
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs text-slate-500 whitespace-nowrap">{yearLabel}</Label>
            <select
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              className={`${cadastroFilterFieldClass} w-full sm:w-[9rem] px-2`}
              data-testid={`${testIdPrefix}-filter-year`}
            >
              <option value="all">Todos</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {showFooter && onClear && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">
            A mostrar {filteredCount} de {totalCount} registro(s).
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-slate-600"
            onClick={onClear}
            data-testid={`${testIdPrefix}-filter-clear`}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
