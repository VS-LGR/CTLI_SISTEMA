import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  computeTotalFromScales,
  normalizeScaleForSave,
  proposalRowToForm,
} from "./commercialProposalSchema";
import { buildClientSnapshot } from "./commercialProposalSnapshots";
import { DEFAULT_PROPOSAL_MODEL_ISSUE_DATE } from "./commercialProposalDocMeta";

export function assertSupabaseCommercialProposals() {
  if (!isSupabaseAuthMode) {
    throw new Error("Propostas comerciais requerem ligação Supabase.");
  }
}

export async function suggestNextProposalNumber(tenantId, year = new Date().getFullYear()) {
  assertSupabaseCommercialProposals();
  const { data, error } = await supabase
    .from("commercial_proposals")
    .select("proposal_number")
    .eq("tenant_id", tenantId)
    .eq("proposal_year", year)
    .order("proposal_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.proposal_number || 0) + 1;
}

export async function listCommercialProposals(tenantId, filters = {}) {
  assertSupabaseCommercialProposals();
  let q = supabase
    .from("commercial_proposals")
    .select("id, tenant_id, proposal_number, proposal_year, proposal_date, subject, client_snapshot, total_value, end_customer_id, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("proposal_year", { ascending: false })
    .order("proposal_number", { ascending: false });
  if (filters.year) q = q.eq("proposal_year", Number(filters.year));
  if (filters.dateFrom) q = q.gte("proposal_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("proposal_date", filters.dateTo);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function loadScalesWithPoints(proposalId) {
  const { data: scales, error: scalesErr } = await supabase
    .from("commercial_proposal_scales")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("item_number");
  if (scalesErr) throw scalesErr;
  if (!scales?.length) return [];

  const scaleIds = scales.map((s) => s.id);
  const { data: points, error: pointsErr } = await supabase
    .from("commercial_proposal_calibration_points")
    .select("*")
    .in("scale_id", scaleIds)
    .order("point_number");
  if (pointsErr) throw pointsErr;

  const byScale = {};
  (points || []).forEach((p) => {
    if (!byScale[p.scale_id]) byScale[p.scale_id] = [];
    byScale[p.scale_id].push(p);
  });

  return scales.map((s) => ({
    ...s,
    calibration_points: byScale[s.id] || [],
  }));
}

export async function getCommercialProposal(id) {
  assertSupabaseCommercialProposals();
  const { data: proposal, error } = await supabase
    .from("commercial_proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const scales = await loadScalesWithPoints(id);
  return { ...proposal, scales };
}

function buildProposalPayload(form, tenantId, userId, isUpdate = false) {
  const total = form.total_value !== "" && form.total_value != null
    ? parseFloat(String(form.total_value).replace(",", ".")) || 0
    : computeTotalFromScales(form.scales);

  const payload = {
    tenant_id: tenantId,
    proposal_number: Number(form.proposal_number),
    proposal_year: Number(form.proposal_year),
    proposal_date: form.proposal_date || null,
    document_code: form.document_code || "RE-7.1A",
    document_reference: form.document_reference || "PR-7.1",
    document_revision: form.document_revision || "00",
    document_model_issue_date: form.document_model_issue_date || DEFAULT_PROPOSAL_MODEL_ISSUE_DATE,
    subject: form.subject || "",
    end_customer_id: form.end_customer_id || null,
    client_snapshot: form.client_snapshot || {},
    adjust_before: form.adjust_before || "",
    adjust_after: form.adjust_after || "",
    notes: form.notes || "",
    total_value: total,
    updated_by: userId || null,
  };
  if (!isUpdate) payload.created_by = userId || null;
  return payload;
}

async function saveScales(proposalId, scales = []) {
  const existingRes = await supabase
    .from("commercial_proposal_scales")
    .select("id, collection_id")
    .eq("proposal_id", proposalId);
  if (existingRes.error) throw existingRes.error;

  const withCollection = new Set(
    (existingRes.data || []).filter((s) => s.collection_id).map((s) => s.id),
  );

  const existingIds = (existingRes.data || []).map((s) => s.id);
  if (existingIds.length) {
    await supabase.from("commercial_proposal_calibration_points").delete().in("scale_id", existingIds);
    await supabase.from("commercial_proposal_scales").delete().eq("proposal_id", proposalId);
  }

  const savedScales = [];
  for (let i = 0; i < scales.length; i++) {
    const norm = normalizeScaleForSave(scales[i], i + 1);
    const prev = (existingRes.data || []).find(
      (s) => s.id === scales[i].id && withCollection.has(s.id),
    );
    const { data: scaleRow, error: scaleErr } = await supabase
      .from("commercial_proposal_scales")
      .insert({
        proposal_id: proposalId,
        item_number: norm.item_number,
        manufacturer: norm.manufacturer,
        model: norm.model,
        tag: norm.tag,
        serial_number: norm.serial_number,
        capacity: norm.capacity,
        resolution: norm.resolution,
        unit_value: norm.unit_value,
        scale_registration_id: scales[i].scale_registration_id || null,
        collection_id: prev?.collection_id || scales[i].collection_id || null,
      })
      .select()
      .single();
    if (scaleErr) throw scaleErr;

    if (norm.calibration_points.length) {
      const { error: ptsErr } = await supabase.from("commercial_proposal_calibration_points").insert(
        norm.calibration_points.map((p) => ({
          scale_id: scaleRow.id,
          point_number: p.point_number,
          nominal_value: p.nominal_value,
        })),
      );
      if (ptsErr) throw ptsErr;
    }
    savedScales.push(scaleRow);
  }
  return savedScales;
}

export async function createCommercialProposal(tenantId, form, { userId } = {}) {
  assertSupabaseCommercialProposals();
  const payload = buildProposalPayload(form, tenantId, userId, false);
  const { data: proposal, error } = await supabase
    .from("commercial_proposals")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  await saveScales(proposal.id, form.scales || []);
  return getCommercialProposal(proposal.id);
}

export async function updateCommercialProposal(id, form, { userId } = {}) {
  assertSupabaseCommercialProposals();
  const payload = buildProposalPayload(form, form.tenant_id, userId, true);
  delete payload.tenant_id;
  const { error } = await supabase.from("commercial_proposals").update(payload).eq("id", id);
  if (error) throw error;
  await saveScales(id, form.scales || []);
  return getCommercialProposal(id);
}

export async function deleteCommercialProposal(id) {
  assertSupabaseCommercialProposals();
  const proposal = await getCommercialProposal(id);
  const linked = (proposal.scales || []).some((s) => s.collection_id);
  if (linked) {
    throw new Error("Não é possível excluir: existem coletas vinculadas a balanças desta proposta.");
  }
  const { error } = await supabase.from("commercial_proposals").delete().eq("id", id);
  if (error) throw error;
}

export async function loadEndCustomerForProposal(endCustomerId) {
  if (!endCustomerId) return null;
  const { data, error } = await supabase
    .from("end_customer_registrations")
    .select("*")
    .eq("id", endCustomerId)
    .single();
  if (error) throw error;
  return data;
}

export async function enrichProposalFormFromCustomer(form, endCustomerId) {
  const customer = await loadEndCustomerForProposal(endCustomerId);
  if (!customer) return form;
  return {
    ...form,
    end_customer_id: customer.id,
    client_snapshot: buildClientSnapshot(customer, form.client_snapshot || {}),
  };
}

export function proposalToEditorForm(proposal) {
  return proposalRowToForm(proposal, proposal.scales || []);
}
