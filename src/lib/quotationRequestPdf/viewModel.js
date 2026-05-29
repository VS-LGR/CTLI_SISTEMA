import { displayValue, formatDateBr, formatRequestNumber } from "@/lib/quotationRequestDisplay";
import { getItemColumns, getTypeMeta, QUOTATION_REQUEST_TYPES } from "@/lib/quotationRequestTypes";

function snapField(obj, key) {
  return displayValue(obj?.[key]);
}

function itemToRow(typeId, it) {
  const cols = getItemColumns(typeId);
  const row = {};
  for (const col of cols) {
    const v = it[col.key];
    if (col.key === "item_number") row[col.key] = displayValue(v);
    else if (col.key === "quantity" || col.key === "quantity_days" || col.key === "participants_number") {
      row[col.key] = displayValue(v);
    } else {
      row[col.key] = displayValue(v);
    }
  }
  return row;
}

export function buildQuotationRequestPdfViewModel(request) {
  const client = request.client_environment_data_snapshot || {};
  const supplier = request.supplier_data_snapshot || {};
  const sentBy = request.sent_by_data_snapshot || {};
  const selectedTypes = (request.sections || []).filter((s) => s.is_selected);

  const typeChecklist = QUOTATION_REQUEST_TYPES.map((t) => {
    const sec = (request.sections || []).find((s) => s.type === t.id);
    return {
      label: t.pdfCheckboxLabel,
      checked: !!sec?.is_selected,
    };
  });

  const sections = selectedTypes.map((sec) => {
    const meta = getTypeMeta(sec.type);
    const cols = getItemColumns(sec.type);
    const typeItems = (request.items || [])
      .filter((it) => it.section_type === sec.type)
      .sort((a, b) => a.item_number - b.item_number);

    const sectionData = {
      typeId: sec.type,
      title: meta?.label || sec.type,
      isPep: sec.type === "ensaio_proficiencia",
      essayScope: displayValue(sec.essay_scope),
      acquisitionCriteria: displayValue(sec.custom_criteria || sec.acquisition_criteria),
      columns: cols.map((c) => ({ header: c.label, dataKey: c.key })),
      rows: typeItems.map((it) => itemToRow(sec.type, it)),
      notes: displayValue(sec.notes),
    };
    return sectionData;
  });

  const fullAddress = [
    snapField(client, "address"),
    client.cep ? `CEP: ${snapField(client, "cep")}` : "",
    client.city || client.state ? `${snapField(client, "city")}/${snapField(client, "state")}` : "",
  ].filter((x) => x && x !== "-").join(" — ") || snapField(client, "address");

  return {
    isDraft: request.status === "rascunho",
    header: {
      title: "SOLICITAÇÃO DE ORÇAMENTO",
      requestNumber: formatRequestNumber(request.request_number, request.request_year),
      requestDate: formatDateBr(request.request_date),
      code: request.document_code || "RE-6.6C",
      reference: request.document_reference || "PR-6.6",
      revision: request.document_revision || "00",
      modelIssueDate: formatDateBr(request.document_model_issue_date || "2025-06-30"),
    },
    requester: {
      legalName: snapField(client, "legal_name"),
      address: fullAddress,
      phone: snapField(client, "phone"),
      email: snapField(client, "email"),
      cnpj: snapField(client, "cnpj"),
      sentBy: displayValue(sentBy.full_name || client.sent_by || client.environment_responsible),
    },
    supplier: {
      company: snapField(supplier, "company"),
      address: snapField(supplier, "address"),
      phone: snapField(supplier, "phone"),
      cnpj: snapField(supplier, "cnpj"),
      email: snapField(supplier, "email"),
      contact: snapField(supplier, "contact"),
    },
    typeChecklist,
    sections,
    notes: displayValue(request.notes),
  };
}
