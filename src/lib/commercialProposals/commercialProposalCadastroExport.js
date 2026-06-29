import { supabase } from "@/lib/supabaseClient";
import { buildScaleRegistrationFromBalance } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { createScaleRegistrationFromBalance } from "@/lib/scaleRegistrations/scaleRegistrationApi";

function normalizeCnpj(cnpj) {
  return String(cnpj || "").replace(/\D/g, "");
}

export async function findExistingCustomer(tenantId, snapshot, endCustomerId) {
  if (endCustomerId) {
    const { data } = await supabase
      .from("end_customer_registrations")
      .select("*")
      .eq("id", endCustomerId)
      .maybeSingle();
    if (data) return { row: data, match: "id" };
  }
  const cnpj = normalizeCnpj(snapshot?.cnpj);
  if (cnpj) {
    const { data: rows } = await supabase
      .from("end_customer_registrations")
      .select("*")
      .eq("tenant_id", tenantId);
    const match = (rows || []).find((r) => normalizeCnpj(r.cnpj) === cnpj);
    if (match) return { row: match, match: "cnpj" };
  }
  const name = String(snapshot?.company || "").trim();
  if (name) {
    const { data: rows } = await supabase
      .from("end_customer_registrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .ilike("name", name);
    if (rows?.[0]) return { row: rows[0], match: "name" };
  }
  return { row: null, match: null };
}

export async function findExistingScale(tenantId, endCustomerId, serialNumber) {
  const serial = String(serialNumber || "").trim();
  if (!serial) return null;
  let q = supabase
    .from("scale_registrations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("serial_number", serial)
    .eq("active", true);
  if (endCustomerId) q = q.eq("end_customer_id", endCustomerId);
  const { data } = await q;
  return data?.[0] || null;
}

export function scaleToBalanca(scale) {
  return {
    fabricante: scale.manufacturer || "",
    modelo: scale.model || "",
    serie: scale.serial_number || "",
    tag: scale.tag || "",
    capacidade: scale.capacity || "",
    resolucao: scale.resolution || "",
  };
}

export async function previewCadastroExport(proposal) {
  const tenantId = proposal.tenant_id;
  const snapshot = proposal.client_snapshot || {};
  const customerPreview = await findExistingCustomer(tenantId, snapshot, proposal.end_customer_id);
  const scalePreviews = [];
  for (const scale of proposal.scales || []) {
    const endId = customerPreview.row?.id || proposal.end_customer_id;
    const existing = await findExistingScale(tenantId, endId, scale.serial_number);
    scalePreviews.push({
      scale,
      action: existing ? (scale.scale_registration_id === existing.id ? "linked" : "conflict") : "create",
      existing,
    });
  }
  return {
    customer: {
      action: customerPreview.row
        ? (proposal.end_customer_id === customerPreview.row.id ? "update" : "link")
        : "create",
      existing: customerPreview.row,
      snapshot,
    },
    scales: scalePreviews,
  };
}

export async function exportProposalToCadastro(proposal, { linkExistingScales = true } = {}) {
  const tenantId = proposal.tenant_id;
  const snapshot = proposal.client_snapshot || {};
  let endCustomerId = proposal.end_customer_id || null;
  const customerFound = await findExistingCustomer(tenantId, snapshot, endCustomerId);

  const customerPayload = {
    tenant_id: tenantId,
    name: snapshot.company || "",
    full_address: snapshot.address || "",
    representative_name: snapshot.attention_to || "",
    phone: snapshot.phone || "",
    email: snapshot.email || "",
    cnpj: snapshot.cnpj || "",
  };

  if (customerFound.row) {
    endCustomerId = customerFound.row.id;
    const { error } = await supabase
      .from("end_customer_registrations")
      .update(customerPayload)
      .eq("id", endCustomerId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("end_customer_registrations")
      .insert(customerPayload)
      .select()
      .single();
    if (error) throw error;
    endCustomerId = data.id;
  }

  const scaleUpdates = [];
  for (const scale of proposal.scales || []) {
    if (scale.scale_registration_id) {
      scaleUpdates.push({ scaleId: scale.id, registrationId: scale.scale_registration_id });
      continue;
    }
    const existing = await findExistingScale(tenantId, endCustomerId, scale.serial_number);
    if (existing) {
      if (linkExistingScales) {
        scaleUpdates.push({ scaleId: scale.id, registrationId: existing.id });
      } else {
        throw new Error(
          `Balança série ${scale.serial_number} já cadastrada para este cliente. Vincule ou altere a série.`,
        );
      }
      continue;
    }
    const saved = await createScaleRegistrationFromBalance({
      tenantId,
      endCustomerId,
      balanca: scaleToBalanca(scale),
    });
    scaleUpdates.push({ scaleId: scale.id, registrationId: saved.id });
  }

  for (const u of scaleUpdates) {
    await supabase
      .from("commercial_proposal_scales")
      .update({ scale_registration_id: u.registrationId })
      .eq("id", u.scaleId);
  }

  const now = new Date().toISOString();
  await supabase
    .from("commercial_proposals")
    .update({
      end_customer_id: endCustomerId,
      exported_customer_at: now,
      exported_scales_at: now,
    })
    .eq("id", proposal.id);

  return getCommercialProposalAfterExport(proposal.id);
}

async function getCommercialProposalAfterExport(id) {
  const { getCommercialProposal } = await import("./commercialProposalApi");
  return getCommercialProposal(id);
}
