import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  buildClientEnvironmentSnapshot,
  buildSentBySnapshot,
  buildSupplierSnapshot,
  mergeSentByIntoClientSnapshot,
} from "@/lib/quotationRequestSnapshots";
import { canTransitionStatus, canTransitionToConvertedPurchaseOrder, buildInitialSections } from "@/lib/quotationRequestTypes";
import { DOCUMENT_MODEL_ISSUE_DATE } from "@/lib/quotationRequestDefaults";
import { createPurchaseOrder, suggestNextOrderNumber } from "@/lib/purchaseOrdersApi";
import {
  getQuotationConversionState,
  mapQuotationHeaderToPoForm,
  mapQuotationItemsToPoItems,
  mapQuotationSectionToPoType,
} from "@/lib/quotationToPurchaseOrder";

export function assertSupabaseQuotationRequests() {
  if (!isSupabaseAuthMode) {
    throw new Error("Solicitações de orçamento requerem ligação Supabase.");
  }
}

export async function suggestNextRequestNumber(tenantId, year = new Date().getFullYear()) {
  assertSupabaseQuotationRequests();
  const { data, error } = await supabase
    .from("quotation_requests")
    .select("request_number")
    .eq("tenant_id", tenantId)
    .eq("request_year", year)
    .order("request_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.request_number || 0) + 1;
}

export async function listQuotationRequests(tenantId, filters = {}) {
  assertSupabaseQuotationRequests();
  let q = supabase
    .from("quotation_requests")
    .select("*, supplier:supplier_id(name)")
    .eq("tenant_id", tenantId)
    .order("request_year", { ascending: false })
    .order("request_number", { ascending: false });
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.year) q = q.eq("request_year", Number(filters.year));
  if (filters.supplierId) q = q.eq("supplier_id", filters.supplierId);
  if (filters.dateFrom) q = q.gte("request_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("request_date", filters.dateTo);
  const { data, error } = await q;
  if (error) throw error;
  let rows = data || [];
  if (filters.type && filters.type !== "all") {
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      const { data: secs } = await supabase
        .from("quotation_request_type_sections")
        .select("quotation_request_id, type, is_selected")
        .in("quotation_request_id", ids)
        .eq("type", filters.type)
        .eq("is_selected", true);
      const match = new Set((secs || []).map((s) => s.quotation_request_id));
      rows = rows.filter((r) => match.has(r.id));
    } else {
      rows = [];
    }
  }
  return rows;
}

export async function getQuotationRequest(id) {
  assertSupabaseQuotationRequests();
  const { data: request, error } = await supabase
    .from("quotation_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  const [sectionsRes, itemsRes, attRes, histRes, convRes] = await Promise.all([
    supabase.from("quotation_request_type_sections").select("*").eq("quotation_request_id", id).order("type"),
    supabase.from("quotation_request_items").select("*").eq("quotation_request_id", id).order("section_type").order("item_number"),
    supabase.from("quotation_request_attachments").select("*").eq("quotation_request_id", id).order("created_at", { ascending: false }),
    supabase.from("quotation_request_status_history").select("*").eq("quotation_request_id", id).order("changed_at", { ascending: false }),
    supabase.from("quotation_request_conversions").select("*, purchase_order:purchase_order_id(id, order_number, order_year, type, status)").eq("quotation_request_id", id).order("created_at"),
  ]);
  if (sectionsRes.error) throw sectionsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (attRes.error) throw attRes.error;
  if (histRes.error) throw histRes.error;
  if (convRes.error) throw convRes.error;

  return {
    ...request,
    sections: sectionsRes.data?.length ? sectionsRes.data : buildInitialSections(),
    items: itemsRes.data || [],
    attachments: attRes.data || [],
    status_history: histRes.data || [],
    conversions: convRes.data || [],
  };
}

async function loadTenant(tenantId) {
  const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  if (error) throw error;
  return data;
}

async function loadSupplier(supplierId) {
  if (!supplierId) return null;
  const { data, error } = await supabase.from("supplier_registrations").select("*").eq("id", supplierId).single();
  if (error) throw error;
  return data;
}

async function loadEmployee(employeeId) {
  if (!employeeId) return null;
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("id", employeeId).single();
  if (error) throw error;
  return data;
}

function mapSectionsForDb(sections) {
  return (sections || []).map((s) => ({
    type: s.type,
    is_selected: !!s.is_selected,
    essay_scope: s.essay_scope || "",
    acquisition_criteria: s.acquisition_criteria || "",
    default_criteria: s.default_criteria || "",
    custom_criteria: s.custom_criteria || "",
    notes: s.notes || "",
  }));
}

function mapItemsForDb(items) {
  return (items || []).map((it, idx) => ({
    section_type: it.section_type,
    item_number: it.item_number ?? idx + 1,
    equipment: it.equipment || "",
    material: it.material || "",
    identification_codes: it.identification_codes || "",
    nominal_values_or_calibration_range: it.nominal_values_or_calibration_range || "",
    max_error_uncertainty_or_acceptance_criteria: it.max_error_uncertainty_or_acceptance_criteria || "",
    quantity: it.quantity ?? 1,
    audit_scope: it.audit_scope || "",
    auditors: it.auditors || "",
    contracting_criteria: it.contracting_criteria || "",
    quantity_days: it.quantity_days ?? 0,
    training_name: it.training_name || "",
    participants_number: it.participants_number ?? 0,
    magnitude: it.magnitude || "",
    minimum_reading_range: it.minimum_reading_range || "",
    acceptable_resolution: it.acceptable_resolution || "",
    linked_weight_ids: it.linked_weight_ids || [],
    linked_certificate_ids: it.linked_certificate_ids || [],
    linked_env_cert_id: it.linked_env_cert_id || null,
    payload: it.payload || {},
  }));
}

function buildRequestPayload(form, tenantId) {
  return {
    tenant_id: tenantId,
    request_number: Number(form.request_number),
    request_year: Number(form.request_year),
    request_date: form.request_date || null,
    document_code: form.document_code || "RE-6.6C",
    document_reference: form.document_reference || "PR-6.6",
    document_revision: form.document_revision || "00",
    document_model_issue_date: form.document_model_issue_date || DOCUMENT_MODEL_ISSUE_DATE,
    client_environment_id: form.client_environment_id || tenantId,
    client_environment_data_snapshot: form.client_environment_data_snapshot || {},
    supplier_id: form.supplier_id || null,
    supplier_data_snapshot: form.supplier_data_snapshot || {},
    sent_by_id: form.sent_by_id || null,
    sent_by_data_snapshot: form.sent_by_data_snapshot || {},
    status: form.status || "rascunho",
    notes: form.notes || "",
    converted_purchase_order_id: form.converted_purchase_order_id || null,
  };
}

async function enrichForm(form, tenantId) {
  const tenant = await loadTenant(tenantId);
  const supplier = await loadSupplier(form.supplier_id);
  const sentBy = await loadEmployee(form.sent_by_id);
  const clientSnap = buildClientEnvironmentSnapshot(tenant);
  const sentSnap = buildSentBySnapshot(sentBy);
  return {
    ...form,
    client_environment_id: tenantId,
    client_environment_data_snapshot: mergeSentByIntoClientSnapshot(clientSnap, sentSnap),
    supplier_data_snapshot: supplier ? buildSupplierSnapshot(supplier) : (form.supplier_data_snapshot || {}),
    sent_by_data_snapshot: sentSnap,
  };
}

export async function createQuotationRequest(tenantId, form, sections = [], items = []) {
  assertSupabaseQuotationRequests();
  const enriched = await enrichForm(form, tenantId);
  const payload = buildRequestPayload(enriched, tenantId);
  const { data: request, error } = await supabase.from("quotation_requests").insert(payload).select().single();
  if (error) throw error;

  const dbSections = mapSectionsForDb(sections.length ? sections : buildInitialSections());
  const { error: secErr } = await supabase.from("quotation_request_type_sections").insert(
    dbSections.map((s) => ({ ...s, quotation_request_id: request.id })),
  );
  if (secErr) throw secErr;

  const dbItems = mapItemsForDb(items);
  if (dbItems.length) {
    const { error: itemsErr } = await supabase.from("quotation_request_items").insert(
      dbItems.map((it) => ({ ...it, quotation_request_id: request.id })),
    );
    if (itemsErr) throw itemsErr;
  }

  await recordStatusHistory(request.id, "", request.status, null, "Criação");
  return getQuotationRequest(request.id);
}

export async function updateQuotationRequest(id, form, sections = [], items = []) {
  assertSupabaseQuotationRequests();
  const payload = buildRequestPayload(form, form.tenant_id);
  delete payload.tenant_id;

  const { error } = await supabase.from("quotation_requests").update(payload).eq("id", id);
  if (error) throw error;

  await supabase.from("quotation_request_type_sections").delete().eq("quotation_request_id", id);
  const dbSections = mapSectionsForDb(sections);
  if (dbSections.length) {
    const { error: secErr } = await supabase.from("quotation_request_type_sections").insert(
      dbSections.map((s) => ({ ...s, quotation_request_id: id })),
    );
    if (secErr) throw secErr;
  }

  await supabase.from("quotation_request_items").delete().eq("quotation_request_id", id);
  const dbItems = mapItemsForDb(items);
  if (dbItems.length) {
    const { error: itemsErr } = await supabase.from("quotation_request_items").insert(
      dbItems.map((it) => ({ ...it, quotation_request_id: id })),
    );
    if (itemsErr) throw itemsErr;
  }

  return getQuotationRequest(id);
}

export async function refreshSnapshotsFromCadastro(requestId, { supplierId, tenantId, sentById } = {}) {
  const request = await getQuotationRequest(requestId);
  const tid = tenantId || request.tenant_id;
  const patch = {};
  if (supplierId !== undefined) {
    const supplier = await loadSupplier(supplierId);
    patch.supplier_id = supplierId;
    patch.supplier_data_snapshot = supplier ? buildSupplierSnapshot(supplier) : {};
  }
  if (sentById !== undefined) {
    const emp = await loadEmployee(sentById);
    patch.sent_by_id = sentById;
    patch.sent_by_data_snapshot = buildSentBySnapshot(emp);
  }
  if (tid) {
    const tenant = await loadTenant(tid);
    const sentSnap = sentById !== undefined
      ? buildSentBySnapshot(await loadEmployee(sentById))
      : request.sent_by_data_snapshot;
    patch.client_environment_id = tid;
    patch.client_environment_data_snapshot = mergeSentByIntoClientSnapshot(
      buildClientEnvironmentSnapshot(tenant),
      sentSnap,
    );
  }
  const { error } = await supabase.from("quotation_requests").update(patch).eq("id", requestId);
  if (error) throw error;
  return getQuotationRequest(requestId);
}

async function recordStatusHistory(requestId, oldStatus, newStatus, changedById, notes = "") {
  await supabase.from("quotation_request_status_history").insert({
    quotation_request_id: requestId,
    old_status: oldStatus || "",
    new_status: newStatus,
    changed_by_id: changedById || null,
    notes: notes || "",
  });
}

export async function transitionQuotationStatus(id, newStatus, { userId, notes, allowConversion = false } = {}) {
  const { data: current, error: fetchErr } = await supabase
    .from("quotation_requests")
    .select("status")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;
  const allowed = allowConversion && newStatus === "convertida_pedido_compra"
    ? canTransitionToConvertedPurchaseOrder(current.status)
    : canTransitionStatus(current.status, newStatus);
  if (!allowed) {
    throw new Error("Transição de status não permitida");
  }
  const { error } = await supabase.from("quotation_requests").update({ status: newStatus }).eq("id", id);
  if (error) throw error;
  await recordStatusHistory(id, current.status, newStatus, userId, notes);
  return getQuotationRequest(id);
}

export async function listQuotationConversions(quotationRequestId) {
  assertSupabaseQuotationRequests();
  const { data, error } = await supabase
    .from("quotation_request_conversions")
    .select("*, purchase_order:purchase_order_id(id, order_number, order_year, type, status)")
    .eq("quotation_request_id", quotationRequestId)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

export async function convertQuotationToPurchaseOrders(quotationId, { userId } = {}) {
  assertSupabaseQuotationRequests();
  const quotation = await getQuotationRequest(quotationId);
  const conversionState = getQuotationConversionState(quotation, quotation.conversions);

  if (quotation.status !== "aprovada") {
    throw new Error("A conversão só é permitida para solicitações com status Aprovada.");
  }
  if (!quotation.supplier_id) {
    throw new Error("Informe o provedor na solicitação antes de converter.");
  }
  if (!conversionState.pending.length) {
    throw new Error("Não há tipos pendentes de conversão nesta solicitação.");
  }

  const year = new Date().getFullYear();
  const createdOrders = [];
  let firstPoId = quotation.converted_purchase_order_id || null;

  for (const sectionType of conversionState.pending) {
    const poType = mapQuotationSectionToPoType(sectionType);
    if (!poType) continue;

    const section = (quotation.sections || []).find((s) => s.type === sectionType);
    const poItems = mapQuotationItemsToPoItems(sectionType, section, quotation.items);
    if (!poItems.length) {
      throw new Error(`Tipo ${sectionType}: não há conteúdo para converter em pedido de compra.`);
    }

    const orderNumber = await suggestNextOrderNumber(quotation.tenant_id, year);
    const poForm = mapQuotationHeaderToPoForm(quotation, poType, { orderNumber, orderYear: year });
    const order = await createPurchaseOrder(quotation.tenant_id, poForm, poItems);

    const { error: convErr } = await supabase.from("quotation_request_conversions").insert({
      quotation_request_id: quotationId,
      purchase_order_id: order.id,
      section_type: sectionType,
    });
    if (convErr) throw convErr;

    if (!firstPoId) firstPoId = order.id;
    createdOrders.push({ sectionType, order });
  }

  if (firstPoId && !quotation.converted_purchase_order_id) {
    await supabase.from("quotation_requests").update({ converted_purchase_order_id: firstPoId }).eq("id", quotationId);
  }

  const updated = await getQuotationRequest(quotationId);
  const finalState = getQuotationConversionState(updated, updated.conversions);
  if (finalState.fullyConverted) {
    await transitionQuotationStatus(quotationId, "convertida_pedido_compra", {
      userId,
      notes: "Conversão em pedido(s) de compra",
      allowConversion: true,
    });
    return {
      purchaseOrders: createdOrders,
      quotation: await getQuotationRequest(quotationId),
    };
  }

  return { purchaseOrders: createdOrders, quotation: updated };
}

export async function duplicateQuotationRequest(id) {
  const src = await getQuotationRequest(id);
  const year = new Date().getFullYear();
  const num = await suggestNextRequestNumber(src.tenant_id, year);
  const form = {
    ...src,
    request_number: num,
    request_year: year,
    request_date: new Date().toISOString().slice(0, 10),
    status: "rascunho",
    converted_purchase_order_id: null,
  };
  delete form.id;
  return createQuotationRequest(src.tenant_id, form, src.sections, src.items);
}

export async function deleteQuotationRequest(id) {
  assertSupabaseQuotationRequests();
  const { error } = await supabase.from("quotation_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function addQuotationAttachment(requestId, { storagePath, fileName, fileType, description }) {
  const { data, error } = await supabase.from("quotation_request_attachments").insert({
    quotation_request_id: requestId,
    storage_path: storagePath,
    file_name: fileName || "",
    file_type: fileType || "",
    description: description || "",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuotationAttachment(attachmentId) {
  const { error } = await supabase.from("quotation_request_attachments").delete().eq("id", attachmentId);
  if (error) throw error;
}
