import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash } from "@phosphor-icons/react";
import {
  emptyTbhCorrectionCalibration,
  emptyTbhRange,
  getEnabledQuantities,
  normalizeTbhCorrectionCalibration,
  previewRegressionForRange,
  TBH_QUANTITIES,
} from "@/lib/tbhCorrection/tbhCorrectionCalculations";

const MIN_ROWS = 2;
const MAX_ROWS = 12;

function emptyRow() {
  return { device: "", supplier: "" };
}

function ensureMinRows(points) {
  const rows = [...(points || [])];
  while (rows.length < MIN_ROWS) rows.push(emptyRow());
  return rows.slice(0, MAX_ROWS);
}

function PointsTable({ points, onChange }) {
  const updateRow = (index, field, value) => {
    const next = ensureMinRows(points).map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(next);
  };

  const addRow = () => {
    if (points.length >= MAX_ROWS) return;
    onChange([...ensureMinRows(points), emptyRow()]);
  };

  const removeRow = (index) => {
    const next = ensureMinRows(points).filter((_, i) => i !== index);
    onChange(next.length >= MIN_ROWS ? next : ensureMinRows(next));
  };

  const rows = ensureMinRows(points);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
          <Plus size={14} className="mr-1" /> Linha
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-amber-50 text-slate-600">
            <tr>
              <th className="p-2 text-left">Indicado pelo equipamento</th>
              <th className="p-2 text-left">Indicado pelo provedor</th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-1">
                  <Input
                    value={row.device ?? ""}
                    onChange={(e) => updateRow(i, "device", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Aparelho"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={row.supplier ?? ""}
                    onChange={(e) => updateRow(i, "supplier", e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Provedor"
                  />
                </td>
                <td className="p-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= MIN_ROWS}
                  >
                    <Trash size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RangeBlock({ range, rangeIndex, unit, onChange, onRemove, canRemove }) {
  const preview = useMemo(() => previewRegressionForRange(range), [range]);

  const setField = (field, value) => {
    onChange({ ...range, [field]: value });
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[8rem]">
          <Label className="text-xs text-slate-500">Faixa</Label>
          <Input
            value={range.label ?? ""}
            onChange={(e) => setField("label", e.target.value)}
            className="h-8 text-xs"
            placeholder={`Faixa ${rangeIndex + 1}`}
          />
        </div>
        <div className="w-24">
          <Label className="text-xs text-slate-500">Mín. ({unit})</Label>
          <Input
            value={range.min ?? ""}
            onChange={(e) => setField("min", e.target.value)}
            className="h-8 text-xs"
            placeholder="Min"
          />
        </div>
        <div className="w-24">
          <Label className="text-xs text-slate-500">Máx. ({unit})</Label>
          <Input
            value={range.max ?? ""}
            onChange={(e) => setField("max", e.target.value)}
            className="h-8 text-xs"
            placeholder="Máx"
          />
        </div>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" className="text-red-600 h-8" onClick={onRemove}>
            <Trash size={14} className="mr-1" /> Remover faixa
          </Button>
        )}
      </div>
      <PointsTable
        points={range.points || []}
        onChange={(pts) => setField("points", pts)}
      />
      {preview ? (
        <p className="text-xs text-slate-600 font-mono">
          y = m·x + b → m = {preview.slope.toFixed(8).replace(".", ",")} ; b = {preview.intercept.toFixed(8).replace(".", ",")} ({preview.pointCount} pts)
        </p>
      ) : (
        <p className="text-xs text-slate-500">Informe ao menos 2 pares válidos para calcular inclinação e intercepção.</p>
      )}
    </div>
  );
}

function QuantityBlock({ quantityKey, label, unit, ranges, onChange, disabled }) {
  const addRange = () => {
    onChange([...ranges, emptyTbhRange(`Faixa ${ranges.length + 1}`)]);
  };

  const updateRange = (index, nextRange) => {
    onChange(ranges.map((r, i) => (i === index ? nextRange : r)));
  };

  const removeRange = (index) => {
    if (ranges.length <= 1) return;
    onChange(ranges.filter((_, i) => i !== index));
  };

  return (
    <div className={`space-y-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label} ({unit})</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRange}>
          <Plus size={14} className="mr-1" /> Faixa
        </Button>
      </div>
      {ranges.map((range, i) => (
        <RangeBlock
          key={i}
          range={range}
          rangeIndex={i}
          unit={unit}
          onChange={(next) => updateRange(i, next)}
          onRemove={() => removeRange(i)}
          canRemove={ranges.length > 1}
        />
      ))}
    </div>
  );
}

export default function TbhCalibrationPointsEditor({ value, onChange, equipmentType }) {
  const calibration = normalizeTbhCorrectionCalibration(value || emptyTbhCorrectionCalibration());
  const enabledKeys = new Set(getEnabledQuantities(equipmentType).map((q) => q.key));

  const setRanges = (quantityKey, ranges) => {
    onChange({
      ...calibration,
      [quantityKey]: { ranges },
    });
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-200">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Tabela de correção (RE-6.4E)</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Pontos de calibração por faixa para regressão linear: leitura corrigida = (leitura do aparelho × inclinação) + intercepção.
        </p>
      </div>
      {Object.values(TBH_QUANTITIES).map((q) => (
        <QuantityBlock
          key={q.key}
          quantityKey={q.key}
          label={q.label}
          unit={q.unit}
          ranges={calibration[q.key]?.ranges || []}
          onChange={(ranges) => setRanges(q.key, ranges)}
          disabled={!enabledKeys.has(q.key)}
        />
      ))}
    </div>
  );
}

export { emptyTbhCorrectionCalibration, normalizeTbhCorrectionCalibration };
