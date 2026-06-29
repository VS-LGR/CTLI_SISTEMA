import React from "react";
import { Input } from "@/components/ui/input";
import {
  MASS_UNIT_OPTIONS,
  normalizeMassUnit,
  sanitizeMassNumericInput,
} from "@/lib/massValueUtils";

const selectBaseClass =
  "flex rounded-md border border-input bg-transparent shadow-sm";

const selectClass = `${selectBaseClass} h-9 w-full px-2 text-sm`;

const compactSelectClass = `${selectBaseClass} h-8 shrink-0 w-12 px-1 text-xs`;

export default function MassValueField({
  value = "",
  unit = "",
  onValueChange,
  onUnitChange,
  defaultUnit = "g",
  compact = false,
  disabled = false,
  valuePlaceholder = "0",
  showUnit = true,
  className = "",
}) {
  const resolvedUnit = normalizeMassUnit(unit || defaultUnit, defaultUnit);

  const handleValue = (e) => {
    onValueChange?.(sanitizeMassNumericInput(e.target.value));
  };

  if (!showUnit) {
    return (
      <Input
        inputMode="decimal"
        value={value}
        onChange={handleValue}
        disabled={disabled}
        placeholder={valuePlaceholder}
        className={`${compact ? "h-8 text-xs" : "h-9 text-sm"} ${className}`}
      />
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 min-w-0 w-full ${className}`}>
        <Input
          inputMode="decimal"
          value={value}
          onChange={handleValue}
          disabled={disabled}
          placeholder={valuePlaceholder}
          className="h-8 text-xs min-w-0 flex-1 basis-0"
        />
        <select
          value={resolvedUnit}
          onChange={(e) => onUnitChange?.(e.target.value)}
          disabled={disabled}
          className={compactSelectClass}
          aria-label="Unidade"
        >
          {MASS_UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-12 gap-2 items-end ${className}`}>
      <div className="col-span-7 sm:col-span-8">
        <Input
          inputMode="decimal"
          value={value}
          onChange={handleValue}
          disabled={disabled}
          placeholder={valuePlaceholder}
          className="h-9 text-sm"
        />
      </div>
      <div className="col-span-5 sm:col-span-4">
        <select
          value={resolvedUnit}
          onChange={(e) => onUnitChange?.(e.target.value)}
          disabled={disabled}
          className={selectClass}
          aria-label="Unidade"
        >
          {MASS_UNIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
