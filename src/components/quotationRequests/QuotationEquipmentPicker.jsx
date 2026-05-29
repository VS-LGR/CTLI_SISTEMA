import React from "react";
import { Label } from "@/components/ui/label";
import { Database } from "@phosphor-icons/react";
import { defaultOimlCriteria } from "@/lib/quotationRequestDefaults";
import { ENV_EQUIPMENT_TYPES } from "@/lib/cadastroConstants";
import { usesEnvCertPicker, usesWeightPicker } from "@/lib/quotationRequestTypes";
import { selectClass } from "@/components/quotationRequests/QuotationRequestItemsTable";

function envTypeLabel(v) {
  return ENV_EQUIPMENT_TYPES.find((t) => t.value === v)?.label || v || "";
}

export default function QuotationEquipmentPicker({ sectionType, cadastro, onImport }) {
  const showWeights = usesWeightPicker(sectionType);
  const showEnv = usesEnvCertPicker(sectionType);
  if (!showWeights && !showEnv) return null;

  const importWeight = (weightId) => {
    const w = cadastro.weights?.find((x) => x.id === weightId);
    if (!w) return;
    let cert = null;
    if (w.weight_certificate_id) {
      cert = cadastro.weightCerts?.find((c) => c.id === w.weight_certificate_id);
    }
    onImport({
      equipment: "Peso padrão",
      material: cert?.material || "",
      identification_codes: w.identification || "",
      nominal_values_or_calibration_range: w.nominal_value
        ? `${w.nominal_value} ${w.unit || ""}`.trim()
        : "",
      max_error_uncertainty_or_acceptance_criteria: cert?.class
        ? defaultOimlCriteria(cert.class)
        : undefined,
      linked_weight_ids: [w.id],
      linked_certificate_ids: cert ? [cert.id] : [],
      quantity: 1,
    });
  };

  const importEnvCert = (certId) => {
    const c = cadastro.envCerts?.find((x) => x.id === certId);
    if (!c) return;
    const patch = {
      equipment: c.equipment_name || envTypeLabel(c.equipment_type),
      identification_codes: c.certificate_number || "",
      linked_env_cert_id: c.id,
      quantity: 1,
    };
    if (sectionType === "calibracao_termo_baro_higrometro") {
      patch.magnitude = envTypeLabel(c.equipment_type);
      patch.material = c.manufacturer ? `${c.manufacturer} ${c.model || ""}`.trim() : "";
    }
    if (sectionType === "aquisicao_termo_baro_higrometro") {
      patch.magnitude = envTypeLabel(c.equipment_type);
      patch.equipment = c.equipment_name || patch.equipment;
    }
    onImport(patch);
  };

  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-4 space-y-3">
      <Label className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1.5">
        <Database size={14} /> Importar do cadastro
      </Label>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
      {showWeights && (
        <select
          className={`${selectClass} sm:min-w-[220px] flex-1`}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) importWeight(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">Peso padrão…</option>
          {(cadastro.weights || []).map((w) => (
            <option key={w.id} value={w.id}>{w.identification} — {w.nominal_value} {w.unit}</option>
          ))}
        </select>
      )}
      {showEnv && (
        <select
          className={`${selectClass} sm:min-w-[220px] flex-1`}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) importEnvCert(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">Termo-baro-higrômetro…</option>
          {(cadastro.envCerts || []).map((c) => (
            <option key={c.id} value={c.id}>{c.equipment_name || c.certificate_number}</option>
          ))}
        </select>
      )}
      </div>
    </div>
  );
}
