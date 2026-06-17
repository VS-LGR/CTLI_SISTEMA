import { formatCertificateNumber, certificateTypeLabel } from "@/lib/calibrationCertificates/certificateSchema";
import { formatCalcDisplay } from "@/lib/certificateCalculations";
import { unidadeLabel, TIPO_BALANCA_OPTIONS, TIPO_PLATAFORMA_OPTIONS } from "@/lib/coletaSchema";
import { fmtDmy } from "@/lib/coletaPdf/viewModel";

function labelFromOptions(options, value) {
  return options.find((o) => o.value === value)?.label || value || "";
}

export function buildCertificatePdfViewModel(cert, { documentMeta = null, tenantName = "", preview = false, cancelled = false } = {}) {
  const balance = cert.balance_snapshot || cert.technical_snapshot?.balanceSnapshot || {};
  const client = cert.technical_snapshot?.clientSnapshot || {};
  const meta = documentMeta || cert.document_snapshot || {};

  const activePoints = (cert.points || []).filter(
    (p) => p.nominal_value || p.reading1 || p.reading2 || p.reading3,
  );

  return {
    tenantName,
    preview,
    cancelled,
    certificateType: cert.certificate_type,
    certificateTypeLabel: certificateTypeLabel(cert.certificate_type),
    certificateNumber: formatCertificateNumber(cert.certificate_number, cert.certificate_year),
    revision: cert.certificate_revision || "00",
    replacesNumber: cert.replaces_certificate_id ? "(substitui certificado anterior)" : "",
    header: {
      title: cert.certificate_type === "rbc"
        ? "CERTIFICADO DE CALIBRAÇÃO RBC"
        : "CERTIFICADO DE CALIBRAÇÃO RASTREÁVEL",
      codeLine: `Cód. ${meta.code || meta.documentCode || "RE-7.2B"}  Ref. ${meta.reference || meta.documentReference || "PR-7.2"}  Rev. ${meta.revision || meta.documentRevision || cert.certificate_revision || "00"}`,
    },
    client: {
      name: client.name || cert.client_name || "",
      cnpj: client.cnpj || "",
      address: client.address || cert.calibration_location || "",
      responsible: client.representative_name || "",
    },
    balance: {
      fabricante: balance.fabricante || "",
      modelo: balance.modelo || "",
      serie: balance.serie || cert.scale_serial || "",
      tag: balance.tag || "",
      capacidade: balance.capacidade || "",
      resolucao: balance.resolucao || "",
      unidade: unidadeLabel(balance.unidade),
      tipo: labelFromOptions(TIPO_BALANCA_OPTIONS, balance.tipo_balanca),
      plataforma: labelFromOptions(TIPO_PLATAFORMA_OPTIONS, balance.tipo_plataforma),
      portaria: balance.portaria_inmetro || "",
      etiqueta: balance.etiqueta_ipem || "",
      local: balance.local || cert.calibration_location || "",
    },
    calibrationDate: fmtDmy(cert.calibration_date),
    issueDate: fmtDmy(cert.issue_date),
    proposalRef: cert.commercial_proposal_ref || "",
    environmental: cert.environmental || {},
    standards: (cert.standards || []).map((s) => ({
      type: s.standard_type,
      code: s.identification_code,
      description: s.description,
      certificate: s.certificate_number,
      validUntil: fmtDmy(s.valid_until),
      laboratory: s.laboratory,
    })),
    points: activePoints.map((p) => ({
      label: `P${p.point_number}`,
      nominal: formatCalcDisplay(p.nominal_value, 4),
      average: formatCalcDisplay(p.average_reading, 4),
      error: formatCalcDisplay(p.indication_error, 4),
      repeatability: formatCalcDisplay(p.repeatability, 6),
      expandedUncertainty: formatCalcDisplay(p.expanded_uncertainty, 4),
      k: formatCalcDisplay(p.coverage_factor, 2),
      conformity: p.conformity_result || "",
    })),
    conformity: cert.conformity || {},
    executorName: cert.executor_name || cert.technical_snapshot?.executorSnapshot?.full_name || "",
    signatoryName: cert.signatory_name || cert.technical_snapshot?.signatorySnapshot?.full_name || "",
    approvalDate: fmtDmy(cert.approval_date),
    legalText: cert.certificate_type === "rbc"
      ? "Calibração realizada sob acreditação, conforme escopo autorizado."
      : "Calibração rastreável a padrões nacionais/internacionais — sem símbolo de acreditação.",
  };
}
