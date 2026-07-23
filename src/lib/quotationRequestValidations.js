import { getTypeMeta } from "@/lib/quotationRequestTypes";

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

function validateItem(typeId, item, idx) {
  const n = idx + 1;
  switch (typeId) {
    case "auditoria_interna":
      if (isBlank(item.audit_scope)) return `Auditoria item ${n}: informe o escopo`;
      if (isBlank(item.contracting_criteria)) return `Auditoria item ${n}: informe os critérios de contratação`;
      if (!item.quantity_days || Number(item.quantity_days) <= 0) return `Auditoria item ${n}: informe quantidade de dias`;
      break;
    case "calibracao_termo_baro_higrometro":
      if (isBlank(item.equipment)) return `Calibração TBH item ${n}: informe o equipamento`;
      if (isBlank(item.identification_codes)) return `Calibração TBH item ${n}: informe código/identificação`;
      if (isBlank(item.nominal_values_or_calibration_range)) return `Calibração TBH item ${n}: informe faixa de calibração`;
      if (isBlank(item.max_error_uncertainty_or_acceptance_criteria)) return `Calibração TBH item ${n}: informe critério de aceitação`;
      if (!item.quantity || Number(item.quantity) <= 0) return `Calibração TBH item ${n}: informe quantidade`;
      break;
    case "calibracao_pesos_padrao":
    case "aquisicao_pesos_padrao":
      if (isBlank(item.equipment)) return `Pesos item ${n}: informe o equipamento`;
      if (isBlank(item.material)) return `Pesos item ${n}: informe o material`;
      if (isBlank(item.identification_codes) && typeId === "calibracao_pesos_padrao") {
        return `Pesos item ${n}: informe código de identificação`;
      }
      if (isBlank(item.nominal_values_or_calibration_range)) return `Pesos item ${n}: informe valor nominal/faixa`;
      if (isBlank(item.max_error_uncertainty_or_acceptance_criteria)) return `Pesos item ${n}: informe critério de aceitação`;
      if (!item.quantity || Number(item.quantity) <= 0) return `Pesos item ${n}: informe quantidade`;
      break;
    case "treinamento":
      if (isBlank(item.training_name)) return `Treinamento item ${n}: informe o nome`;
      if (!item.participants_number || Number(item.participants_number) <= 0) {
        return `Treinamento item ${n}: informe número de participantes`;
      }
      if (isBlank(item.max_error_uncertainty_or_acceptance_criteria)) {
        return `Treinamento item ${n}: informe critérios de aceitação`;
      }
      break;
    case "aquisicao_termo_baro_higrometro":
      if (isBlank(item.equipment)) return `Aquisição TBH item ${n}: informe equipamento`;
      if (isBlank(item.magnitude)) return `Aquisição TBH item ${n}: informe grandeza`;
      if (isBlank(item.minimum_reading_range)) return `Aquisição TBH item ${n}: informe faixa mínima de leitura`;
      if (isBlank(item.acceptable_resolution)) return `Aquisição TBH item ${n}: informe resolução máxima aceitável`;
      if (!item.quantity || Number(item.quantity) <= 0) return `Aquisição TBH item ${n}: informe quantidade`;
      break;
    default:
      break;
  }
  return null;
}

export function validateQuotationRequest(form, sections, items, { forExport = false } = {}) {
  if (!form.client_environment_id) return "Selecione o cliente/ambiente";
  if (!form.supplier_id) return "Selecione o provedor";
  if (!form.request_date) return "Informe a data da solicitação";
  if (!form.request_number) return "Informe o número da solicitação";
  if (!form.sent_by_id) return "Selecione quem envia (colaborador)";

  const selected = (sections || []).filter((s) => s.is_selected);
  if (!selected.length) return "Selecione um tipo de solicitação";
  if (selected.length > 1) return "Selecione apenas um tipo de solicitação por vez";

  for (const sec of selected) {
    const meta = getTypeMeta(sec.type);
    if (!meta) continue;

    if (sec.type === "ensaio_proficiencia") {
      if (isBlank(sec.essay_scope)) return "PEP: informe o escopo do ensaio";
      const crit = sec.custom_criteria || sec.acquisition_criteria;
      if (isBlank(crit)) return "PEP: informe os critérios para aquisição";
      continue;
    }

    const typeItems = (items || []).filter((it) => it.section_type === sec.type);
    if (!typeItems.length) return `${meta.label}: adicione pelo menos uma linha`;

    for (let i = 0; i < typeItems.length; i++) {
      const err = validateItem(sec.type, typeItems[i], i);
      if (err) return err;
    }
  }

  if (forExport && form.status === "rascunho") {
    return null;
  }
  return null;
}
