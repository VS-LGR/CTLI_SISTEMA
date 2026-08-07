import { supabase } from "@/lib/supabaseClient";
import {
  emptyWeightColetaPayload,
  emptyWeightItem,
} from "@/lib/weightCalibration/weightColetaSchema";
import { extractDisplayFieldsFromWeightPayload } from "@/lib/weightCalibration/weightColetaApi";
import { formatProposalRef } from "./commercialProposalSchema";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";

/**
 * Pré-preenche coleta RE-5.4.2A a partir de um item de peso da proposta comercial.
 * Leituras ABA e ambiente/TBH ficam vazios para o técnico.
 */
export function buildWeightColetaPayloadFromProposalItem(proposal, item) {
  const snap = proposal.client_snapshot || {};
  const payload = emptyWeightColetaPayload();
  const proposalRef = formatProposalRef(proposal.proposal_number, proposal.proposal_year);

  payload.cliente = {
    ...payload.cliente,
    end_customer_id: proposal.end_customer_id || "",
    solicitante: snap.company || "",
    contratante: "O mesmo",
    responsavel: snap.attention_to || "",
    endereco: snap.address || "",
    unidade: snap.department || "",
    cnpj: snap.cnpj || "",
  };

  payload.geral = {
    ...payload.geral,
    processo_numero: proposalRef,
    fabricante: item.manufacturer || "",
    identificacao: item.identification || "",
    serie: item.serial_number || "",
    classe: item.uut_class || "",
    qtde_linhas: 1,
  };

  payload.itens = [
    emptyWeightItem({
      identification: item.identification || "",
      nominal_value: sanitizeMassNumericInput(item.nominal_value || ""),
      nominal_unit: item.nominal_unit || "g",
      uut_class: item.uut_class || "",
      uut_material: item.uut_material || "",
      reference_standard_id: item.standard_weight_item_id || null,
    }),
  ];

  return payload;
}

export async function createWeightColetaFromProposalItem(proposal, item, { userId } = {}) {
  let enriched = { ...item };
  if (item.standard_weight_item_id) {
    const { data: sw } = await supabase
      .from("standard_weight_items")
      .select("*")
      .eq("id", item.standard_weight_item_id)
      .maybeSingle();
    if (sw) {
      enriched = {
        ...enriched,
        identification: enriched.identification || sw.identification || "",
        nominal_value: enriched.nominal_value || sw.nominal_value || "",
        nominal_unit: enriched.nominal_unit || sw.unit || "g",
      };
    }
  }

  const payload = buildWeightColetaPayloadFromProposalItem(proposal, enriched);
  const denorm = extractDisplayFieldsFromWeightPayload(payload);
  const commercialProposalRef = formatProposalRef(proposal.proposal_number, proposal.proposal_year);

  const insertRow = {
    tenant_id: proposal.tenant_id,
    commercial_proposal_ref: commercialProposalRef,
    commercial_proposal_id: proposal.id,
    commercial_proposal_weight_item_id: item.id,
    payload,
    client_name: denorm.client_name,
    responsible_name: denorm.responsible_name,
    weight_tag: denorm.weight_tag,
    calibration_date: denorm.calibration_date,
    workflow_status: "rascunho",
    created_by: userId || null,
    updated_by: userId || null,
  };

  const { data: collection, error } = await supabase
    .from("weight_calibration_collections")
    .insert(insertRow)
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("commercial_proposal_weight_items")
    .update({ collection_id: collection.id })
    .eq("id", item.id);

  return collection;
}

export async function generateWeightColetasFromProposal(proposalId, { userId } = {}) {
  const { getCommercialProposal } = await import("./commercialProposalApi");
  const proposal = await getCommercialProposal(proposalId);
  const items = proposal.weightItems || [];
  const pending = items.filter((w) => w.id && !w.collection_id && String(w.identification || "").trim());
  if (!pending.length) {
    return { created: [], skipped: items.filter((w) => w.collection_id) };
  }

  const created = [];
  for (const item of pending) {
    const collection = await createWeightColetaFromProposalItem(proposal, item, { userId });
    created.push({ item, collection });
  }
  return { created, skipped: items.filter((w) => w.collection_id) };
}

export async function generateWeightColetaFromProposalItem(proposalId, itemId, { userId } = {}) {
  const { getCommercialProposal } = await import("./commercialProposalApi");
  const proposal = await getCommercialProposal(proposalId);
  const item = (proposal.weightItems || []).find((w) => w.id === itemId);
  if (!item) throw new Error("Peso não encontrado nesta proposta");
  if (item.collection_id) {
    const { data: existing } = await supabase
      .from("weight_calibration_collections")
      .select("id")
      .eq("id", item.collection_id)
      .maybeSingle();
    if (existing) throw new Error("Este peso já possui coleta de dados vinculada");
  }
  const collection = await createWeightColetaFromProposalItem(proposal, item, { userId });
  return { proposal, item, collection };
}
