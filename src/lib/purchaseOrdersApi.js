import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  buildClientEnvironmentSnapshot,
  buildEmployeeSnapshot,
  buildSupplierSnapshot,
} from "@/lib/purchaseOrderSnapshots";
import { orderFinal, recalcItem } from "@/lib/purchaseOrderCalculations";
import {
  DEFAULT_OBSERVATIONS,
  getTitleForType,
} from "@/lib/purchaseOrderTypes";

export function assertSupabasePurchaseOrders() {
  if (!isSupabaseAuthMode) {
    throw new Error("Pedidos de compra requerem ligação Supabase.");
  }
}

export async function suggestNextOrderNumber(tenantId, year = new Date().getFullYear()) {
  assertSupabasePurchaseOrders();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("order_number")
    .eq("tenant_id", tenantId)
    .eq("order_year", year)
    .order("order_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.order_number || 0) + 1;
}

export async function listPurchaseOrders(tenantId, filters = {}) {
  assertSupabasePurchaseOrders();
  let q = supabase
    .from("purchase_orders")
    .select("*, supplier:supplier_id(name)")
    .eq("tenant_id", tenantId)
    .order("order_year", { ascending: false })
    .order("order_number", { ascending: false });
  if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.year) q = q.eq("order_year", Number(filters.year));
  if (filters.supplierId) q = q.eq("supplier_id", filters.supplierId);
  if (filters.dateFrom) q = q.gte("order_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("order_date", filters.dateTo);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getPurchaseOrder(id) {
  assertSupabasePurchaseOrders();
  const { data: order, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  const [itemsRes, inspRes, sigsRes] = await Promise.all([
    supabase.from("purchase_order_items").select("*").eq("purchase_order_id", id).order("item_number"),
    supabase.from("purchase_order_inspections").select("*").eq("purchase_order_id", id).maybeSingle(),
    supabase.from("purchase_order_signatures").select("*").eq("purchase_order_id", id),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (inspRes.error) throw inspRes.error;
  if (sigsRes.error) throw sigsRes.error;

  return {
    ...order,
    items: itemsRes.data || [],
    inspection: inspRes.data || null,
    signatures: sigsRes.data || [],
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

function mapItemsForDb(items) {
  return (items || []).map((it, idx) => {
    const row = recalcItem({ ...it, item_number: idx + 1 });
    return {
      item_number: row.item_number,
      equipment: row.equipment || "",
      material: row.material || "",
      identification_codes: row.identification_codes || "",
      nominal_values: row.nominal_values || "",
      range_text: row.range_text || "",
      class_text: row.class_text || "",
      magnitude: row.magnitude || "",
      minimum_reading_range: row.minimum_reading_range || "",
      acceptable_resolution: row.acceptable_resolution || "",
      max_error_uncertainty: row.max_error_uncertainty || "",
      hiring_criteria: row.hiring_criteria || "",
      program_name: row.program_name || "",
      artifacts_description: row.artifacts_description || "",
      audit_scope: row.audit_scope || "",
      quantity: row.quantity ?? 1,
      unit_value: row.unit_value ?? 0,
      taxes_percent: row.taxes_percent ?? 0,
      taxes_included: row.taxes_included !== false,
      total_value: row.total_value ?? 0,
      linked_weight_ids: row.linked_weight_ids || [],
      linked_certificate_ids: row.linked_certificate_ids || [],
      linked_env_cert_id: row.linked_env_cert_id || null,
      payload: row.payload || {},
    };
  });
}

function buildOrderPayload(form, tenantId, items) {
  const subtotal = items.reduce((s, it) => s + Number(it.total_value || 0), 0);
  const final_value = orderFinal(form, items);
  return {
    tenant_id: tenantId,
    order_number: Number(form.order_number),
    order_year: Number(form.order_year),
    type: form.type,
    title: form.title || getTitleForType(form.type),
    supplier_id: form.supplier_id || null,
    supplier_data_snapshot: form.supplier_data_snapshot || {},
    client_environment_id: form.client_environment_id || tenantId,
    client_environment_data_snapshot: form.client_environment_data_snapshot || {},
    requested_by_id: form.requested_by_id || null,
    technical_manager_id: form.technical_manager_id || null,
    purchase_responsible_id: form.purchase_responsible_id || null,
    status: form.status || "rascunho",
    order_date: form.order_date || null,
    issue_date: form.issue_date || null,
    payment_terms: form.payment_terms || "",
    freight_responsibility: form.freight_responsibility || "",
    carrier_info: form.carrier_info || "",
    quotation_number: form.quotation_number || "",
    execution_period: form.execution_period || "",
    observations: form.observations || DEFAULT_OBSERVATIONS,
    discount: Number(form.discount || 0),
    taxes_mode: form.taxes_mode || "incluso",
    subtotal,
    final_value,
    document_code: form.document_code || "RE-6.6E",
    document_revision: form.document_revision || "00",
    document_reference: form.document_reference || "PR-6.6",
    signature_slot_1_label: form.signature_slot_1_label || "Gerente Técnico",
    signature_slot_2_label: form.signature_slot_2_label || "Compras",
  };
}

export async function createPurchaseOrder(tenantId, form, items = []) {
  assertSupabasePurchaseOrders();
  const tenant = await loadTenant(tenantId);
  const supplier = await loadSupplier(form.supplier_id);

  const enrichedForm = {
    ...form,
    client_environment_id: tenantId,
    client_environment_data_snapshot: buildClientEnvironmentSnapshot(tenant),
    supplier_data_snapshot: supplier ? buildSupplierSnapshot(supplier) : (form.supplier_data_snapshot || {}),
    title: form.title || getTitleForType(form.type),
  };

  const dbItems = mapItemsForDb(items);
  const payload = buildOrderPayload(enrichedForm, tenantId, dbItems);

  const { data: order, error } = await supabase.from("purchase_orders").insert(payload).select().single();
  if (error) throw error;

  if (dbItems.length) {
    const { error: itemsErr } = await supabase.from("purchase_order_items").insert(
      dbItems.map((it) => ({ ...it, purchase_order_id: order.id })),
    );
    if (itemsErr) throw itemsErr;
  }

  return getPurchaseOrder(order.id);
}

export async function updatePurchaseOrder(id, form, items = []) {
  assertSupabasePurchaseOrders();
  const dbItems = mapItemsForDb(items);
  const payload = buildOrderPayload(
    { ...form, tenant_id: form.tenant_id },
    form.tenant_id,
    dbItems,
  );
  delete payload.tenant_id;

  const { error } = await supabase.from("purchase_orders").update(payload).eq("id", id);
  if (error) throw error;

  await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);
  if (dbItems.length) {
    const { error: itemsErr } = await supabase.from("purchase_order_items").insert(
      dbItems.map((it) => ({ ...it, purchase_order_id: id })),
    );
    if (itemsErr) throw itemsErr;
  }

  return getPurchaseOrder(id);
}

export async function refreshSnapshotsFromCadastro(orderId, { supplierId, tenantId } = {}) {
  const order = await getPurchaseOrder(orderId);
  const tid = tenantId || order.tenant_id;
  const patch = {};
  if (supplierId !== undefined) {
    const supplier = await loadSupplier(supplierId);
    patch.supplier_id = supplierId;
    patch.supplier_data_snapshot = supplier ? buildSupplierSnapshot(supplier) : {};
  }
  if (tid) {
    const tenant = await loadTenant(tid);
    patch.client_environment_id = tid;
    patch.client_environment_data_snapshot = buildClientEnvironmentSnapshot(tenant);
  }
  const { error } = await supabase.from("purchase_orders").update(patch).eq("id", orderId);
  if (error) throw error;
  return getPurchaseOrder(orderId);
}

export async function transitionStatus(id, newStatus) {
  const { error } = await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", id);
  if (error) throw error;
  return getPurchaseOrder(id);
}

export async function saveInspection(purchaseOrderId, inspection) {
  const row = {
    purchase_order_id: purchaseOrderId,
    received_matches_order: inspection.received_matches_order,
    certificate_matches_order: inspection.certificate_matches_order,
    certificate_numbers: inspection.certificate_numbers || "",
    supplier_sent_report: inspection.supplier_sent_report,
    report_matches_order: inspection.report_matches_order,
    reason: inspection.reason || "",
    result: inspection.result || null,
    inspection_responsible_id: inspection.inspection_responsible_id || null,
    inspection_date: inspection.inspection_date || null,
    notes: inspection.notes || "",
    type_specific: inspection.type_specific || {},
  };

  const { data: existing } = await supabase
    .from("purchase_order_inspections")
    .select("id")
    .eq("purchase_order_id", purchaseOrderId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("purchase_order_inspections").update(row).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("purchase_order_inspections").insert(row);
    if (error) throw error;
  }
  return getPurchaseOrder(purchaseOrderId);
}

export async function syncSignatures(purchaseOrderId, {
  technicalManagerId,
  purchaseResponsibleId,
  slot1Label = "Gerente Técnico",
  slot2Label = "Compras",
}) {
  const employees = [];
  if (technicalManagerId) {
    const { data } = await supabase.from("employee_registrations").select("*").eq("id", technicalManagerId).single();
    if (data) employees.push({ role: "technical_manager", employee: data, customLabel: slot1Label });
  }
  if (purchaseResponsibleId) {
    const { data } = await supabase.from("employee_registrations").select("*").eq("id", purchaseResponsibleId).single();
    if (data) employees.push({ role: "purchase", employee: data, customLabel: slot2Label });
  }

  for (const { role, employee, customLabel } of employees) {
    const snap = buildEmployeeSnapshot(employee, { customLabel });
    await supabase.from("purchase_order_signatures").upsert(
      {
        purchase_order_id: purchaseOrderId,
        role,
        employee_id: employee.id,
        snapshot: snap,
      },
      { onConflict: "purchase_order_id,role" },
    );
  }
}

export async function duplicatePurchaseOrder(id) {
  const src = await getPurchaseOrder(id);
  const year = new Date().getFullYear();
  const nextNum = await suggestNextOrderNumber(src.tenant_id, year);
  const copy = await createPurchaseOrder(
    src.tenant_id,
    {
      ...src,
      order_number: nextNum,
      order_year: year,
      status: "rascunho",
      supplier_data_snapshot: src.supplier_data_snapshot,
      client_environment_data_snapshot: src.client_environment_data_snapshot,
      signature_slot_1_label: src.signature_slot_1_label || "Gerente Técnico",
      signature_slot_2_label: src.signature_slot_2_label || "Compras",
    },
    src.items,
  );
  await syncSignatures(copy.id, {
    technicalManagerId: src.technical_manager_id,
    purchaseResponsibleId: src.purchase_responsible_id,
    slot1Label: src.signature_slot_1_label || "Gerente Técnico",
    slot2Label: src.signature_slot_2_label || "Compras",
  });
  return getPurchaseOrder(copy.id);
}

export async function deletePurchaseOrder(id) {
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) throw error;
}
