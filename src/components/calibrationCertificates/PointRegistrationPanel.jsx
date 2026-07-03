import React, { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "@phosphor-icons/react";
import PesoPadraoPointTable from "@/components/calibrationCertificates/PesoPadraoPointTable";
import { sumConventionalFromWeightIds } from "@/lib/certificateCalculations/environmentalCalculations";
import { MATERIAL_PRESETS, densityFromPresetId } from "@/lib/certificateCalculations/materialConstants";
import { formationKeyForPoint, errorMultiplierForFormation, referenceWithLoadBatch } from "@/lib/certificateCalculations/loadBatchCalculations";
import { loadBatchFieldsFromItem } from "@/lib/standardWeightItemUtils";
import StandardWeightPickerPanel from "@/components/shared/StandardWeightPickerPanel";
import { isCertificatePointFilled } from "@/lib/calibrationCertificates/certificatePointUtils";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { MaxTolerancePointLabel } from "@/components/calibrationCertificates/MaxTolerancePointFlag";
import { cn } from "@/lib/utils";

const MIN_READINGS_AFTER = 3;

function ReadingRow({ label, readings, onChange, disabled, minCount = 0, maxCount = 10 }) {
  const update = (idx, val) => {
    const next = [...readings];
    next[idx] = val;
    onChange(next);
  };

  const add = () => {
    if (readings.length >= maxCount) return;
    onChange([...readings, ""]);
  };

  const remove = (idx) => {
    if (readings.length <= minCount) return;
    onChange(readings.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-semibold text-slate-700">{label}</Label>
        {!disabled && readings.length < maxCount && (
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={add}>
            <Plus size={14} className="mr-1" /> Leitura
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {readings.map((val, idx) => (
          <div key={idx} className="relative">
            <Label className="text-[10px] text-slate-500 mb-0.5 block">L{idx + 1}</Label>
            <Input
              value={val}
              disabled={disabled}
              onChange={(e) => update(idx, e.target.value)}
              className="h-9 text-sm pr-8"
            />
            {!disabled && readings.length > minCount && (
              <button
                type="button"
                className="absolute right-1 top-7 p-1 text-slate-400 hover:text-red-600"
                onClick={() => remove(idx)}
                aria-label={`Remover leitura L${idx + 1}`}
              >
                <Minus size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PointTabContent({
  point,
  weightItems,
  weightCerts,
  disabled,
  onChange,
  unit = "g",
  maxToleranceAlert = false,
}) {
  const setField = (fields) => onChange(point.point_number, fields);

  const handlePesos = (ids) => {
    const vvc = sumConventionalFromWeightIds(ids, weightItems, unit);
    let nominal = vvc.valid ? String(vvc.value) : point.nominal_value;
    if (vvc.valid && point.use_load_batch) {
      const formation = point.load_batch_formation || formationKeyForPoint(point.point_number, true);
      const multiplier = point.error_multiplier ?? errorMultiplierForFormation(formation);
      const lotValue = point.load_batch_conventional_value ?? point.load_batch_nominal;
      const withBatch = referenceWithLoadBatch(vvc.value, lotValue, unit, multiplier);
      if (withBatch.valid) nominal = String(withBatch.value);
    }
    setField({
      standard_weight_ids: ids,
      nominal_value: nominal,
    });
  };

  return (
    <div className="space-y-4">
      {maxToleranceAlert && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>P{point.point_number}</strong> — |Erro + Incerteza| acima da tolerância máxima cadastrada.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            <MaxTolerancePointLabel pointNumber={point.point_number} isAlert={maxToleranceAlert} />
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Preencha leituras, V.R. ou pesos padrão. Resolução e divisão de verificação vêm dos dados da balança.
          </p>
        </div>
      </div>

      <ReadingRow
        label="Leitura Antes do Ajuste"
        readings={point.readings_before?.length ? point.readings_before : [""]}
        minCount={0}
        disabled={disabled}
        onChange={(readings) => setField({ readings_before: readings.filter((r, i) => r !== "" || i === 0) })}
      />

      <ReadingRow
        label="Leitura Depois do Ajuste"
        readings={
          point.readings_after?.length >= MIN_READINGS_AFTER
            ? point.readings_after
            : Array.from({ length: MIN_READINGS_AFTER }, (_, i) => point.readings_after?.[i] ?? "")
        }
        minCount={MIN_READINGS_AFTER}
        disabled={disabled}
        onChange={(readings) => setField({ readings_after: readings })}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Material do peso padrão</Label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            disabled={disabled}
            value={point.material_preset ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const density = densityFromPresetId(id);
              setField({
                material_preset: id,
                material_density: density != null ? String(density) : point.material_density,
              });
            }}
          >
            <option value="">— Selecionar —</option>
            {MATERIAL_PRESETS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Densidade material (kg/m³)</Label>
          <Input
            value={point.material_density ?? ""}
            disabled={disabled}
            onChange={(e) => setField({ material_density: e.target.value })}
            className="h-9 mt-1"
            placeholder="Ex.: 7900"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs mb-2 block">Valor de referência (V.R.) — soma V.V.C dos pesos</Label>
        <Input
          inputMode="decimal"
          value={point.nominal_value ?? ""}
          disabled={disabled}
          onChange={(e) => setField({ nominal_value: sanitizeMassNumericInput(e.target.value) })}
          className="h-9 max-w-xs"
        />
      </div>

      {point.point_number >= 2 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <Checkbox
              checked={Boolean(point.use_load_batch)}
              disabled={disabled}
              onCheckedChange={(checked) => {
                const on = Boolean(checked);
                const formation = formationKeyForPoint(point.point_number, on);
                setField({
                  use_load_batch: on,
                  load_batch_formation: on ? formation : "",
                  error_multiplier: on ? errorMultiplierForFormation(formation) : null,
                });
              }}
            />
            <span className="text-sm font-medium text-amber-900">Com lote de carga</span>
          </label>
          {point.use_load_batch && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Formação (Tabela 01)</Label>
                <Input
                  value={point.load_batch_formation || formationKeyForPoint(point.point_number, true) || ""}
                  disabled
                  className="h-9 mt-1 bg-white"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <Label className="text-xs mb-2 block">Selecionar lote cadastrado</Label>
                <StandardWeightPickerPanel
                  weightItems={weightItems}
                  weightCerts={weightCerts}
                  value={point.load_batch_weight_id ? [point.load_batch_weight_id] : []}
                  onChange={(ids) => {
                    const id = ids[0];
                    if (!id) {
                      setField({ load_batch_weight_id: null });
                      return;
                    }
                    const item = weightItems.find((w) => w.id === id);
                    const fields = loadBatchFieldsFromItem(item, unit);
                    if (fields) {
                      const vvc = sumConventionalFromWeightIds(point.standard_weight_ids, weightItems, unit);
                      let nominal = point.nominal_value;
                      if (vvc.valid) {
                        const formation = point.load_batch_formation || formationKeyForPoint(point.point_number, true);
                        const multiplier = point.error_multiplier ?? errorMultiplierForFormation(formation);
                        const lotValue = fields.load_batch_conventional_value || fields.load_batch_nominal;
                        const withBatch = referenceWithLoadBatch(vvc.value, lotValue, unit, multiplier);
                        if (withBatch.valid) nominal = String(withBatch.value);
                      }
                      setField({ ...fields, nominal_value: nominal });
                    }
                  }}
                  disabled={disabled}
                  unit={unit}
                  compact
                  itemKind="load_batches"
                  singleSelect
                  emptyMessage="Cadastre lotes de carga em Cadastros → Pesos padrão."
                />
              </div>
              <div>
                <Label className="text-xs">V.N. do lote</Label>
                <Input
                  value={point.load_batch_nominal ?? ""}
                  disabled={disabled}
                  onChange={(e) => setField({
                    load_batch_nominal: sanitizeMassNumericInput(e.target.value),
                    load_batch_weight_id: null,
                  })}
                  className="h-9 mt-1"
                  placeholder="Ex.: 190"
                />
              </div>
              <div>
                <Label className="text-xs">V.V.C. do lote</Label>
                <Input
                  value={point.load_batch_conventional_value ?? ""}
                  disabled={disabled}
                  onChange={(e) => setField({
                    load_batch_conventional_value: sanitizeMassNumericInput(e.target.value),
                    load_batch_weight_id: null,
                  })}
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Ue do lote</Label>
                <Input
                  value={point.load_batch_expanded_uncertainty ?? ""}
                  disabled={disabled}
                  onChange={(e) => setField({
                    load_batch_expanded_uncertainty: sanitizeMassNumericInput(e.target.value),
                    load_batch_weight_id: null,
                  })}
                  className="h-9 mt-1"
                />
              </div>
              <p className="sm:col-span-2 lg:col-span-3 text-xs text-amber-800/90">
                Densidade do material e empuxo do lote usam o mesmo cadastro do ponto acima
                (Material do peso padrão / densidade).
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="text-xs mb-2 block">Peso Padrão</Label>
        <PesoPadraoPointTable
          weightItems={weightItems}
          weightCerts={weightCerts}
          value={point.standard_weight_ids || []}
          onChange={handlePesos}
          disabled={disabled}
          unit={unit}
        />
      </div>
    </div>
  );
}

export default function PointRegistrationPanel({
  points = [],
  balance = {},
  weightItems = [],
  weightCerts = [],
  disabled = false,
  legalMetrologyApplicable = false,
  onLegalMetrologyChange,
  showLegalMetrologyToggle = true,
  onPointChange,
  unit = "g",
  maxToleranceAlertPoints = null,
}) {
  const [tab, setTab] = useState("p1");

  const alertSet = useMemo(() => {
    if (!maxToleranceAlertPoints) return new Set();
    if (maxToleranceAlertPoints instanceof Set) return maxToleranceAlertPoints;
    return new Set(maxToleranceAlertPoints);
  }, [maxToleranceAlertPoints]);

  const isTolAlert = (n) => alertSet.has(n);

  const filledCount = useMemo(
    () => points.filter((p) => isCertificatePointFilled(p)).length,
    [points],
  );

  const getPoint = (n) => points.find((p) => p.point_number === n) || { point_number: n };

  const isPointFilled = (n) => isCertificatePointFilled(getPoint(n));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Cadastro de Pontos</p>
        {showLegalMetrologyToggle && onLegalMetrologyChange && (
          <Button
            type="button"
            variant={legalMetrologyApplicable ? "default" : "outline"}
            size="sm"
            className={legalMetrologyApplicable ? "bg-slate-800" : ""}
            onClick={() => onLegalMetrologyChange(!legalMetrologyApplicable)}
            disabled={disabled}
          >
            Metrologia Legal
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="cadastro" className="text-xs">Cadastro</TabsTrigger>
          {Array.from({ length: 10 }, (_, i) => {
            const n = i + 1;
            const filled = isPointFilled(n);
            return (
              <TabsTrigger
                key={n}
                value={`p${n}`}
                className={cn(
                  "text-xs px-2",
                  isTolAlert(n) && "ring-2 ring-amber-500 bg-amber-50 text-amber-950 font-semibold data-[state=active]:bg-amber-100",
                )}
              >
                P{n}
                {isTolAlert(n) && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Acima da tolerância máxima" />
                )}
                {!isTolAlert(n) && filled && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" title="Ponto preenchido" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="cadastro" className="mt-4">
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
            <p className="text-sm text-slate-600">
              Configure cada ponto P1–P10 nas abas correspondentes. O sistema identifica automaticamente quais pontos estão preenchidos.
              Mínimo de {MIN_READINGS_AFTER} leituras depois do ajuste por ponto utilizado.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{filledCount} ponto(s) preenchido(s)</Badge>
              <Badge variant="outline">{weightItems.length} peso(s) cadastrado(s)</Badge>
            </div>
            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
              <li>Resolução (d) e divisão de verificação vêm da balança cadastrada ou manual no certificado</li>
              <li>Deriva do padrão: 1ª calibração = Ue; 2ª+ = V.V.C − V.V.C anterior</li>
              <li>Seleção de pesos preenche automaticamente o V.R. (soma dos V.V.C)</li>
            </ul>
          </div>
        </TabsContent>

        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const pt = getPoint(n);
          return (
            <TabsContent key={n} value={`p${n}`} className="mt-4">
              <PointTabContent
                point={pt}
                weightItems={weightItems}
                weightCerts={weightCerts}
                disabled={disabled}
                unit={unit}
                onChange={onPointChange}
                maxToleranceAlert={isTolAlert(n)}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
