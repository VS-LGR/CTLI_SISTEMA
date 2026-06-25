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
import { MATERIAL_PRESETS, densityFromPresetId, ppmFromPresetId } from "@/lib/certificateCalculations/materialConstants";
import {
  resolveDefaultResolutionForPoint,
  resolveDefaultVerificationDivision,
} from "@/lib/calibrationCertificates/certificatePointUtils";

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
  balance,
  weightItems,
  weightCerts,
  disabled,
  onChange,
  unit = "g",
}) {
  const enabled = Boolean(point.point_enabled);
  const fieldsDisabled = disabled || !enabled;

  const setField = (fields) => onChange(point.point_number, fields);

  const handlePesos = (ids) => {
    const vvc = sumConventionalFromWeightIds(ids, weightItems, unit);
    const nominal = vvc.valid ? String(vvc.value) : point.nominal_value;
    const resolution = point.resolution || resolveDefaultResolutionForPoint(nominal, balance, unit);
    const verification = point.verification_division || resolveDefaultVerificationDivision(nominal, balance, unit);
    setField({
      standard_weight_ids: ids,
      nominal_value: nominal,
      resolution,
      verification_division: verification,
    });
  };

  const handleEnable = (checked) => {
    const on = Boolean(checked);
    const fields = { point_enabled: on };
    if (on && !(point.readings_after?.length >= MIN_READINGS_AFTER)) {
      const current = point.readings_after || [];
      const padded = [...current];
      while (padded.length < MIN_READINGS_AFTER) padded.push("");
      fields.readings_after = padded;
    }
    setField(fields);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Ponto {point.point_number}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Instruções: Selecione o ponto para liberar os campos para preenchimento; Os campos devem ser preenchidos em gramas.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <Checkbox
          checked={enabled}
          disabled={disabled}
          onCheckedChange={handleEnable}
        />
        <span className="text-sm font-medium">P{point.point_number}</span>
      </label>

      <ReadingRow
        label="Leitura Antes do Ajuste"
        readings={point.readings_before?.length ? point.readings_before : [""]}
        minCount={0}
        disabled={fieldsDisabled}
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
        disabled={fieldsDisabled}
        onChange={(readings) => setField({ readings_after: readings })}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Resolução (d)</Label>
          <Input
            value={point.resolution ?? ""}
            disabled={fieldsDisabled}
            onChange={(e) => setField({ resolution: e.target.value })}
            className="h-9 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Divisão de Verificação</Label>
          <Input
            value={point.verification_division ?? ""}
            disabled={fieldsDisabled}
            onChange={(e) => setField({ verification_division: e.target.value })}
            className="h-9 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Material do peso padrão</Label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            disabled={fieldsDisabled}
            value={point.material_preset ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const density = densityFromPresetId(id);
              const ppm = ppmFromPresetId(id);
              setField({
                material_preset: id,
                material_density: density != null ? String(density) : point.material_density,
                buoyancy_ppm: ppm != null ? String(ppm) : point.buoyancy_ppm,
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
            disabled={fieldsDisabled}
            onChange={(e) => setField({ material_density: e.target.value })}
            className="h-9 mt-1"
            placeholder="Ex.: 7900"
          />
        </div>
        <div>
          <Label className="text-xs">PPM do Empuxo</Label>
          <Input
            value={point.buoyancy_ppm ?? ""}
            disabled={fieldsDisabled}
            onChange={(e) => setField({ buoyancy_ppm: e.target.value })}
            className="h-9 mt-1"
            placeholder="Ex.: 1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs mb-2 block">Valor de referência (V.R.) — soma V.V.C dos pesos</Label>
        <Input
          value={point.nominal_value ?? ""}
          disabled={fieldsDisabled}
          onChange={(e) => setField({ nominal_value: e.target.value })}
          className="h-9 max-w-xs"
        />
      </div>

      <div>
        <Label className="text-xs mb-2 block">Peso Padrão</Label>
        <PesoPadraoPointTable
          weightItems={weightItems}
          weightCerts={weightCerts}
          value={point.standard_weight_ids || []}
          onChange={handlePesos}
          disabled={fieldsDisabled}
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
  onPointChange,
  unit = "g",
}) {
  const [tab, setTab] = useState("p1");

  const enabledCount = useMemo(
    () => points.filter((p) => p.point_enabled).length,
    [points],
  );

  const getPoint = (n) => points.find((p) => p.point_number === n) || { point_number: n, point_enabled: false };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Cadastro de Pontos</p>
        {onLegalMetrologyChange && (
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
            const pt = getPoint(n);
            return (
              <TabsTrigger key={n} value={`p${n}`} className="text-xs px-2">
                P{n}
                {pt.point_enabled && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="cadastro" className="mt-4">
          <div className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
            <p className="text-sm text-slate-600">
              Configure cada ponto P1–P10 nas abas correspondentes. Mínimo de {MIN_READINGS_AFTER} leituras depois do ajuste por ponto ativo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{enabledCount} ponto(s) ativo(s)</Badge>
              <Badge variant="outline">{weightItems.length} peso(s) cadastrado(s)</Badge>
            </div>
            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
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
                balance={balance}
                weightItems={weightItems}
                weightCerts={weightCerts}
                disabled={disabled}
                unit={unit}
                onChange={onPointChange}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
