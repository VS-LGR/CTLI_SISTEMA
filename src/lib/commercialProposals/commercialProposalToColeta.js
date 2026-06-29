import { supabase } from "@/lib/supabaseClient";
import { emptyColetaPayload, denormalizeFromPayload } from "@/lib/coletaSchema";
import { formatProposalRef } from "./commercialProposalSchema";
import { scaleToBalanca } from "./commercialProposalCadastroExport";

function emptyColetaCalPoint() {
  return {
    peso_nominal: "",
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

  payload.cliente = {
    end_customer_id: proposal.end_customer_id || "",
    cliente: snap.company || "",
    responsavel: snap.attention_to || "",
  };

  payload.balanca = {
    ...payload.balanca,
    ...scaleToBalanca(scale),
  };

  const points = (scale.calibration_points || [])
    .sort((a, b) => a.point_number - b.point_number)
    .slice(0, 10);

  payload.calibracao.pontos = Array.from({ length: 10 }, (_, i) => {
    const src = points.find((p) => p.point_number === i + 1);
    if (!src?.nominal_value) return emptyColetaCalPoint();
    return { ...emptyColetaCalPoint(), peso_nominal: src.nominal_value };
  });

  if (points.length) {
    payload.controle.pontos_solicitados = points.map((p) => p.nominal_value).filter(Boolean).join(", ");
  }

  return payload;
}

export async function createColetaFromProposalScale(proposal, scale, { userId } = {}) {
  const payload = buildColetaPayloadFromProposalScale(proposal, scale);
  const denorm = denormalizeFromPayload(payload);
  const commercialProposalRef = formatProposalRef(proposal.proposal_number, proposal.proposal_year);

  const { data: collection, error } = await supabase
    .from("scale_calibration_collections")
    .insert({
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
      scale_registration_id: scale.scale_registration_id || null,
      created_by: userId || null,
      updated_by: userId || null,
    })
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
    const withPoints = {
      ...scale,
      calibration_points: scale.calibration_points || [],
    };
    const collection = await createColetaFromProposalScale(proposal, withPoints, { userId });
    created.push({ scale, collection });
  }
  return { created, skipped: (proposal.scales || []).filter((s) => s.collection_id) };
}
