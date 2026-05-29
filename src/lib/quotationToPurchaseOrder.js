import { emptyPurchaseOrderItem } from "@/lib/purchaseOrderTypes";
import { getTypeMeta } from "@/lib/quotationRequestTypes";
import { formatRequestNumber } from "@/lib/quotationRequestDisplay";
import { DEFAULT_OBSERVATIONS, getTitleForType } from "@/lib/purchaseOrderTypes";

/** Mapa QR section_type → PO type (treinamento não tem equivalente). */
export const QUOTATION_TO_PO_TYPE = {
  ensaio_proficiencia: "ensaio_proficiencia",
  auditoria_interna: "auditoria_interna",
  calibracao_termo_baro_higrometro: "calibracao_termo_baro_higrometro",
  calibracao_pesos_padrao: "calibracao_pesos_padrao",
  aquisicao_termo_baro_higrometro: "compra_termo_baro_higrometro",
  aquisicao_pesos_padrao: "compra_pesos",
  treinamento: null,
};

export function mapQuotationSectionToPoType(sectionType) {
  return QUOTATION_TO_PO_TYPE[sectionType] ?? null;
}

export function isConvertibleSectionType(sectionType) {
  return mapQuotationSectionToPoType(sectionType) != null;
}

/** Tipos selecionados que podem gerar pedido de compra. */
export function getConvertibleSectionTypes(sections) {
  return (sections || [])
    .filter((s) => s.is_selected && isConvertibleSectionType(s.type))
    .map((s) => s.type);
}

export function getQuotationConversionState(quotation, conversions = []) {
  const convertible = getConvertibleSectionTypes(quotation.sections);
  const convertedTypes = new Set((conversions || []).map((c) => c.section_type));
  const pending = convertible.filter((t) => !convertedTypes.has(t));
  const trainingSelected = (quotation.sections || []).some(
    (s) => s.is_selected && s.type === "treinamento",
  );

  return {
    convertible,
    pending,
    convertedTypes,
    trainingSelected,
    fullyConverted: convertible.length > 0 && pending.length === 0,
    canConvert:
      quotation.status === "aprovada"
      && !!quotation.supplier_id
      && pending.length > 0,
  };
}

function basePoItem(itemNumber) {
  const row = emptyPurchaseOrderItem(itemNumber);
  return {
    ...row,
    unit_value: 0,
    taxes_included: true,
    taxes_percent: 0,
    total_value: 0,
  };
}

export function mapQuotationItemsToPoItems(sectionType, section, items) {
  const poType = mapQuotationSectionToPoType(sectionType);
  if (!poType) return [];

  if (sectionType === "ensaio_proficiencia") {
    return [{
      ...basePoItem(1),
      program_name: section?.essay_scope || "",
      hiring_criteria: section?.custom_criteria || section?.acquisition_criteria || "",
      quantity: 1,
    }];
  }

  const typeItems = (items || []).filter((it) => it.section_type === sectionType);
  return typeItems.map((it, idx) => {
    const row = basePoItem(it.item_number ?? idx + 1);

    if (sectionType === "auditoria_interna") {
      return {
        ...row,
        audit_scope: it.audit_scope || "",
        hiring_criteria: it.contracting_criteria || "",
        quantity: Number(it.quantity_days) > 0 ? Number(it.quantity_days) : 1,
      };
    }

    if (sectionType === "calibracao_pesos_padrao") {
      return {
        ...row,
        equipment: it.equipment || "",
        material: it.material || "",
        identification_codes: it.identification_codes || "",
        nominal_values: it.nominal_values_or_calibration_range || "",
        max_error_uncertainty: it.max_error_uncertainty_or_acceptance_criteria || "",
        quantity: it.quantity ?? 1,
        linked_weight_ids: it.linked_weight_ids || [],
        linked_certificate_ids: it.linked_certificate_ids || [],
      };
    }

    if (sectionType === "aquisicao_pesos_padrao") {
      return {
        ...row,
        equipment: it.equipment || "",
        material: it.material || "",
        identification_codes: it.identification_codes || "",
        nominal_values: it.nominal_values_or_calibration_range || "",
        hiring_criteria: it.max_error_uncertainty_or_acceptance_criteria || "",
        quantity: it.quantity ?? 1,
        linked_weight_ids: it.linked_weight_ids || [],
        linked_certificate_ids: it.linked_certificate_ids || [],
      };
    }

    if (sectionType === "calibracao_termo_baro_higrometro") {
      return {
        ...row,
        equipment: it.equipment || "",
        material: it.material || "",
        identification_codes: it.identification_codes || "",
        magnitude: it.magnitude || "",
        nominal_values: it.nominal_values_or_calibration_range || "",
        minimum_reading_range: it.minimum_reading_range || "",
        acceptable_resolution: it.acceptable_resolution || "",
        max_error_uncertainty: it.max_error_uncertainty_or_acceptance_criteria || "",
        quantity: it.quantity ?? 1,
        linked_env_cert_id: it.linked_env_cert_id || null,
      };
    }

    if (sectionType === "aquisicao_termo_baro_higrometro") {
      return {
        ...row,
        equipment: it.equipment || "",
        identification_codes: it.identification_codes || "",
        magnitude: it.magnitude || "",
        minimum_reading_range: it.minimum_reading_range || "",
        acceptable_resolution: it.acceptable_resolution || "",
        max_error_uncertainty: it.max_error_uncertainty_or_acceptance_criteria || "",
        quantity: it.quantity ?? 1,
        linked_env_cert_id: it.linked_env_cert_id || null,
      };
    }

    return row;
  });
}

export function mapQuotationHeaderToPoForm(quotation, poType, { orderNumber, orderYear } = {}) {
  const quotationNumber = formatRequestNumber(quotation.request_number, quotation.request_year);
  const year = orderYear ?? new Date().getFullYear();

  return {
    tenant_id: quotation.tenant_id,
    type: poType,
    title: getTitleForType(poType),
    order_number: orderNumber,
    order_year: year,
    supplier_id: quotation.supplier_id,
    supplier_data_snapshot: quotation.supplier_data_snapshot || {},
    client_environment_id: quotation.client_environment_id || quotation.tenant_id,
    client_environment_data_snapshot: quotation.client_environment_data_snapshot || {},
    requested_by_id: quotation.sent_by_id || null,
    technical_manager_id: null,
    purchase_responsible_id: null,
    status: "rascunho",
    order_date: quotation.request_date || new Date().toISOString().slice(0, 10),
    issue_date: null,
    payment_terms: "",
    freight_responsibility: "",
    carrier_info: "",
    quotation_number: quotationNumber,
    quotation_request_id: quotation.id,
    execution_period: "",
    observations: quotation.notes
      ? `${DEFAULT_OBSERVATIONS}\n\nOrigem: solicitação ${quotationNumber}.`
      : DEFAULT_OBSERVATIONS,
    discount: 0,
    taxes_mode: "incluso",
    document_code: "RE-6.6E",
    document_revision: "00",
    document_reference: "PR-6.6",
    preserveSnapshots: true,
  };
}

export function sectionTypeLabel(sectionType) {
  return getTypeMeta(sectionType)?.label || sectionType;
}

export function poTypeLabel(poType) {
  return getTitleForType(poType);
}
