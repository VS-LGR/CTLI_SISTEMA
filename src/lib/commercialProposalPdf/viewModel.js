import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";
import { formatMassDisplay } from "@/lib/massValueUtils";
import {
  calibrationPointsDisplay,
  formatProposalNumber,
} from "@/lib/commercialProposals/commercialProposalSchema";
import { getProposalBoilerplate } from "@/lib/commercialProposals/commercialProposalDocMeta";

function formatMoney(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function adjustLabel(v) {
  if (v === "sim") return "Sim";
  if (v === "nao") return "Não";
  return "—";
}

export function buildCommercialProposalPdfViewModel(proposal, tenant) {
  const snap = proposal.client_snapshot || {};
  const boilerplate = getProposalBoilerplate(tenant);
  const labName = tenant?.name || "Laboratório";

  const scaleRows = (proposal.scales || []).map((s) => {
    const scaleUnit = s.unit || "g";
    return {
      manufacturer: displayValue(s.manufacturer),
      model: displayValue(s.model),
      tag: displayValue(s.tag),
      serial: displayValue(s.serial_number),
      capacity: displayValue(formatMassDisplay(s.capacity, scaleUnit, { fallback: "" }) || s.capacity),
      resolution: displayValue(formatMassDisplay(s.resolution, scaleUnit, { fallback: "" }) || s.resolution),
      points: displayValue(calibrationPointsDisplay(s.calibration_points, scaleUnit)),
      clientPoints: s.client_requested_points === "sim" ? "SIM" : s.client_requested_points === "nao" ? "NÃO" : "—",
      unit_value: formatMoney(s.unit_value),
    };
  });

  const replaceLab = (text) =>
    String(text || "").replace(/laboratório/gi, labName).replace(/RF BALANCAS E AUTOMACAO LTDA/gi, labName);

  return {
    header: {
      title: "PROPOSTA COMERCIAL",
      proposalNumber: formatProposalNumber(proposal.proposal_number, proposal.proposal_year),
      proposalDate: formatDateBr(proposal.proposal_date),
      code: proposal.document_code || "RE-7.1A",
      reference: proposal.document_reference || "PR-7.1",
      revision: proposal.document_revision || "00",
      modelIssueDate: formatDateBr(proposal.document_model_issue_date || "2025-06-30"),
    },
    client: {
      company: displayValue(snap.company),
      address: displayValue(snap.address),
      department: displayValue(snap.department),
      attentionTo: displayValue(snap.attention_to),
      phone: displayValue(snap.phone),
      email: displayValue(snap.email),
    },
    subject: displayValue(proposal.subject),
    introText: boilerplate.intro_text,
    scaleRows,
    totalValue: formatMoney(proposal.total_value),
    mileageNote: boilerplate.mileage_note,
    adjustBefore: adjustLabel(proposal.adjust_before),
    adjustAfter: adjustLabel(proposal.adjust_after),
    notes: displayValue(proposal.notes),
    boilerplate: {
      responsibilities: replaceLab(boilerplate.responsibilities),
      supplyConditions: replaceLab(boilerplate.supply_conditions),
      technicalInfo: replaceLab(boilerplate.technical_info),
      payment: boilerplate.payment,
      workingHours: replaceLab(boilerplate.working_hours),
      validity: boilerplate.validity_days,
    },
    labName,
  };
}
