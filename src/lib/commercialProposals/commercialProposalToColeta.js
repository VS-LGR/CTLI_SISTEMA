import { supabase } from "@/lib/supabaseClient";
import { emptyColetaPayload, denormalizeFromPayload, syncCalPointNominal } from "@/lib/coletaSchema";
import { formatProposalRef } from "./commercialProposalSchema";
import { scaleToBalanca } from "./commercialProposalCadastroExport";
import { balanceSnapshotFromScaleRegistration } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { assignNextCollectionNumber } from "@/lib/coletaOsMeta";

function emptyColetaCalPoint(defaultUnit = "g") {
  return {
    peso_nominal: "",
    peso_nominal_valor: "",
    peso_nominal_unidade: defaultUnit,
    leitura_antes: "",
    rep1: "",
    rep2: "",
    rep3: "",
    pesos_padrao_ids: [],
  };
}

export function buildColetaPayloadFromProposalScale(proposal, scale) {
  const snap = proposal.client_snapshot || {};
  const payload = emptyColetaPayload();
  const scaleUnit = scale.unit || "g";

  payload.cliente = {
    end_customer_id: proposal.end_customer_id || "",
    cliente: snap.company || "",
    responsavel: snap.attention_to || "",
  };

  payload.balanca = {
    ...payload.balanca,
    ...scaleToBalanca(scale),
    unidade: scaleUnit,
    capacidade: sanitizeMassNumericInput(scale.capacity || ""),
    resolucao: sanitizeMassNumericInput(scale.resolution || ""),
  };

  const points = (scale.calibration_points || [])
    .sort((a, b) => a.point_number - b.point_number)
    .slice(0, 10);

  payload.calibracao.pontos = Array.from({ length: 10 }, (_, i) => {
    const src = points.find((p) => p.point_number === i + 1);
    if (!src?.nominal_value) return emptyColetaCalPoint(scaleUnit);
    return syncCalPointNominal({
      ...emptyColetaCalPoint(scaleUnit),
      peso_nominal_valor: sanitizeMassNumericInput(src.nominal_value),
      peso_nominal_unidade: src.nominal_unit || scaleUnit,
    }, scaleUnit);
  });

  if (scale.client_requested_points === "sim" || scale.client_requested_points === "nao") {
    payload.controle.pontos_solicitados = scale.client_requested_points;
  }

  return payload;
}

export async function createColetaFromProposalScale(proposal, scale, { userId } = {}) {
  let enrichedScale = { ...scale, calibration_points: scale.calibration_points || [] };
  if (scale.scale_registration_id) {
    const { data: reg } = await supabase
      .from("scale_registrations")
      .select("*")
      .eq("id", scale.scale_registration_id)
      .maybeSingle();
    if (reg) {
      enrichedScale = {
        ...enrichedScale,
        manufacturer: enrichedScale.manufacturer || reg.manufacturer || "",
        model: enrichedScale.model || reg.model || "",
        tag: enrichedScale.tag || reg.tag || "",
        serial_number: enrichedScale.serial_number || reg.serial_number || "",
        capacity: enrichedScale.capacity || reg.capacity_1 || "",
        resolution: enrichedScale.resolution || reg.resolution_1 || "",
        unit: enrichedScale.unit || reg.unit || "g",
        _balanceFromCadastro: balanceSnapshotFromScaleRegistration(reg),
      };
    }
  }

  const payload = buildColetaPayloadFromProposalScale(proposal, enrichedScale);
  if (enrichedScale._balanceFromCadastro) {
    payload.balanca = { ...payload.balanca, ...enrichedScale._balanceFromCadastro };
  }
  const denorm = denormalizeFromPayload(payload);
  const commercialProposalRef = formatProposalRef(proposal.proposal_number, proposal.proposal_year);

  const insertRow = {
    tenant_id: proposal.tenant_id,
    commercial_proposal_ref: commercialProposalRef,
    commercial_proposal_id: proposal.id,
    commercial_proposal_scale_id: scale.id,
    payload,
    client_name: denorm.client_name,
    responsible_name: denorm.responsible_name,
    scale_serial: denorm.scale_serial,
    calibration_date: denorm.calibration_date,
    workflow_status: "rascunho",
    created_by: userId || null,
    updated_by: userId || null,
  };
  if (scale.scale_registration_id) {
    insertRow.scale_registration_id = scale.scale_registration_id;
  }

  const os = await assignNextCollectionNumber(proposal.tenant_id);
  Object.assign(insertRow, os);

  const { data: collection, error } = await supabase
    .from("scale_calibration_collections")
    .insert(insertRow)
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("commercial_proposal_scales")
    .update({ collection_id: collection.id })
    .eq("id", scale.id);

  return collection;
}

export async function generateColetasFromProposal(proposalId, { userId } = {}) {
  const { getCommercialProposal } = await import("./commercialProposalApi");
  const proposal = await getCommercialProposal(proposalId);
  const pending = (proposal.scales || []).filter((s) => !s.collection_id);
  if (!pending.length) {
    return { created: [], skipped: proposal.scales || [] };
  }

  const created = [];
  for (const scale of pending) {
    const collection = await createColetaFromProposalScale(
      proposal,
      { ...scale, calibration_points: scale.calibration_points || [] },
      { userId },
    );
    created.push({ scale, collection });
  }
  return { created, skipped: (proposal.scales || []).filter((s) => s.collection_id) };
}

/** Gera uma coleta para uma balança específica da proposta (com dados pré-preenchidos). */
export async function generateColetaFromProposalScale(proposalId, scaleId, { userId } = {}) {
  const { getCommercialProposal } = await import("./commercialProposalApi");
  const proposal = await getCommercialProposal(proposalId);
  const scale = (proposal.scales || []).find((s) => s.id === scaleId);
  if (!scale) throw new Error("Balança não encontrada nesta proposta");
  if (scale.collection_id) {
    const { data: existing } = await supabase
      .from("scale_calibration_collections")
      .select("id")
      .eq("id", scale.collection_id)
      .maybeSingle();
    if (existing) throw new Error("Esta balança já possui coleta de dados vinculada");
  }
  const collection = await createColetaFromProposalScale(proposal, scale, { userId });
  return { proposal, scale, collection };
}
