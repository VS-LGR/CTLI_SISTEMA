import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, CaretDown, CaretUp } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  applyTbhCorrectionToAmbiente,
  applyTbhCorrectionToEnvironmental,
  hydrateEnvironmentalTbh,
  TBH_QUANTITIES,
} from "@/lib/tbhCorrection/tbhCorrectionCalculations";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";

function formatDelta(delta) {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1).replace(".", ",")}`;
}

function CorrectionPreviewTable({ equipmentBlocks }) {
  if (!equipmentBlocks?.length) return null;

  return (
    <div className="space-y-3 mt-3">
      {equipmentBlocks.map((block) => (
        <div key={block.cert_id} className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
          <EllipsisTooltip
            label={block.equipment_name || block.label || ""}
            className="text-xs font-semibold text-slate-700 mb-2 block"
          >
            {block.equipment_name || block.label}
          </EllipsisTooltip>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left p-1">Grandeza</th>
                  <th className="text-left p-1">Fase</th>
                  <th className="text-left p-1">Aparelho</th>
                  <th className="text-left p-1">Corrigida</th>
                  <th className="text-left p-1">Correção</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(block.phases || {}).flatMap(([phase, quantities]) =>
                  Object.entries(quantities || {}).map(([qKey, res]) => {
                    if (!res.valid) return null;
                    const meta = TBH_QUANTITIES[qKey];
                    return (
                      <tr key={`${block.cert_id}-${phase}-${qKey}`} className="border-t border-slate-200/60">
                        <td className="p-1">{meta?.label}</td>
                        <td className="p-1 capitalize">{phase === "initial" ? "Inicial" : "Final"}</td>
                        <td className="p-1 font-mono">{res.device?.toString().replace(".", ",")}</td>
                        <td className="p-1 font-mono text-emerald-800">{res.correctedDisplay}</td>
                        <td className="p-1 font-mono">{formatDelta(res.delta)}</td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {"coleta"|"certificado"} mode
 * @param {object} ambiente - bloco ambiente da coleta
 * @param {object} [environmental] - bloco environmental do certificado (modo certificado)
 */
export default function TbhCorrectionPanel({
  mode = "coleta",
  ambiente,
  environmental,
  envCerts = [],
  onAmbienteChange,
  onEnvironmentalChange,
  onAfterApply,
  className = "",
}) {
  const [previewOpen, setPreviewOpen] = useState(true);
  const [lastPreview, setLastPreview] = useState(null);

  const thermoCertId = mode === "coleta"
    ? ambiente?.thermo_cert_id
    : environmental?.thermo_hygrometer_id;
  const thermoCertId2 = mode === "coleta"
    ? ambiente?.thermo_cert_id_2
    : environmental?.thermo_hygrometer_id_2;

  const handleCalculate = () => {
    const primary = envCerts.find((e) => e.id === thermoCertId);
    const secondary = envCerts.find((e) => e.id === thermoCertId2);

    if (mode === "coleta") {
      const result = applyTbhCorrectionToAmbiente(ambiente, primary, secondary);
      if (!result.ok) {
        (result.errors || ["Não foi possível calcular a correção"]).forEach((msg) => toast.error(msg));
        return;
      }
      onAmbienteChange?.(result.updated);
      setLastPreview(result.byEquipment);
      toast.success("Leituras ambientais corrigidas (RE-6.4E)");
      onAfterApply?.(result);
      return;
    }

    const envHydrated = hydrateEnvironmentalTbh(environmental);
    const result = applyTbhCorrectionToEnvironmental(
      envHydrated,
      thermoCertId,
      thermoCertId2,
      envCerts,
    );
    if (!result.ok) {
      (result.errors || ["Não foi possível calcular a correção"]).forEach((msg) => toast.error(msg));
      return;
    }
    onEnvironmentalChange?.(result.environmental);
    setLastPreview(result.byEquipment);
    toast.success("Leituras ambientais corrigidas (RE-6.4E)");
    onAfterApply?.(result);
  };

  const displayPreview = lastPreview
    || ambiente?.tbh_correction_meta?.by_equipment
    || hydrateEnvironmentalTbh(environmental)?.tbh_correction_meta?.by_equipment;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCalculate}>
          <Calculator size={16} className="mr-1.5" />
          Calcular correção TBH
        </Button>
        {(ambiente?.tbh_correction_applied || hydrateEnvironmentalTbh(environmental)?.tbh_correction_applied) && (
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            Correção aplicada
          </span>
        )}
        {displayPreview?.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => setPreviewOpen((o) => !o)}
          >
            {previewOpen ? <CaretUp size={14} className="mr-1" /> : <CaretDown size={14} className="mr-1" />}
            Detalhes por equipamento
          </Button>
        )}
      </div>
      {previewOpen && displayPreview?.length > 0 && (
        <CorrectionPreviewTable equipmentBlocks={displayPreview} />
      )}
    </div>
  );
}
