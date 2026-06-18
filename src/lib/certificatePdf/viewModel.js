import { formatCertificateNumber, certificateTypeLabel } from "@/lib/calibrationCertificates/certificateSchema";
import { defaultValidityDate } from "@/lib/calibrationCertificates/certificateDateUtils";
import { formatCalcDisplay } from "@/lib/certificateCalculations";
import {
  environmentalAverage,
  environmentalUncertainty,
  ENV_UNCERTAINTY_CONSTANTS,
} from "@/lib/certificateCalculations/environmentalCalculations";
import { unidadeLabel, TIPO_BALANCA_OPTIONS, TIPO_PLATAFORMA_OPTIONS } from "@/lib/coletaSchema";
import { fmtDmy } from "@/lib/coletaPdf/viewModel";
import { getCertificateObservations } from "./legalObservations";

function labelFromOptions(options, value) {
  return options.find((o) => o.value === value)?.label || value || "";
}

function parseNum(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatEnvCell(initial, final, constant, unit) {
  const avg = environmentalAverage(initial, final);
  const unc = environmentalUncertainty(initial, final, constant);
  if (avg == null) return "—";
  const v = formatCalcDisplay(avg, 1);
  const u = unc != null ? ` ± ${formatCalcDisplay(unc, 1)}` : "";
  return `${v}${u} ${unit}`.trim();
}

function withUnit(value, unit, decimals = 4) {
  if (value == null || value === "") return "—";
  const formatted = formatCalcDisplay(value, decimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

function activePoints(cert) {
  return (cert.points || []).filter(
    (p) => p.nominal_value || p.reading1 || p.reading2 || p.reading3 || p.reading_before_adjustment,
  );
}

function resolveClient(cert) {
  const snap = cert.technical_snapshot?.clientSnapshot || {};
  const address = snap.full_address || snap.address || cert.calibration_location || "";
  return {
    name: snap.name || cert.client_name || "",
    cnpj: snap.cnpj || "",
    address,
    city: snap.city || parseCityFromAddress(address),
    state: snap.state || "",
    representative: snap.representative_name || "",
    website: snap.website || "",
  };
}

function parseCityFromAddress(address) {
  const addr = String(address || "").trim();
  if (!addr) return "";
  const parts = addr.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (last.length <= 3) return parts[parts.length - 2] || "";
    return last;
  }
  return "";
}

function formatVeff(veff) {
  if (veff == null || veff === "") return "—";
  const n = Number(veff);
  if (!Number.isFinite(n)) return String(veff);
  if (n >= 1e6 || !Number.isFinite(1 / n)) return "∞";
  return formatCalcDisplay(n, 0);
}

function resolveEnvironmental(cert) {
  const env = cert.environmental || cert.technical_snapshot?.environmentalConditionsSnapshot || {};
  const snap = env.snapshot || {};
  const collPayload = cert.collection_snapshot?.payload || {};
  const ambSnap = collPayload.ambiente || snap || {};

  const tempIni = env.initial_temperature || ambSnap.temp_inicial;
  const tempFin = env.final_temperature || ambSnap.temp_final;
  const humIni = env.initial_humidity || ambSnap.umidade_inicial;
  const humFin = env.final_humidity || ambSnap.umidade_final;
  const pressIni = env.initial_pressure || ambSnap.pressao_inicial;
  const pressFin = env.final_pressure || ambSnap.pressao_final;

  const rep = cert.repeatability_snapshot || collPayload.verso?.repetitividade || {};
  const massaEspecifica = env.air_density
    || ambSnap.massa_especifica
    || rep.massa_especifica_estimada
    || snap.massa_especifica
    || "";

  return {
    initialFinal: {
      temperature: { initial: tempIni || "—", final: tempFin || "—" },
      humidity: { initial: humIni || "—", final: humFin || "—" },
      pressure: { initial: pressIni || "—", final: pressFin || "—" },
    },
    temperature: formatEnvCell(tempIni, tempFin, ENV_UNCERTAINTY_CONSTANTS.temperature, "ºC"),
    humidity: formatEnvCell(humIni, humFin, ENV_UNCERTAINTY_CONSTANTS.humidity, "%"),
    pressure: formatEnvCell(pressIni, pressFin, ENV_UNCERTAINTY_CONSTANTS.pressure, "hPa"),
    airDensity: massaEspecifica ? `${massaEspecifica} kg/m³` : "—",
    balanceAdjusted: env.balance_adjusted || ambSnap.balanca_ajustada || "",
    notes: env.notes || ambSnap.observacoes || "",
    popReference: "",
  };
}

function resolveEccentricity(cert) {
  const ecc = cert.eccentricity_snapshot
    || cert.technical_snapshot?.eccentricitySnapshot
    || {};
  const pontos = (ecc.pontos || []).slice(0, 5).map((pt, i) => ({
    number: i + 1,
    before: pt.antes ?? pt.leitura_antes ?? "",
    after: pt.depois ?? pt.leitura_depois ?? "",
  }));
  const hasData = ecc.valor_aplicado || pontos.some((p) => p.before || p.after);
  return {
    applicable: hasData,
    appliedValue: ecc.valor_aplicado || "",
    points: pontos.length ? pontos : Array.from({ length: 5 }, (_, i) => ({ number: i + 1, before: "", after: "" })),
  };
}

function resolveRepeatability(cert) {
  const rep = cert.repeatability_snapshot || cert.collection_snapshot?.payload?.verso?.repetitividade || {};
  if (rep.aplicavel === false) return { applicable: false, rows: [], observations: "" };

  const linhas = rep.linhas || [];
  const rows = linhas
    .filter((l) => l.leitura1 || l.leitura2 || l.leitura3 || l.valor_nominal)
    .map((l) => ({
      label: l.label || l.key || "",
      nominal: l.valor_nominal || "",
      reading1: l.leitura1 || "",
      reading2: l.leitura2 || "",
      reading3: l.leitura3 || "",
    }));

  if (!rows.length && rep.p1_valor_balanca) {
    rows.push({
      label: "P1",
      nominal: "",
      reading1: rep.p1_valor_balanca,
      reading2: "",
      reading3: "",
    });
  }

  return {
    applicable: rows.length > 0 || rep.aplicavel !== false,
    rows,
    observations: rep.observacoes || "",
  };
}

function conformityDeclaration(cert) {
  const conf = cert.conformity || {};
  if (!conf.legal_metrology_applicable) return "";
  const result = conf.general_conformity_result;
  if (result === "conforme") return "CERTIFICADO: CONFORME";
  if (result === "nao_conforme") return "CERTIFICADO: NÃO CONFORME";
  return "";
}

export function buildCertificatePdfViewModel(cert, {
  documentMeta = null,
  tenantName = "",
  tenant = null,
  preview = false,
  cancelled = false,
} = {}) {
  const balance = cert.balance_snapshot || cert.technical_snapshot?.balanceSnapshot || {};
  const meta = documentMeta || cert.document_snapshot || {};
  const unit = unidadeLabel(balance.unidade);
  const points = activePoints(cert);
  const env = resolveEnvironmental(cert);
  env.popReference = tenant?.pop_calibration_code || "POP-CAL-02";

  const eccentricity = resolveEccentricity(cert);
  const repeatability = resolveRepeatability(cert);
  const validityDate = cert.validity_date || defaultValidityDate(cert.calibration_date);

  const weightStandards = (cert.standards || [])
    .filter((s) => s.standard_type === "peso_padrao" || s.standard_type === "outro")
    .map((s) => ({
      code: s.identification_code,
      description: s.description,
      certificate: s.certificate_number,
      calibrationDate: fmtDmy(s.calibration_date),
      validUntil: fmtDmy(s.valid_until),
      traceability: s.traceability || s.laboratory || "",
    }));

  const instrumentStandards = (cert.standards || [])
    .filter((s) => s.standard_type === "termo_baro_higrometro")
    .map((s) => ({
      code: s.identification_code,
      description: s.description,
      certificate: s.certificate_number,
      calibrationDate: fmtDmy(s.calibration_date),
      validUntil: fmtDmy(s.valid_until),
      traceability: s.traceability || s.laboratory || "",
    }));

  const adjustmentPerformed = (() => {
    const v = String(env.balanceAdjusted || "").trim().toLowerCase();
    if (!v) return null;
    if (v === "sim" || v === "s" || v === "yes") return true;
    if (v === "nao" || v === "não" || v === "n" || v === "nao." || v === "não.") return false;
    return null;
  })();

  return {
    tenantName: tenantName || tenant?.name || "",
    tenantWebsite: tenant?.lab_website || tenant?.website || "",
    lab: {
      name: tenantName || tenant?.name || "",
      address: tenant?.lab_address || "",
      phone: tenant?.lab_phone || "",
      website: tenant?.lab_website || tenant?.website || "",
      ipemNumber: tenant?.ipem_accreditation_number || "",
      cgcreCalNumber: tenant?.cgcre_cal_number || "",
      popCode: tenant?.pop_calibration_code || "POP-CAL-02",
    },
    preview,
    cancelled,
    certificateType: cert.certificate_type,
    certificateTypeLabel: certificateTypeLabel(cert.certificate_type),
    certificateNumber: formatCertificateNumber(cert.certificate_number, cert.certificate_year),
    revision: cert.certificate_revision || meta.revision || meta.documentRevision || "00",
    documentMeta: {
      code: meta.code || meta.documentCode || "RE-7.2B",
      reference: meta.reference || meta.documentReference || "PR-7.2",
      revision: meta.revision || meta.documentRevision || cert.certificate_revision || "00",
      modelIssueDate: meta.modelIssueDate || meta.documentIssueDate || "",
      title: meta.title || meta.documentTitle || "CERTIFICADO DE CALIBRAÇÃO",
    },
    client: resolveClient(cert),
    balance: {
      identificacao: balance.tag || balance.codigo || "",
      fabricante: balance.fabricante || "",
      modelo: balance.modelo || "",
      descricao: balance.descricao || "",
      serie: balance.serie || cert.scale_serial || "",
      tag: balance.tag || "",
      capacidade: balance.capacidade || "",
      capacidade2: balance.capacidade_2 || "",
      capacidade3: balance.capacidade_3 || "",
      resolucao: balance.resolucao || "",
      resolucao2: balance.resolucao_2 || "",
      resolucao3: balance.resolucao_3 || "",
      divisao: balance.divisao_verificacao || "",
      divisao2: balance.divisao_verificacao_2 || "",
      divisao3: balance.divisao_verificacao_3 || "",
      classe: balance.classe || "",
      pontoTrabalho: balance.ponto_trabalho || "",
      unidade: unit,
      tipo: labelFromOptions(TIPO_BALANCA_OPTIONS, balance.tipo_balanca),
      plataforma: labelFromOptions(TIPO_PLATAFORMA_OPTIONS, balance.tipo_plataforma),
      tipoPlataformaValue: balance.tipo_plataforma || "",
      tipoPlataformaLabel: labelFromOptions(TIPO_PLATAFORMA_OPTIONS, balance.tipo_plataforma),
      portaria: balance.portaria_inmetro || "",
      etiqueta: balance.etiqueta_ipem || "",
      local: balance.local || cert.calibration_location || "",
      faixa: balance.capacidade ? `${balance.capacidade} ${unit}`.trim() : "",
    },
    calibrationDate: fmtDmy(cert.calibration_date),
    validityDate: fmtDmy(validityDate),
    issueDate: fmtDmy(cert.issue_date),
    proposalRef: cert.commercial_proposal_ref || "",
    environmental: env,
    weightStandards,
    instrumentStandards,
    standards: weightStandards,
    points: points.map((p) => ({
      label: String(p.point_number),
      referenceValue: withUnit(p.nominal_value, unit, p.display_decimals ?? 4),
      referenceRaw: p.nominal_value,
      beforeAdjustment: {
        l1: withUnit(p.reading_before_adjustment, unit, p.display_decimals ?? 4),
        error: withUnit(p.error_before_adjustment, unit, p.display_decimals ?? 4),
      },
      readings: {
        r1: withUnit(p.reading1, unit, p.display_decimals ?? 4),
        r2: withUnit(p.reading2, unit, p.display_decimals ?? 4),
        r3: withUnit(p.reading3, unit, p.display_decimals ?? 4),
      },
      results: {
        average: withUnit(p.average_reading, unit, p.display_decimals ?? 4),
        indicationError: withUnit(p.indication_error, unit, p.display_decimals ?? 4),
        expandedUncertainty: withUnit(p.expanded_uncertainty, unit, p.display_decimals ?? 4),
        veff: formatVeff(p.degrees_of_freedom),
        k: formatCalcDisplay(p.coverage_factor, 2),
      },
      conformity: p.conformity_result || "",
    })),
    eccentricity,
    repeatability,
    adjustmentPerformed,
    adjustmentNote: adjustmentPerformed === false ? "Não foi realizado o ajuste do equipamento" : "",
    calibratedPointsCount: points.length,
    readingsPerPoint: 3,
    conformity: cert.conformity || {},
    conformityDeclaration: conformityDeclaration(cert),
    executorName: cert.executor_name || cert.technical_snapshot?.executorSnapshot?.full_name || "",
    signatoryName: cert.signatory_name || cert.technical_snapshot?.signatorySnapshot?.full_name || "",
    approvalDate: fmtDmy(cert.approval_date),
    observations: getCertificateObservations(cert.certificate_type),
    unit,
  };
}
