import { formatDisplayValue, formatCurrencyBRL } from "../purchaseOrderCalculations";
import { buildInspectionPdfLines } from "../purchaseOrderInspectionFields";
import { formatOrderNumber, getTypeMeta } from "../purchaseOrderTypes";

function fmtDate(d) {
  if (!d) return "-";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  if (!y || !m || !day) return formatDisplayValue(d);
  return `${day}/${m}/${y}`;
}

function snapField(obj, key) {
  return formatDisplayValue(obj?.[key]);
}

function formatIssueEmission(order) {
  const code = order.document_code || "RE-6.6E";
  const rev = order.document_revision ?? "00";
  return `${code} Rev. ${rev}`;
}

export function buildPedidoCompraPdfViewModel(order, { employees = [] } = {}) {
  const supplier = order.supplier_data_snapshot || {};
  const billing = order.client_environment_data_snapshot || {};
  const typeMeta = getTypeMeta(order.type);
  const items = (order.items || []).slice().sort((a, b) => a.item_number - b.item_number);

  const signatures = {};
  for (const sig of order.signatures || []) {
    signatures[sig.role] = sig.snapshot || {};
  }

  return {
    isDraft: order.status === "rascunho",
    header: {
      displayTitle: "Pedido de compras",
      typeLabel: typeMeta?.serviceTypeLabel || "",
      orderNumber: formatOrderNumber(order.order_number, order.order_year),
      code: order.document_code || "RE-6.6E",
      revision: order.document_revision || "00",
      reference: order.document_reference || "PR-6.6",
      issueEmission: formatIssueEmission(order),
      orderDate: fmtDate(order.order_date),
    },
    supplier: {
      company: snapField(supplier, "company"),
      contact: snapField(supplier, "contact"),
      address: snapField(supplier, "address"),
      phone: snapField(supplier, "phone"),
      cnpj: snapField(supplier, "cnpj"),
      email: snapField(supplier, "email"),
    },
    billing: {
      legalName: snapField(billing, "legal_name"),
      tradeName: snapField(billing, "trade_name"),
      address: snapField(billing, "address"),
      cep: snapField(billing, "cep"),
      city: snapField(billing, "city"),
      state: snapField(billing, "state"),
      phone: snapField(billing, "phone"),
      email: snapField(billing, "email"),
      cnpj: snapField(billing, "cnpj"),
      stateRegistration: snapField(billing, "state_registration"),
      environmentResponsible: snapField(billing, "environment_responsible"),
    },
    items: items.map((it) => ({
      itemNumber: it.item_number,
      equipment: formatDisplayValue(it.equipment),
      material: formatDisplayValue(it.material),
      identificationCodes: formatDisplayValue(it.identification_codes),
      nominalValues: formatDisplayValue(it.nominal_values),
      rangeText: formatDisplayValue(it.range_text),
      classText: formatDisplayValue(it.class_text),
      magnitude: formatDisplayValue(it.magnitude),
      minimumReadingRange: formatDisplayValue(it.minimum_reading_range),
      acceptableResolution: formatDisplayValue(it.acceptable_resolution),
      maxErrorUncertainty: formatDisplayValue(it.max_error_uncertainty),
      hiringCriteria: formatDisplayValue(it.hiring_criteria),
      programName: formatDisplayValue(it.program_name),
      artifactsDescription: formatDisplayValue(it.artifacts_description),
      auditScope: formatDisplayValue(it.audit_scope),
      quantity: formatDisplayValue(it.quantity),
      unitValue: formatCurrencyBRL(it.unit_value),
      totalValue: formatCurrencyBRL(it.total_value),
    })),
    totals: {
      subtotal: formatCurrencyBRL(order.subtotal),
      discount: formatCurrencyBRL(order.discount),
      finalValue: formatCurrencyBRL(order.final_value),
      taxesMode: order.taxes_mode === "percentual" ? "Impostos em percentual" : "Impostos inclusos",
    },
    complements: {
      paymentTerms: snapField(order, "payment_terms"),
      freight: snapField(order, "freight_responsibility"),
      carrier: snapField(order, "carrier_info"),
      quotation: snapField(order, "quotation_number"),
      executionPeriod: snapField(order, "execution_period"),
      observations: snapField(order, "observations"),
    },
    signatures: {
      technicalManager: {
        ...(signatures.technical_manager || {}),
        roleLabel: signatures.technical_manager?.custom_label
          || order.signature_slot_1_label
          || "Gerente Técnico",
      },
      purchase: {
        ...(signatures.purchase || {}),
        roleLabel: signatures.purchase?.custom_label
          || order.signature_slot_2_label
          || "Compras",
      },
    },
    inspectionLines: order.inspection
      ? buildInspectionPdfLines(order.type, order.inspection, employees)
      : [],
    type: order.type,
  };
}
