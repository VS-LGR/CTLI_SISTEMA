import React from "react";
import { Label } from "@/components/ui/label";
import { Database } from "@phosphor-icons/react";
import { ENV_EQUIPMENT_TYPES } from "@/lib/cadastroConstants";
import { usesEnvCertPicker } from "@/lib/quotationRequestTypes";
import { selectClass } from "@/components/quotationRequests/QuotationRequestItemsTable";

function envTypeLabel(v) {
  return ENV_EQUIPMENT_TYPES.find((t) => t.value === v)?.label || v || "";
}

export default function QuotationEquipmentPicker({ sectionType, cadastro, onImport }) {
  const showEnv = usesEnvCertPicker(sectionType);
  if (!showEnv) return null;

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
      <select
        className={`${selectClass} sm:min-w-[220px] w-full sm:w-auto`}
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
    </div>
  );
}
